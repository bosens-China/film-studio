import { lutById } from "./luts";
import { analyzePortrait, detectFaces, faceMask } from "./portrait";

export type Grade = { lut: string; strength: number; portrait: boolean };
export const original: Grade = { lut: "", strength: 100, portrait: false };

let queue: Promise<unknown> = Promise.resolve();
const lutCache = new Map<string, Promise<ImageData>>();

export function resolveExportFormat(file: File): {
  mimeType: string;
  ext: string;
  quality?: number;
} {
  const type = file.type.toLowerCase();
  const nameExt = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? "";

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    nameExt === "jpg" ||
    nameExt === "jpeg"
  ) {
    return {
      mimeType: "image/jpeg",
      ext: nameExt === "jpeg" ? "jpeg" : "jpg",
      quality: 0.95,
    };
  }
  if (type === "image/webp" || nameExt === "webp") {
    return { mimeType: "image/webp", ext: "webp", quality: 0.95 };
  }
  if (type === "image/png" || nameExt === "png") {
    return { mimeType: "image/png", ext: "png" };
  }
  return { mimeType: "image/png", ext: "png" };
}

function loadLut(id: string): Promise<ImageData> {
  let result = lutCache.get(id);
  if (!result) {
    result = (async () => {
      const lut = lutById.get(id);
      if (!lut?.url) throw new Error("找不到滤镜文件");
      const response = await fetch(lut.url);
      if (!response.ok) throw new Error("滤镜加载失败");
      const bitmap = await createImageBitmap(await response.blob(), {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      });
      try {
        if (bitmap.width !== 512 || bitmap.height !== 512)
          throw new Error("滤镜格式不受支持");
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("无法读取滤镜");
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, 512, 512);
      } finally {
        bitmap.close();
      }
    })();
    lutCache.set(id, result);
    result.catch(() => lutCache.delete(id));
  }
  return result;
}

function shader(gl: WebGL2RenderingContext, type: number, code: string) {
  const item = gl.createShader(type);
  if (!item) throw new Error("无法创建图像处理器");
  gl.shaderSource(item, code);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS))
    throw new Error("图像处理器初始化失败");
  return item;
}

