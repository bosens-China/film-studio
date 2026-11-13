import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

const photo = "photo-1565362458896-be2a52d2c706.jpg";

test("滤镜只预览，应用后才改变照片；勾选不改变查看行为", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await expect(page.getByText("预览未应用")).toBeVisible();
  await expect(
    page.getByText("预览 · 经典正片 · Classic Chrome"),
  ).toBeVisible();
  await page.getByLabel(`选择 ${photo}`).uncheck();
  await expect(
    page.locator("main").getByText("原图", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  await expect(page).toHaveURL(/\/photos\//);
  await expect(page.getByLabel(`选择 ${photo}`)).toBeChecked();
  await expect(page.getByText("预览未应用")).toBeVisible();
  await page.getByRole("button", { name: /鲜艳 · Velvia/ }).click();
  await page.goBack();
  await expect(
    page.getByText("预览 · 经典正片 · Classic Chrome"),
  ).toBeVisible();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toContainText("经典正片 · Classic Chrome");
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  await expect(page.getByText("预览未应用")).toBeHidden();
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome"),
  ).toBeVisible();
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  await expect(page.getByText("已应用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /鲜艳 · Velvia/ }).click();
  await expect(page.getByText("预览未应用")).toBeVisible();
  await page.getByRole("button", { name: "返回照片列表" }).click();
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome"),
  ).toBeVisible();
});

test("场景、类别和名称可组合筛选", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByLabel("适用场景").click();
  await page.getByRole("option", { name: "人像", exact: true }).click();
  await page.getByLabel("滤镜分类").click();
  await page.getByRole("option", { name: "ON1 人像", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "LUT Portrait1", exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("搜索滤镜名称").fill("Portrait2");
  await expect(page.getByRole("button", { name: /Portrait2/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "LUT Portrait1", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("适用场景").click();
  await page.getByRole("option", { name: "风景", exact: true }).click();
  await expect(
    page.getByText("没有符合条件的滤镜，请调整场景、分类或搜索词。"),
  ).toBeVisible();
});

test("未应用的批量预览不改变导出，应用后才导出滤镜效果", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByLabel(`选择 ${photo}`).check();
  const originalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出所选 (1)" }).click();
  const original = await readFile(await (await originalDownload).path());
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出所选 (1)" }).click();
  const pending = await readFile(await (await pendingDownload).path());
  expect(pending).toEqual(original);
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  const appliedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出所选 (1)" }).click();
  const applied = await readFile(await (await appliedDownload).path());
  expect(applied).not.toEqual(original);
});

test("卡片缩放控件键盘聚焦时可见", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  const slider = page.getByRole("slider", { name: "当前照片缩放" });
  await slider.focus();
  await expect(slider).toBeFocused();
  await expect(
    slider.locator(
      'xpath=ancestor::div[contains(@class, "focus-within:opacity-100")]',
    ),
  ).toHaveCSS("opacity", "1");
});

test("更换选中照片后，面板参数取新选择的已应用效果", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles([
      resolve("film-emulator-sample-images", photo),
      resolve(
        "film-emulator-sample-images",
        "photo-1548403374-728475ca2813.jpg",
      ),
    ]);
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  await page.getByLabel(`选择 ${photo}`).uncheck();
  await page.getByLabel("选择 photo-1548403374-728475ca2813.jpg").check();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toHaveText("原图");
  await expect(page.getByText("显示已应用效果")).toBeVisible();
});
