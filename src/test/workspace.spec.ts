import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const first = "photo-1565362458896-be2a52d2c706.jpg";
const second = "photo-1548403374-728475ca2813.jpg";
const photoPath = (name: string) =>
  resolve("film-emulator-sample-images", name);

test("导入、分组、滤镜对比和批量导出", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles([photoPath(first), photoPath(second)]);
  await expect(
    page.getByText("2 张照片 · 选择照片，探索属于你的色彩"),
  ).toBeVisible();
  await expect(page.getByText("滤镜与调整")).toBeHidden();
  const preview = page
    .getByRole("button", { name: `查看 ${first}` })
    .locator("img");
  await expect(preview).toBeVisible();
  await preview.evaluate((image: HTMLImageElement) => image.decode());
  const before = await preview.getAttribute("src");
  const originalPixels = await preview.evaluate((image: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 20, 20);
    return Array.from(ctx.getImageData(0, 0, 20, 20).data);
  });
  await page.getByLabel(`选择 ${first}`).check();
  await expect(page.getByText("滤镜与调整")).toBeVisible();
  await page.getByPlaceholder("搜索滤镜名称").fill("经典正片");
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await page.getByPlaceholder("搜索滤镜名称").fill("");
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  await expect(
    page.locator("main").getByText("经典正片 · Classic Chrome"),
  ).toBeVisible();
  await expect.poll(() => preview.getAttribute("src")).not.toBe(before);
  await preview.evaluate((image: HTMLImageElement) => image.decode());
  const filteredPixels = await preview.evaluate((image: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 20, 20);
    return Array.from(ctx.getImageData(0, 0, 20, 20).data);
  });
  expect(filteredPixels).not.toEqual(originalPixels);
  await expect(
    page.locator("main").getByText("原图", { exact: true }).first(),
  ).toBeVisible();

  // Viewing a photo does not change the existing selection.
  await page.getByRole("button", { name: `查看 ${second}` }).click();
  await expect(page).toHaveURL(/\/photos\//);
  await expect(page.getByLabel(`选择 ${first}`)).toBeChecked();
  await expect(page.getByLabel(`选择 ${second}`)).not.toBeChecked();
  await page.getByRole("button", { name: "返回照片列表" }).click();
  await page.getByRole("button", { name: "取消选择" }).click();
  await expect(page.getByText("滤镜与调整")).toBeHidden();
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  await expect(page.getByRole("button", { name: "左右对比" })).toBeVisible();
  await page.getByRole("button", { name: "左右对比" }).click();
  await expect(page.getByText("原图", { exact: true }).first()).toBeVisible();

  // Requirement 7: In detail view, only "应用到当前照片" is shown when nothing is checked; appears when checked in filmstrip
  await expect(
    page.getByRole("button", { name: "应用到当前照片" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /应用到选中照片/ }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: /应用到全部照片/ }),
  ).toBeHidden();
  await page.getByLabel(`选择 ${second}`).check();
  await expect(
    page.getByRole("button", { name: "应用到选中照片 (1)" }),
  ).toBeVisible();
  await page.getByLabel(`选择 ${second}`).uncheck();
  await expect(
    page.getByRole("button", { name: /应用到选中照片/ }),
  ).toBeHidden();

  // 卡片拖动和局部缩放互不影响；header 缩放叠加到全部卡片。
  const originalCard = page.getByRole("button", {
    name: "激活 原图 视图",
    exact: true,
  });
  const compareCard = page.getByRole("button", {
    name: "激活 经典正片 · Classic Chrome 视图",
    exact: true,
  });
  const box = (await compareCard.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 45,
    box.y + box.height / 2 + 25,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: "放大查看照片" })).toBeHidden();
  await expect(compareCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1, 0, 0, 1, 45, 25\)/,
  );
  await expect(originalCard.locator("img")).toHaveCSS("transform", "none");

  const zoomSlider = page.getByRole("slider", { name: "效果卡片缩放" });
  await zoomSlider.focus();
  await zoomSlider.press("ArrowRight");
  await zoomSlider.press("ArrowRight");
  await expect(compareCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.2, 0, 0, 1\.2, 45, 25\)/,
  );
  await expect(originalCard.locator("img")).toHaveCSS("transform", "none");

  const globalZoom = page.getByRole("slider", { name: "全部卡片缩放" });
  await globalZoom.focus();
  await globalZoom.press("ArrowRight");
  await globalZoom.press("ArrowRight");
  await expect(originalCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.2, 0, 0, 1\.2, 0, 0\)/,
  );
  await expect(compareCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.44, 0, 0, 1\.44, 45, 25\)/,
  );

  await originalCard.click();
  await expect(page.getByRole("dialog", { name: "放大查看照片" })).toBeHidden();
  await compareCard.click();
  await page.getByRole("button", { name: "重置效果卡片视图" }).click();
  await expect(compareCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.2, 0, 0, 1\.2, 0, 0\)/,
  );
  await expect(originalCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.2, 0, 0, 1\.2, 0, 0\)/,
  );
  await page.getByRole("button", { name: "重置全部视图" }).click();
  await expect(originalCard.locator("img")).toHaveCSS("transform", "none");
  await expect(compareCard.locator("img")).toHaveCSS("transform", "none");
  await expect(page.getByRole("button", { name: "重置全部视图" })).toBeHidden();

  // Clicking the zoom icon opens the lightbox modal
  await page
    .getByRole("button", { name: "弹窗放大查看 经典正片 · Classic Chrome" })
    .click();
  const dialog = page.getByRole("dialog", { name: "放大查看照片" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("弹窗滤镜切换")).toContainText(
    "经典正片 · Classic Chrome",
  );
  await page.getByRole("button", { name: "关闭放大预览" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "2 × 2 网格" }).click();
  await expect(page.getByLabel("第 1 个对比滤镜")).toContainText(
    "经典正片 · Classic Chrome",
  );
  await expect(page.getByLabel("第 2 个对比滤镜")).toContainText(
    "人像 400 · Portrait 400",
  );
  await page.getByRole("button", { name: "选择 鲜艳 · Velvia 滤镜" }).click();
  await page.getByRole("button", { name: "左右对比" }).click();
  await expect(
    page.locator("main").getByText("鲜艳 · Velvia", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新建分组" }).click();
  await page.getByLabel("分组名称").fill("旅行");
  await page.getByRole("button", { name: "确认创建分组" }).click();
  await page.getByRole("button", { name: "返回照片列表" }).click();
  await page.getByRole("button", { name: /全部照片/ }).click();
  await page.getByLabel(`选择 ${first}`).check();
  await page.getByLabel("移动到分组").click();
  await page.getByRole("option", { name: "旅行" }).click();
  await page.getByRole("button", { name: "旅行", exact: true }).click();
  await expect(page.getByText(/1 张照片 ·/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "应用到当前分组 (1)" }),
  ).toBeVisible();
  await page.getByLabel("分组 旅行 的操作菜单").click({ button: "right" });
  await page.getByRole("menuitem", { name: "删除分组" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "删除分组“旅行”？" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "取消" }).click();
  await page.getByLabel("分组 旅行 的操作菜单").click({ button: "right" });
  await page.getByRole("menuitem", { name: "删除分组" }).click();
  await deleteDialog.getByRole("button", { name: "删除分组" }).click();
  await expect(page.getByText(/2 张照片 ·/)).toBeVisible();
  await page.getByLabel(`选择 ${second}`).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出所选 (2)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("滤镜照片.zip");
  const path = await download.path();
  const zip = await JSZip.loadAsync(await readFile(path));
  expect(Object.keys(zip.files)).toEqual([`001-${first}`, `002-${second}`]);
  const jpg = await zip.file(`001-${first}`)!.async("nodebuffer");
  expect(jpg.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  const dims = await page.evaluate(async (base64: string) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, jpg.toString("base64"));
  expect(dims).toEqual([1206, 772]);
});

test("网格强度采用当前槽位，整体与单独缩放在各视图正确叠加", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles([photoPath(first), photoPath(second)]);
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  await page.getByRole("button", { name: "2 × 2 网格" }).click();
  await page.getByRole("button", { name: "选择 鲜艳 · Velvia 滤镜" }).click();
  await page.getByLabel("第 2 个对比滤镜").focus();
  await expect(
    page.locator("aside").last().locator(".filter-active"),
  ).toContainText("人像 400 · Portrait 400");
  const strength = page.getByRole("slider", { name: "滤镜强度" });
  await strength.focus();
  await strength.press("ArrowLeft");
  await page.getByRole("button", { name: "左右对比" }).click();
  await expect(
    page.locator("main").getByText("人像 400 · Portrait 400", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "2 × 2 网格" }).click();
  const globalZoom = page.getByRole("slider", { name: "全部卡片缩放" });
  await globalZoom.focus();
  await globalZoom.press("ArrowRight");
  const gridCards = [
    page.getByRole("button", { name: "激活 原图 视图", exact: true }),
    page.getByRole("button", {
      name: "选择 经典正片 · Classic Chrome 滤镜",
      exact: true,
    }),
    page.getByRole("button", {
      name: "选择 人像 400 · Portrait 400 滤镜",
      exact: true,
    }),
    page.getByRole("button", { name: "选择 鲜艳 · Velvia 滤镜", exact: true }),
  ];
  for (const card of gridCards) {
    await expect(card.locator("img")).toHaveCSS(
      "transform",
      /matrix\(1\.1, 0, 0, 1\.1, 0, 0\)/,
    );
  }
  const cardZoom = page.getByRole("slider", { name: "对比卡片 2缩放" });
  await cardZoom.focus();
  await cardZoom.press("ArrowRight");
  await expect(gridCards[2].locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.21, 0, 0, 1\.21, 0, 0\)/,
  );
  await expect(gridCards[0].locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.1, 0, 0, 1\.1, 0, 0\)/,
  );

  await page.getByRole("button", { name: "单图检视" }).click();
  const singleCard = page.getByRole("button", {
    name: "激活 人像 400 · Portrait 400 视图",
    exact: true,
  });
  await expect(singleCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.1, 0, 0, 1\.1, 0, 0\)/,
  );
  const singleZoom = page.getByRole("slider", { name: "当前照片缩放" });
  await singleZoom.focus();
  await singleZoom.press("ArrowRight");
  await expect(singleCard.locator("img")).toHaveCSS(
    "transform",
    /matrix\(1\.21, 0, 0, 1\.21, 0, 0\)/,
  );
  await page.getByRole("button", { name: `查看 ${second}` }).click();
  await expect(globalZoom).toHaveAttribute("aria-valuenow", "1");
  await expect(singleZoom).toHaveAttribute("aria-valuenow", "1");
  await expect(
    page
      .getByRole("button", { name: "激活 原图 视图", exact: true })
      .locator("img"),
  ).toHaveCSS("transform", "none");
});

