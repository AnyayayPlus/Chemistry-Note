// bun scripts/merge-pdf.js --dir pdf-repo

import fg from "fast-glob";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dirIndex = args.indexOf("--dir");
const dirArg = dirIndex >= 0 ? args[dirIndex + 1] : null;
if (dirIndex >= 0 && !dirArg) {
  throw new Error("Missing value for --dir");
}
const pdfDir = dirArg
  ? path.resolve(process.cwd(), dirArg)
  : path.resolve(__dirname, "../pdf-repo");

const MERGED_NAME = "Anyayay's_Chemistry_Note_All.pdf";
const outputPath = path.join(pdfDir, MERGED_NAME);

// 扫描所有 PDF，排除合并文件自身
const allPdfs = await fg("**/*.pdf", {
  cwd: pdfDir,
  ignore: [MERGED_NAME, "**/贡献指南.pdf"],
});

if (allPdfs.length === 0) {
  console.log("No PDFs found to merge.");
  process.exit(0);
}

// 排序：目录（根目录在前，编号目录按数字升序），目录内 index 在前、编号文件升序、考点等在后
function sortKey(filePath) {
  const dir = path.posix.dirname(filePath);
  const base = path.posix.basename(filePath, ".pdf");

  let dirOrder;
  if (dir === ".") {
    dirOrder = "00000";
  } else {
    const dirMatch = dir.match(/^(\d+)/);
    dirOrder = dirMatch ? dirMatch[1].padStart(5, "0") : `99999_${dir}`;
  }

  let fileOrder;
  const lower = base.toLowerCase();
  if (lower === "index") {
    fileOrder = "00000";
  } else if (lower === "readme") {
    fileOrder = "00001";
  } else {
    const fileMatch = base.match(/^(\d+)/);
    fileOrder = fileMatch ? fileMatch[1].padStart(5, "0") : `99999_${base}`;
  }

  return `${dirOrder}/${fileOrder}`;
}

allPdfs.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

console.log(`Merging ${allPdfs.length} PDFs into ${MERGED_NAME}...`);

const merged = await PDFDocument.create();
for (const file of allPdfs) {
  const filePath = path.join(pdfDir, file);
  const bytes = fs.readFileSync(filePath);
  try {
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  } catch (err) {
    console.warn(`Warning: skipped ${file} (${err.message})`);
  }
}

const mergedBytes = await merged.save();
fs.writeFileSync(outputPath, mergedBytes);

console.log(`Saved: ${MERGED_NAME} (${merged.getPageCount()} pages)`);
