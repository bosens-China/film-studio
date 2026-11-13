import sample1Url from "../../film-emulator-sample-images/photo-1565362458896-be2a52d2c706.jpg?url";
import sample2Url from "../../film-emulator-sample-images/photo-1548403374-728475ca2813.jpg?url";
import sample3Url from "../../film-emulator-sample-images/photo-1587974136444-493b758688b8.jpg?url";
import sample4Url from "../../film-emulator-sample-images/2026-10-11_12.08.51_雾言Misty_好喜欢富士拍的通透皮肤！直出附参数.jpeg?url";

export type SamplePhotoMeta = {
  id: string;
  title: string;
  filename: string;
  category: string;
  url: string;
  defaultLut: string;
};

export const samplePhotos: SamplePhotoMeta[] = [
  {
    id: "sample-portrait",
    title: "富士通透人像",
    filename: "富士通透人像-Misty.jpeg",
    category: "人像特写",
    url: sample4Url,
    defaultLut: "Fuji Series/Classic Neg.png",
  },
  {
    id: "sample-street",
    title: "街头光影",
    filename: "photo-1565362458896-be2a52d2c706.jpg",
    category: "街头纪实",
    url: sample1Url,
    defaultLut: "Fuji Series/Classic Chrome.png",
  },
  {
    id: "sample-nature",
    title: "静谧日常",
    filename: "photo-1548403374-728475ca2813.jpg",
    category: "自然光景",
    url: sample2Url,
    defaultLut: "Negative New/Portrait 400.png",
  },
  {
    id: "sample-vintage",
    title: "公路漫游",
    filename: "photo-1587974136444-493b758688b8.jpg",
    category: "复古胶片",
    url: sample3Url,
    defaultLut: "Fuji Series/Velvia.png",
  },
];

export async function fetchSampleFile(sample: SamplePhotoMeta): Promise<File> {
  const response = await fetch(sample.url);
  if (!response.ok) throw new Error(`示例图片加载失败: ${sample.title}`);
  const blob = await response.blob();
  return new File([blob], sample.filename, { type: blob.type || "image/jpeg" });
}
