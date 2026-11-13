import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const first = "photo-1565362458896-be2a52d2c706.jpg";

test("四宫格导出当前照片和独立滤镜 ZIP，保留 JPEG 与原始尺寸", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", first));
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  await page.getByRole("button", { name: "2 × 2 网格" }).click();
  await page
    .getByRole("button", { name: "采用 人像 400 · Portrait 400" })
    .click();

  const oneDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前照片" }).click();
  const one = await oneDownload;
  expect(one.suggestedFilename()).toBe(first.replace(".jpg", "-滤镜.jpg"));
  const current = await readFile(await one.path());
  expect(current.subarray(0, 3).toString("hex")).toBe("ffd8ff");

  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "更多导出方式" }).click();
  await page
    .getByRole("menuitem", { name: "导出全部对比滤镜（ZIP · 3 张）" })
    .click();
  const download = await zipDownload;
  expect(download.suggestedFilename()).toBe("滤镜对比.zip");
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const names = Object.keys(zip.files);
  expect(names).toHaveLength(3);
  expect(names.map((name) => name.match(/槽位\d/)?.[0])).toEqual([
    "槽位1",
    "槽位2",
    "槽位3",
  ]);
  const images = await Promise.all(
    names.map((name) => zip.file(name)!.async("nodebuffer")),
  );
  for (const image of images)
    expect(image.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  expect(images[1]).toEqual(current);
  expect(images[0]).not.toEqual(images[1]);
  const dimensions = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, current.toString("base64"));
  expect(dimensions).toEqual([1206, 772]);
});
