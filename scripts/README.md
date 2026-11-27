# PDF 生成与发布

GitHub Actions 复用 VitePress 站点构建产物。Go 工具通过 chromedp 调用 Chromium，读取正文和原有主题 CSS，并通过 pdfcpu 添加页码、目录和书签。CNB 的 `main` 保存单元 PDF 和发布清单，全集存放在对应的 CNB Release 中。

## 本地生成

需要 Go、Chromium 和 HarfBuzz 的 `hb-subset`（macOS 可用 `brew install go harfbuzz`，Ubuntu 可安装 `libharfbuzz-bin`）。可使用本机 Chromium，或通过 Playwright 安装仓库锁定的 Chromium。若工具找不到浏览器，设置 `PDF_CHROMIUM` 为浏览器可执行文件的路径。

```bash
vp install --frozen-lockfile
vp run docs:build
vp run pdf:all
```

成品位于 `output/pdf/`，复用的正文和字体保存在 `output/pdf-bodies/`。下面的命令试印单元，也可追加 `--force` 跳过正文缓存。

```bash
vp run pdf:all --unit '04 有机化学基础/05 烃的衍生物.html'
go -C scripts/pdf test ./...
```

打印页面复用 VitePress 的主题、MathJax 和笔记配图。打印约束集中在 `scripts/pdf/print.css`。固定版本的 Noto Sans SC 下载后会验证 SHA-256，HarfBuzz 将字体轴固定为常规和粗体。已有同一文件时，可传 `--font-source /path/to/NotoSansSC-VF.ttf`。

## 站内编辑试点接入

站点从 `.vitepress/vendor/` 安装独立编辑器仓库构建的 pnpm 包。当前包对应 `vitepress-inline-editor` 提交 `78058d9`。升级时替换该发布包并更新锁文件。VitePress 构建读取当前 Git SHA；本地联调或没有 Git 元数据的构建环境可用 `EDITOR_CONTENT_REVISION` 指定内容仓库的已知提交。

站点容器与本地 Vite 开发服务通过 `EDITOR_API_ORIGIN` 把同源 `/api/editor/` 转发到投稿服务，默认上游为 `http://127.0.0.1:8787`。分容器运行时填入能从站点容器访问的服务地址。投稿服务使用站点实际来源 `SITE_ORIGIN`、`CONTENT_BRANCH=master` 和 `EDITOR_PATHS='["[0-9][0-9] */!(index).md"]'`。启动示例：

```sh
pnpm exec vitepress-editor-api --env-file /path/to/editor.env
```

配置文件同时提供该仓库的 GitHub App 凭据、会话密钥、社区服务的 `EDITOR_CONTRIBUTIONS_URL`（路径为 `/api/internal/editor-contributions`）与两端共用的 `EDITOR_CONTRIBUTIONS_TOKEN`。外部贡献者名单默认读取社区服务的 `/api/public/editor-contributors`，本地联调可用 `VITE_EDITOR_CONTRIBUTORS_API` 指向本机公开名单接口。右上角「设置 → 站内编辑」控制当前浏览器的编辑按钮，初次访问和恢复默认均为关闭。

启动站点开发服务后，运行 `pnpm run test:editor` 检查编辑开关、旧署名接口和按文章展示的名单。可用 `EDITOR_TEST_ORIGIN` 指定开发服务地址，`PLAYWRIGHT_CHANNEL=chrome` 使用本机 Chrome。

## GitHub Actions

- **Build and Publish PDFs** 手动运行时默认提供预览制品。线上自动发布由 `PDF_PUBLISH_ENABLED=true` 启用。
- `master` 推送通过部署工作流调用 PDF 工作流，复用站点构建制品。只有发布步骤使用 `CNB_TOKEN`，需要目标仓库的 Git 写入和 Release 附件权限。
- 首次发布会检查旧版 CNB 文件的校验值，再随新单元和发布清单一起删除旧流水线。已清理旧文件的 CNB 仓库也可直接发布。
- 全集附件通过校验后才提交发布清单。顶部下载菜单读取同源清单，直接下载当前全集。清单暂时不可用时使用上一版下载链接。
- 回滚时在 CNB 一并恢复上一版单元 PDF 和清单，并保留关闭旧合并流程的修改。
