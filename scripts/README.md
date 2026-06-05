# export-pdf 调试说明

本文档说明 `package.json` 中两个 PDF 导出命令的用途和调试方法：

```json
"pdf:single": "bun scripts/export-pdf.js --list scripts/pdf-repo-test.txt --out-dir pdf-repo-single --concurrency 1",
"pdf:all": "bun scripts/export-pdf.js --out-dir pdf-repo --concurrency 4"
```

## 前置条件

运行 PDF 导出前，需要先生成 VitePress 静态产物：

```bash
bun run docs:build
```

`scripts/export-pdf.js` 会读取 `.vitepress/dist` 下的 HTML 文件，并启动一个本地 HTTP 服务给 Playwright Chromium 访问。它不是直接读取 Markdown 文件，也不是通过 `file://` 打开页面。

## pdf:single

```bash
bun run pdf:single
```

等价于：

```bash
bun scripts/export-pdf.js --list scripts/pdf-repo-test.txt --out-dir pdf-repo-single --concurrency 1
```

用途：只导出 `scripts/pdf-repo-test.txt` 中列出的页面，适合调试单页或少量页面的 PDF 样式、字体、表格换行、页脚页码等问题。

参数说明：

- `--list scripts/pdf-repo-test.txt`：指定要导出的 HTML 页面列表，每行一个相对 `.vitepress/dist` 的 HTML 路径。
- `--out-dir pdf-repo-single`：PDF 输出到项目根目录下的 `pdf-repo-single`。
- `--concurrency 1`：只开一个 Playwright 页面串行导出，方便观察日志，也能减少并发导致的资源干扰。

列表文件示例：

```txt
03 分子空间结构与物质性质/01 价层电子对互斥模型.html
02 微粒间作用力与物质性质/04 金属键 金属晶体.html
```

调试某一页时，把对应的 `.html` 路径写进 `scripts/pdf-repo-test.txt`，然后运行 `bun run pdf:single`。

## pdf:all

```bash
bun run pdf:all
```

等价于：

```bash
bun scripts/export-pdf.js --out-dir pdf-repo --concurrency 4
```

用途：导出 `.vitepress/dist` 下所有符合条件的 HTML 页面，适合最终批量生成整站 PDF。

参数说明：

- 未传 `--list`：脚本会自动扫描 `.vitepress/dist/**/*.html`。
- `--out-dir pdf-repo`：PDF 输出到项目根目录下的 `pdf-repo`。
- `--concurrency 4`：同时使用 4 个 Playwright 页面并发导出，速度比单页调试快。

脚本会自动忽略以下页面：

- `404.html`
- `s.html`
- `README.html`
- `index.html`
- 任意目录下的 `index.html`
- `hidePage/**`

## 输出规则

输出 PDF 会保留 HTML 的目录结构，并把后缀从 `.html` 替换为 `.pdf`。

例如：

```txt
.vitepress/dist/03 分子空间结构与物质性质/01 价层电子对互斥模型.html
```

使用 `pdf:single` 后会输出为：

```txt
pdf-repo-single/03 分子空间结构与物质性质/01 价层电子对互斥模型.pdf
```

使用 `pdf:all` 后会输出为：

```txt
pdf-repo/03 分子空间结构与物质性质/01 价层电子对互斥模型.pdf
```

## 常见调试方法

### 只调试一页

1. 先运行 `bun run docs:build`。
2. 把目标页面的 HTML 路径写入 `scripts/pdf-repo-test.txt`。
3. 运行 `bun run pdf:single`。
4. 查看 `pdf-repo-single` 中生成的 PDF。

### 查看字体加载信息

脚本支持通过环境变量输出字体调试信息：

```bash
DEBUG_PDF_FONTS=1 bun run pdf:single
```

日志中会打印当前页面是否加载 Google Font、字体检查结果、实际计算出的 `font-family` 和 `font-weight`。

### 使用 Google Font

默认不会主动加载 Google Font。如果需要测试在线字体，可以运行：

```bash
PDF_USE_GOOGLE_FONT=1 bun run pdf:single
```

也可以同时打开字体调试：

```bash
DEBUG_PDF_FONTS=1 PDF_USE_GOOGLE_FONT=1 bun run pdf:single
```

注意：启用 Google Font 依赖网络环境；如果网络不可用，建议优先确认本地系统是否安装了 `Noto Sans SC`、`Noto Sans CJK SC`、`Source Han Sans SC`、`Microsoft YaHei` 或 `PingFang SC`。
