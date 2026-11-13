import { lutById } from "./luts";

export type Grade = { lut: string; strength: number };
export const original: Grade = { lut: "", strength: 100 };

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
    if (!grade.lut || grade.strength === 0) {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法读取图片");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
      const lut = await loadLut(grade.lut);
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
        uniform sampler2D image; uniform sampler3D lut; uniform float strength;
        in vec2 uv; out vec4 outColor;
        void main(){vec4 c=texture(image,uv);vec3 coord=c.rgb*(63.0/64.0)+0.5/64.0;outColor=vec4(mix(c.rgb,texture(lut,coord).rgb,strength),c.a);}`,
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
      const lutTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, lutTexture);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA8,
        64,
        64,
        64,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array(lut.data),
      );
      gl.uniform1i(gl.getUniformLocation(program, "image"), 0);
      gl.uniform1i(gl.getUniformLocation(program, "lut"), 1);
      gl.uniform1f(
        gl.getUniformLocation(program, "strength"),
        grade.strength / 100,
      );
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      gl.deleteTexture(texture);
      gl.deleteTexture(lutTexture);
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
) {
  const task = queue.then(() => process(file, grade, maxSide, preserveFormat));
  queue = task.catch(() => {});
  return task;
}