async function process(
  file: File,
  grade: Grade,
  maxSide?: number,
  preserveFormat = false,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = maxSide
      ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const useLut = !!grade.lut && grade.strength > 0;
    if (!useLut && !grade.portrait) {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法读取图片");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
      const [lut, faces] = await Promise.all([
        useLut ? loadLut(grade.lut) : null,
        grade.portrait ? detectFaces(file) : [],
      ]);
      const gl = canvas.getContext("webgl2", {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      });
      if (!gl) throw new Error("浏览器不支持 WebGL 2，无法应用滤镜");
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      if (canvas.width > max || canvas.height > max)
        throw new Error(`图片尺寸超过设备处理上限 ${max}px`);
      const vertex = shader(
        gl,
        gl.VERTEX_SHADER,
        `#version 300 es
        out vec2 uv;
        void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2)*2.0-1.0;uv=vec2((p.x+1.0)*0.5,(1.0-p.y)*0.5);gl_Position=vec4(p,0,1);}`,
      );
      const fragment = shader(
        gl,
        gl.FRAGMENT_SHADER,
        `#version 300 es
        precision highp float; precision highp sampler3D;
        uniform sampler2D image; uniform sampler2D faceMask; uniform sampler3D lut;
        uniform float strength; uniform float blurLevel; uniform float smoothAmount;
        uniform float gainLocal; uniform float gainGlobal; uniform vec2 texel;
        in vec2 uv; out vec4 outColor;
        float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
        vec3 toYCC(vec3 c){float y=dot(c,vec3(0.299,0.587,0.114));return vec3(y,(c.b-y)*0.564+0.5,(c.r-y)*0.713+0.5);}
        vec3 fromYCC(vec3 v){float cb=v.y-0.5;float cr=v.z-0.5;return vec3(v.x+1.403*cr,v.x-0.344*cb-0.714*cr,v.x+1.773*cb);}
        float skinTone(vec3 y){return (1.0-smoothstep(0.06,0.11,abs(y.y-0.40)))
          *(1.0-smoothstep(0.05,0.09,abs(y.z-0.60)))*smoothstep(0.08,0.2,y.x);}
        void main(){
          vec4 c=texture(image,uv);
          vec3 m=texture(faceMask,uv).rgb;
          if(smoothAmount>0.0&&m.r>0.0){
            float level=blurLevel-1.0;
            vec2 o=texel*exp2(level);
            vec3 soft=(textureLod(image,uv+o,level).rgb+textureLod(image,uv-o,level).rgb
              +textureLod(image,uv+vec2(o.x,-o.y),level).rgb+textureLod(image,uv+vec2(-o.x,o.y),level).rgb)*0.25;
            float even=1.0-smoothstep(0.03,0.10,abs(luma(c.rgb)-luma(soft)));
            // Blemishes resemble edges; release dark or red skin spots from that guard.
            float difference=luma(soft)-luma(c.rgb);
            float spot=max(smoothstep(0.015,0.045,difference),
              smoothstep(0.015,0.05,(c.r-c.g)-(soft.r-soft.g)));
            float edge=1.0-smoothstep(0.10,0.18,abs(difference));
            // shortcut: local contrast can confuse moles with blemishes; use lesion segmentation if samples show that.
            float tone=smoothstep(0.08,0.20,luma(soft));
            c.rgb=mix(c.rgb,soft,max(smoothAmount*even,0.85*spot*edge*tone)*m.r);
          }
          float g=mix(gainGlobal,gainLocal,m.b);
          float l=max(luma(c.rgb),1e-4);
          c.rgb=min(c.rgb*(g/(1.0+l*(g-1.0))),1.0);
          vec3 y=toYCC(c.rgb);
          float skin=skinTone(y)*max(m.r,m.b);
          y.z-=max(y.z-0.585,0.0)*0.35*skin;
          c.rgb=clamp(fromYCC(y),0.0,1.0);
          vec3 coord=c.rgb*(63.0/64.0)+0.5/64.0;
          outColor=vec4(mix(c.rgb,texture(lut,coord).rgb,strength*(1.0-0.4*skin)),c.a);
        }`,
      );
      const program = gl.createProgram();
      if (!program) throw new Error("无法创建图像处理器");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("图像处理器启动失败");
      gl.useProgram(program);
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        bitmap,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      const maskTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (faces.length) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          faceMask(faces, bitmap.width, bitmap.height),
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array(4),
        );
      }
      const lutTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, lutTexture);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      const lutSize = lut ? 64 : 1;
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA8,
        lutSize,
        lutSize,
        lutSize,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        lut ? new Uint8Array(lut.data) : new Uint8Array(4),
      );
      gl.uniform1i(gl.getUniformLocation(program, "image"), 0);
      gl.uniform1i(gl.getUniformLocation(program, "lut"), 1);
      gl.uniform1i(gl.getUniformLocation(program, "faceMask"), 2);
      const portrait = faces.length ? analyzePortrait(bitmap, faces) : null;
      const faceWidth = portrait?.faceWidth ?? 0;
      const smooth = faceWidth
        ? Math.max(0.15, Math.min(0.35, 24 / faceWidth))
        : 0;
      const gain = portrait?.gain ?? 1;
      gl.uniform1f(gl.getUniformLocation(program, "smoothAmount"), smooth);
      gl.uniform1f(
        gl.getUniformLocation(program, "blurLevel"),
        Math.max(2, Math.min(5, Math.log2(Math.max(faceWidth, 2) / 48))),
      );
      gl.uniform2f(
        gl.getUniformLocation(program, "texel"),
        1 / bitmap.width,
        1 / bitmap.height,
      );
      gl.uniform1f(gl.getUniformLocation(program, "gainLocal"), gain);
      gl.uniform1f(
        gl.getUniformLocation(program, "gainGlobal"),
        1 + (gain - 1) * 0.3,
      );
      gl.uniform1f(
        gl.getUniformLocation(program, "strength"),
        useLut ? grade.strength / 100 : 0,
      );
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      gl.deleteTexture(texture);
      gl.deleteTexture(lutTexture);
      gl.deleteTexture(maskTexture);
    }
    const { mimeType, quality } = preserveFormat
      ? resolveExportFormat(file)
      : { mimeType: "image/png", quality: undefined };
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    );
    if (!blob) throw new Error("图片生成失败");
    if (blob.type !== mimeType)
      throw new Error("浏览器不支持以原格式导出此图片");
    canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
    return blob;
  } finally {
    bitmap.close();
  }
}

export function renderImage(
  file: File,
  grade: Grade,
  maxSide?: number,
  preserveFormat = false,
  signal?: AbortSignal,
) {
  const task = queue.then(() => {
    signal?.throwIfAborted();
    return process(file, grade, maxSide, preserveFormat);
  });
  queue = task.catch(() => {});
  return task;
}
