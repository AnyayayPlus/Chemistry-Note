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

站点和投稿 API 从 npm 安装同一版本的 `vitepress-inline-editor`。升级测试版时运行 `pnpm add --save-exact vitepress-inline-editor@beta`，并提交 `package.json` 和 `pnpm-lock.yaml`。[编辑器源码](https://github.com/Seeridia/vitepress-inline-editor) · [npm 版本](https://www.npmjs.com/package/vitepress-inline-editor?activeTab=versions)

VitePress 构建读取当前 Git SHA。本地联调或没有 Git 元数据的构建环境可用 `EDITOR_CONTENT_REVISION` 指定内容仓库的已知提交。

站点容器与本地 Vite 开发服务通过 `EDITOR_API_ORIGIN` 把同源 `/api/editor/` 转发到投稿服务，默认上游为 `http://127.0.0.1:8787`。分容器运行时填入能从站点容器访问的服务地址。投稿服务使用站点实际来源 `SITE_ORIGIN`、`CONTENT_BRANCH=master` 和 `EDITOR_PATHS='["[0-9][0-9] */!(index).md"]'`。启动示例：

```sh
pnpm exec vitepress-editor-api --env-file /path/to/editor.env
```

本地投稿 API 使用下方的账号与仓库配置，HTTP 联调时用 `cc_reader` 作为 `EDITOR_ACCOUNT_COOKIE`。站点通过同源的 `/api/public/editor-contributors` 读取外部贡献者，本地可用 `VITE_EDITOR_CONTRIBUTORS_API` 覆盖。右上角「设置 → 站内编辑」带有 Beta 标签，初次访问和恢复默认均为关闭。开启时会弹出测试阶段提示。点「知道了」返回设置后，「编辑此页」位于右侧文章大纲下方，窄屏显示在右下角。

启动站点开发服务后，运行 `pnpm run test:editor` 检查编辑开关、取消或完成登录后恢复草稿、投稿回执和按文章展示的名单。可用 `EDITOR_TEST_ORIGIN` 指定开发服务地址，`PLAYWRIGHT_CHANNEL=chrome` 使用本机 Chrome。

### Cloudflare PR 预览

Workers Builds 在构建时为每篇可编辑文章生成该 Git 提交的原稿。预览 Worker 用静态资源绑定提供同源 `GET /api/editor/source`。点击「编辑此页」后，整篇笔记进入可视化编辑。点击公式可修改 LaTeX 或化学式并预览，底部的「插入公式」也能添加行内或独立公式。工具栏还支持列表、引用、表格、切换视图和查看差异。草稿支持刷新恢复。正式投稿由接入社区账号的站点处理。

本地复现可先运行 `WORKERS_CI=1 WORKERS_CI_BRANCH=preview vp run docs:build`，再用 `wrangler dev --local` 启动预览。运行 `EDITOR_TEST_ORIGIN=<预览地址> vp run test:editor-preview` 可直接验证本地或 Cloudflare 上的 Worker，校验内容与当前 Git 提交一致。测试其他提交时可设置 `EDITOR_TEST_REVISION`。

## GitHub Actions

- **Build and Publish PDFs** 手动运行时默认提供预览制品。线上自动发布由 `PDF_PUBLISH_ENABLED=true` 启用。
- `master` 推送通过部署工作流调用 PDF 工作流，复用站点构建制品。只有发布步骤使用 `CNB_TOKEN`，需要目标仓库的 Git 写入和 Release 附件权限。
- 首次发布会检查旧版 CNB 文件的校验值，再随新单元和发布清单一起删除旧流水线。已清理旧文件的 CNB 仓库也可直接发布。
- 全集附件通过校验后才提交发布清单。顶部下载菜单读取同源清单，直接下载当前全集。清单暂时不可用时使用上一版下载链接。
- 回滚时在 CNB 一并恢复上一版单元 PDF 和清单，并保留关闭旧合并流程的修改。

## 站内投稿服务

站点发布作业使用相同的编辑器包生成静态站镜像和 `editor-sha-<commit>` 投稿 API 镜像。投稿 API 部署在内部网络。沿用已有组织 GitHub App，设置 `GITHUB_APP_ID`、`GITHUB_APP_PRIVATE_KEY_FILE` 和持久的 `EDITOR_SESSION_SECRET`。指定安装 ID 时使用 `GITHUB_INSTALLATION_ID`，省略时编辑器会根据目标仓库查询。

设置 `SITE_ORIGIN=https://chemistry-note.seeridia.top`，将 `EDITOR_ACCOUNT_URL` 和 `EDITOR_CONTRIBUTIONS_URL` 分别指向社区服务内网的 `/api/internal/editor-identity` 和 `/api/internal/editor-contributions`，两端配置同一 `EDITOR_CONTRIBUTIONS_TOKEN`。此镜像要求账号模式，编辑范围与 VitePress 配置一致。

静态站容器用 `EDITOR_API_ORIGIN` 连接投稿服务，用 `COMMUNITY_ACCOUNT_ORIGIN` 连接社区服务，填写从容器可达的实际源站。登录回调由社区服务处理，`/u/<公开ID>` 是可直接访问的个人主页。生产登录回调、会话与本人投稿响应需绕过 CDN 缓存。站内设置仅控制是否显示编辑按钮。
