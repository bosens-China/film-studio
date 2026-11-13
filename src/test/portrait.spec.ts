import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const name =
  "2026-10-11_12.08.51_雾言Misty_好喜欢富士拍的通透皮肤！直出附参数.jpeg";
const landscape = "photo-1565362458896-be2a52d2c706.jpg";

test("人像样片识别到脸并应用滤镜导出", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", name));
  await expect(page.getByText("1 张照片", { exact: true })).toBeVisible();

  const preview = page
    .getByRole("button", { name: `查看 ${name}` })
    .locator("img");
  await page.getByLabel(`选择 ${name}`).check();
  const before = await preview.getAttribute("src");
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await expect.poll(() => preview.getAttribute("src")).not.toBe(before);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出所选 (1)" }).click();
  expect((await download).suggestedFilename()).toContain("-滤镜.jpeg");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("检测到人脸自动开启人像优化，可单独关闭并撤销", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles([
      resolve("film-emulator-sample-images", name),
      resolve("film-emulator-sample-images", landscape),
    ]);
  await page.getByRole("button", { name: `查看 ${name}` }).click();
  const toggle = page.getByRole("switch", { name: "人像优化" });
  await expect(toggle).toBeChecked({ timeout: 30000 });
  await expect(page.getByText(/检测到 \d+ 张人脸 · 已自动开启/)).toBeVisible();
  await expect(
    page.locator("main").getByText("人像", { exact: true }),
  ).toBeVisible();

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText(/已自动开启/)).toBeHidden();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(toggle).toBeChecked();

  await page.getByRole("button", { name: `查看 ${landscape}` }).click();
  await expect(page.getByText("未检测到人脸")).toBeVisible({ timeout: 30000 });
  await expect(toggle).toBeDisabled();
});

test("撤销滤镜不覆盖随后完成的自动人像优化", async ({ page }) => {
  test.setTimeout(60000);
  let releaseModel!: () => void;
  const modelReady = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  await page.route("**/mediapipe/face_landmarker.task", async (route) => {
    await modelReady;
    await route.continue();
  });
  await page.goto("/");
  try {
    await page
      .locator("input[type=file]")
      .setInputFiles(resolve("film-emulator-sample-images", name));
    await page.getByLabel(`选择 ${name}`).check();
    await page
      .getByRole("button", { name: /经典正片 · Classic Chrome/ })
      .click();
  } finally {
    releaseModel();
  }
  const toggle = page.getByRole("switch", { name: "人像优化" });
  await expect(toggle).toBeChecked({ timeout: 30000 });
  await page.keyboard.press("ControlOrMeta+z");
  await expect(toggle).toBeChecked();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toHaveText("无滤镜");
});