test("分组详情内切换照片后返回原分组", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  await page.getByRole("button", { name: "胶片样张", exact: true }).click();
  const groupUrl = page.url();
  await page
    .getByRole("button", { name: `查看 ${first}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `查看 ${second}`, exact: true })
    .click();
  await page.getByRole("button", { name: "返回照片列表", exact: true }).click();
  await expect(page).toHaveURL(groupUrl);
  await expect(
    page.getByText("4 张照片 · 选择照片，探索属于你的色彩"),
  ).toBeVisible();
});

test("放大弹窗限制焦点、支持滤镜菜单并恢复打开按钮的焦点", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(photoPath(first));
  await page.getByRole("button", { name: `查看 ${first}` }).click();
  const opener = page.getByRole("button", { name: "弹窗放大", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "放大查看照片" });
  const filter = dialog.getByLabel("弹窗滤镜切换");
  const close = dialog.getByRole("button", { name: "关闭放大预览" });
  await expect(filter).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(filter).toBeFocused();
  await filter.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page
    .getByRole("option", { name: "鲜艳 · Velvia", exact: true })
    .click();
  await expect(filter).toContainText("鲜艳 · Velvia");
  await expect(page.getByRole("listbox")).toBeHidden();
  await filter.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(filter).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("修改后刷新会提示，取消后保留照片", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(photoPath(first));
  await page.getByLabel(`选择 ${first}`).check();
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  const dialogPromise = page.waitForEvent("dialog");
  void page.reload().catch(() => {});
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(
    page.getByRole("button", { name: `查看 ${first}` }),
  ).toBeVisible();
  const secondDialog = page.waitForEvent("dialog");
  const confirmedReload = page.reload();
  await (await secondDialog).accept();
  await confirmedReload;
  await expect(page.getByText("从照片开始，发现不一样的色彩")).toBeVisible();
});

test("路由、菜单和导出作用范围", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles([photoPath(first), photoPath(second)]);
  await expect(
    page.getByRole("button", { name: "导出所选 (0)" }),
  ).toBeDisabled();
  await page.getByLabel(`选择 ${second}`).check();
  await page
    .getByRole("button", { name: `查看 ${first}` })
    .click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "查看照片" })).toBeVisible();
  await page.getByRole("menuitem", { name: "查看照片" }).click();
  await expect(page).toHaveURL(/\/photos\//);
  await expect(
    page.getByRole("button", { name: "导出当前视图" }),
  ).toBeEnabled();
  await expect(page.getByText("滤镜与调整")).toBeVisible();
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前视图" }).click();
  const currentDownload = await downloadPromise;
  expect(currentDownload.suggestedFilename()).toBe(
    first.replace(".jpg", "-滤镜.jpg"),
  );
  const [source, output] = await Promise.all([
    readFile(photoPath(first)),
    readFile(await currentDownload.path()),
  ]);
  expect(output.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  const changed = await page.evaluate(
    async ({ source, output }) => {
      async function pixels(data: string, type: string) {
        const image = new Image();
        image.src = `data:${type};base64,${data}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0, 20, 20);
        return Array.from(ctx.getImageData(0, 0, 20, 20).data);
      }
      const [a, b] = await Promise.all([
        pixels(source, "image/jpeg"),
        pixels(output, "image/jpeg"),
      ]);
      return a.some((value, i) => value !== b[i]);
    },
    { source: source.toString("base64"), output: output.toString("base64") },
  );
  expect(changed).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel(`选择 ${second}`)).toBeChecked();
  await page.getByLabel(`选择 ${second}`).uncheck();
  await expect(page.getByText("滤镜与调整")).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL(/\/photos\//);
  await expect(
    page.getByRole("button", { name: "导出当前视图" }),
  ).toBeVisible();
});

