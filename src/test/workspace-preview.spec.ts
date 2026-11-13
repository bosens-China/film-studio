import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const photo = "photo-1565362458896-be2a52d2c706.jpg";

test("点击滤镜立即应用，可撤销重做；勾选不改变查看行为", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome"),
  ).toBeVisible();
  await page.getByLabel(`选择 ${photo}`).uncheck();
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome").first(),
  ).toBeVisible();
  await page.getByLabel(`选择 ${photo}`).check();
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  await expect(page).toHaveURL(/\/photos\//);
  await expect(page.getByLabel(`选择 ${photo}`)).toBeChecked();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toContainText("经典正片 · Classic Chrome");
  await page.getByRole("button", { name: /鲜艳 · Velvia/ }).click();
  await page.goBack();
  await expect(page.locator("main").getByText("鲜艳 · Velvia")).toBeVisible();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toContainText("鲜艳 · Velvia");

  await page.keyboard.press("ControlOrMeta+z");
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome"),
  ).toBeVisible();
  await page.getByRole("button", { name: "撤销" }).click();
  await expect(
    page.locator("main").getByText("原图", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "撤销" })).toBeDisabled();
  await page.getByRole("button", { name: "重做" }).click();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.locator("main").getByText("鲜艳 · Velvia")).toBeVisible();
  await expect(page.getByRole("button", { name: "重做" })).toBeDisabled();
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
    page.getByRole("button", { name: "Portrait1", exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("搜索滤镜名称").fill("Portrait2");
  await expect(page.getByRole("button", { name: /Portrait2/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Portrait1", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("适用场景").click();
  await page.getByRole("option", { name: "风景", exact: true }).click();
  await expect(
    page.getByText("没有符合条件的滤镜，请调整场景、分类或搜索词。"),
  ).toBeVisible();
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
  await page.getByLabel(`选择 ${photo}`).uncheck();
  await page.getByLabel("选择 photo-1548403374-728475ca2813.jpg").check();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toHaveText("无滤镜");
});

test("单图检视下修改效果后自动切到左右对比，原图卡片保持不变", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  const single = page.getByRole("button", { name: "单图检视" });
  const side = page.getByRole("button", { name: "左右对比" });
  await expect(single).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "无滤镜", exact: true }).click();
  await expect(single).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await expect(side).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "原图 预览", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", {
      name: "经典正片 · Classic Chrome 预览",
      exact: true,
    }),
  ).toBeVisible();

  await single.click();
  await page.getByRole("button", { name: /鲜艳 · Velvia/ }).click();
  await expect(side).toHaveAttribute("aria-pressed", "true");
});

test("重复滤镜时只替换当前采用的网格槽位", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("film-emulator-sample-images", photo));
  await page.getByRole("button", { name: `查看 ${photo}` }).click();
  await page.getByRole("button", { name: "2 × 2 网格" }).click();
  await page.getByLabel("第 2 个对比滤镜").click();
  await page
    .getByRole("option", { name: "经典正片 · Classic Chrome", exact: true })
    .click();

  const duplicates = page.getByRole("button", {
    name: "采用 经典正片 · Classic Chrome",
    exact: true,
  });
  await duplicates.nth(1).click();
  await expect(duplicates.first()).toHaveAttribute("aria-pressed", "false");
  await expect(duplicates.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: /标准 · Provia/ })
    .last()
    .click();
  await expect(page.getByLabel("第 1 个对比滤镜")).toContainText(
    "经典正片 · Classic Chrome",
  );
  await expect(page.getByLabel("第 2 个对比滤镜")).toContainText(
    "标准 · Provia",
  );
});
