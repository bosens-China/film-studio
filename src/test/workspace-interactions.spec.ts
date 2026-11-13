import { expect, test } from "@playwright/test";

const first = "photo-1565362458896-be2a52d2c706.jpg";

test("隐藏滤镜面板保留搜索，重新打开弹窗重置缩放", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  await page.getByLabel(`选择 ${first}`).check();
  await page.getByPlaceholder("搜索滤镜名称").fill("Classic Chrome");
  await page.getByLabel(`选择 ${first}`).uncheck();
  await page.getByLabel(`选择 ${first}`).check();
  await expect(page.getByPlaceholder("搜索滤镜名称")).toHaveValue(
    "Classic Chrome",
  );
  await page.getByRole("button", { name: "取消选择" }).click();
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  await page.getByRole("button", { name: "弹窗放大", exact: true }).click();
  await page.getByRole("button", { name: "放大", exact: true }).click();
  await expect(page.getByRole("slider", { name: "弹窗缩放" })).toHaveAttribute(
    "aria-valuenow",
    "1.25",
  );
  await page.getByRole("button", { name: "关闭放大预览" }).click();
  await page.getByRole("button", { name: "弹窗放大", exact: true }).click();
  await expect(page.getByRole("slider", { name: "弹窗缩放" })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
});

test("拖动图库照片到分组后保留照片", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  await page.getByRole("button", { name: "新建分组" }).click();
  await page.getByLabel("分组名称").fill("旅行");
  await page.getByRole("button", { name: "确认创建分组" }).click();
  await page.getByRole("button", { name: /全部照片/ }).click();
  await page
    .getByLabel(`照片 ${first} 的操作菜单`)
    .dragTo(page.getByLabel("分组 旅行 的操作菜单"));
  await page.getByRole("button", { name: "旅行", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `查看 ${first}` }),
  ).toBeVisible();
  await expect(page.getByText(/1 张照片 ·/)).toBeVisible();
});

test("桌面对比工具栏不遮挡且照片勾选有足够操作区域", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  const checkbox = page.getByLabel(`选择 ${first}`);
  const target = await checkbox.locator("..").boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(24);
  expect(target!.height).toBeGreaterThanOrEqual(24);
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    const back = (await page
      .getByRole("button", { name: "返回照片列表" })
      .boundingBox())!;
    const single = (await page
      .getByRole("button", { name: "单图检视" })
      .boundingBox())!;
    expect(
      back.y + back.height <= single.y ||
        single.y + single.height <= back.y ||
        back.x + back.width <= single.x ||
        single.x + single.width <= back.x,
    ).toBe(true);
    await page.getByRole("button", { name: "单图检视" }).click();
    await expect(
      page.getByRole("slider", { name: "当前照片缩放" }),
    ).toBeVisible();
  }
});

test("移除照片时同步更新图库、选中数量与导出范围", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  await page.getByLabel(`选择 ${first}`).check();
  await page.getByRole("button", { name: "导出所选 (1)" }).waitFor();
  await page.getByLabel(`照片 ${first} 的操作菜单`).click({ button: "right" });
  await page.getByRole("menuitem", { name: "移除照片" }).click();
  await expect(page.getByRole("button", { name: `查看 ${first}` })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "导出所选 (0)" }),
  ).toBeDisabled();
  await expect(page.getByText(/3 张照片 ·/)).toBeVisible();
  await expect(page.getByText("滤镜与调整")).toBeHidden();
});
