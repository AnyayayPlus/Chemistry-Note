import { PDF_LEGACY_URL } from "../../shared/site.ts";

let pending: Promise<string> | undefined;

export function latestPdfUrl(): Promise<string> {
  pending ??= fetchLatestPdfUrl();
  return pending;
}

async function fetchLatestPdfUrl(): Promise<string> {
  try {
    const response = await fetch("/pdf-manifest.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const manifest = await response.json();
      const url = new URL(manifest.book.url);
      if (
        url.origin === "https://api.cnb.cool" &&
        /^\/Seeridia\/Chemistry-Note-File\/-\/releases\/download\/pdf-[a-f0-9]{16}-[a-f0-9]{16}\/Anyayay_Chemistry_Note\.pdf$/.test(
          url.pathname,
        )
      ) {
        return url.href;
      }
    }
  } catch {
    // The legacy release remains available when the manifest is unreachable.
  }
  return PDF_LEGACY_URL;
}
