import type { DefaultTheme } from "vitepress";

import type { PdfExportRules } from "./page.ts";

export type SiteThemeConfig = DefaultTheme.Config & { pdfExport: PdfExportRules };