test("失效的详情或分组地址以及未识别路径直接跳转到 404 页面", async ({
  page,
}) => {
  await page.goto("/photos/no-such-photo");
  await expect(page).toHaveURL("/404");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText("页面不存在或会话数据已清空")).toBeVisible();
  await page.getByRole("button", { name: "返回首页" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/groups/no-such-group");
  await expect(page).toHaveURL("/404");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

  await page.goto("/unknown-route-check");
  await expect(page).toHaveURL("/404");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});

test("键盘可打开照片右键菜单并执行操作", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(photoPath(first));
  const target = page.getByLabel(`照片 ${first} 的操作菜单`);
  await target.focus();
  await target.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "选择照片" })).toBeVisible();
  await page.getByRole("menuitem", { name: "选择照片" }).click();
  await expect(page.getByLabel(`选择 ${first}`)).toBeChecked();
});

test("切换滤镜时在对应照片显示处理状态", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(photoPath(first));
  const preview = page.getByRole("button", { name: `查看 ${first}` });
  await expect(preview.locator("img")).toBeVisible();
  await page.getByLabel(`选择 ${first}`).check();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/film-emulator-luts/**/*.png*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole("button", { name: /经典正片 · Classic Chrome/ }).click();
  await page.getByRole("button", { name: "应用到选中照片 (1)" }).click();
  try {
    await expect(preview.getByRole("status")).toHaveText("正在处理…");
  } finally {
    release();
  }
  await expect(preview.getByRole("status")).toBeHidden();
});

