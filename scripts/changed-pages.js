import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] || null;
};

const base = getArgValue("--base") || process.env.GIT_BASE;
const head = getArgValue("--head") || process.env.GIT_HEAD || "HEAD";
const outDirInput = getArgValue("--out-dir");
const outDir = outDirInput
  ? path.resolve(process.cwd(), outDirInput)
  : path.resolve(__dirname, "../.github/changed-pages");

// 全 0 的 SHA 表示“无基准”，需要全量导出
const zeroSha = /^0+$/;
// 判断是否属于需要全量导出的“全局变更”
const isGlobalChange = (filePath) => {
  if (!filePath) {
    return false;
  }
  const normalized = filePath.replace(/\\/g, "/");
  // 如果是下面这些路径的变更，则直接视为全局变更
  return (
    normalized.startsWith(".vitepress/") ||
    normalized.startsWith("public/") ||
    normalized.startsWith("data/") ||
    normalized === "package.json" ||
    normalized === "package-lock.json" ||
    normalized === "bun.lock"
  );
};

// 将 .md 路径映射为站点输出的 .html 路径
const mdToHtml = (filePath) => {
  if (!filePath) {
    return null;
  }
  const normalized = filePath.replace(/\\/g, "/");
  if (!/\.md$/i.test(normalized)) {
    return null;
  }
  const dir = path.posix.dirname(normalized);
  const baseName = path.posix.basename(normalized);
  const lower = baseName.toLowerCase();
  const targetName =
    lower === "readme.md" || lower === "index.md"
      ? "index.html"
      : baseName.replace(/\.md$/i, ".html");
  return dir === "." ? targetName : `${dir}/${targetName}`;
};

const outputs = {
  forceAll: false, // 是否需要全量导出
  changed: new Set(), // 变更的页面列表
  deleted: new Set(), // 删除的页面列表
};

// base 不存在或是全 0，则直接全量
if (!base || zeroSha.test(base)) {
  outputs.forceAll = true;
} else {
  let diffOutput = "";
  try {
    // 使用 git diff 获取变更文件列表（含重命名）
    diffOutput = execFileSync("git", ["diff", "--name-status", "-z", `${base}..${head}`], {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    // 失败时兜底为全量
    outputs.forceAll = true;
  }

  if (!outputs.forceAll && diffOutput) {
    // -z 模式以 \0 分隔，便于处理包含空格的路径
    const parts = diffOutput.split("\0").filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      const status = parts[index];
      if (!status) {
        continue;
      }
      // 处理重命名：Rxxx 旧路径 新路径
      if (status.startsWith("R")) {
        const oldPath = parts[index + 1];
        const newPath = parts[index + 2];
        index += 2;
        if (isGlobalChange(oldPath) || isGlobalChange(newPath)) {
          outputs.forceAll = true;
        }
        // 旧路径视为删除，新路径视为新增
        const deleted = mdToHtml(oldPath);
        const added = mdToHtml(newPath);
        if (deleted) {
          outputs.deleted.add(deleted);
        }
        if (added) {
          outputs.changed.add(added);
        }
        continue;
      }

      const filePath = parts[index + 1];
      index += 1;
      if (isGlobalChange(filePath)) {
        outputs.forceAll = true;
      }

      // 只跟踪 Markdown 的变更
      const htmlPath = mdToHtml(filePath);
      if (!htmlPath) {
        continue;
      }
      if (status === "D") {
        outputs.deleted.add(htmlPath);
      } else {
        outputs.changed.add(htmlPath);
      }
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });

const changedList = outputs.forceAll ? [] : Array.from(outputs.changed).sort();
const deletedList = Array.from(outputs.deleted).sort();

// 写入结果文件，供后续工作流读取
fs.writeFileSync(path.join(outDir, "export-all.txt"), outputs.forceAll ? "true" : "false");
fs.writeFileSync(path.join(outDir, "changed-pages.txt"), changedList.join("\n"));
fs.writeFileSync(path.join(outDir, "deleted-pages.txt"), deletedList.join("\n"));

// 控制台输出简要统计
console.log(
  JSON.stringify({
    forceAll: outputs.forceAll,
    changed: changedList.length,
    deleted: deletedList.length,
  }),
);