test("内置示例样片载入、全部滤镜分类与分组应用及刷新跳转 404", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("没有手头照片？试试内置胶片样张")).toBeVisible();
  await page.getByRole("button", { name: "一键载入全部 4 张示例样张" }).click();
  await expect(
    page.getByText("4 张照片 · 选择照片，探索属于你的色彩"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "追加示例样片" })).toBeHidden();
  await expect(page.getByText("滤镜与调整")).toBeHidden();
  await page.getByRole("button", { name: "胶片样张", exact: true }).click();
  await expect(page).toHaveURL(/\/groups\//);
  // Filter panel stays hidden until at least 1 photo is checked
  await expect(page.getByText("滤镜与调整")).toBeHidden();
  await page.getByLabel("全选当前分组").check();
  await expect(page.getByText("滤镜与调整")).toBeVisible();
  await expect(page.getByLabel("滤镜分类")).toContainText("全部类别");
  await page.getByRole("button", { name: /鲜艳 · Velvia/ }).click();
  await page.getByRole("button", { name: "应用到当前分组 (4)" }).click();
  await expect(
    page.locator("main").getByText("鲜艳 · Velvia").first(),
  ).toBeVisible();

  // Refreshing while inside a session-only group redirects directly to 404
  const reloadDialog = page.waitForEvent("dialog");
  const reloaded = page.reload();
  await (await reloadDialog).accept();
  await reloaded;
  await expect(page).toHaveURL("/404");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
