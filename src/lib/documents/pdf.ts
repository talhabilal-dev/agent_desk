import { extractTextItems, renderPageAsImage } from "unpdf";

/** Visible characters per page required before a PDF counts as having a text layer. */
const MIN_CHARS_PER_PAGE = 10;
/** Hard cap on pages processed per document, per job. */
export const MAX_PAGES_PER_DOCUMENT = 10;

/** PDF text items within this many units of Y are treated as the same line. */
const Y_TOLERANCE = 3;

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

/**
 * Rebuilds reading order from PDF coordinates.
 *
 * PDF space has its origin bottom-left, so higher `y` is further up the page.
 * Items are bucketed by rounded `y` (a line), each bucket is sorted by `x`
 * (left to right), and lines are emitted top-down. This recovers column and
 * table order that a naive flat extraction loses.
 */
export function alignTextItems(items: PdfTextItem[]) {
  const buckets = new Map<number, { y: number; items: PdfTextItem[] }>();

  for (const item of items) {
    const text = item.str.replace(/\s+/g, " ").trim();

    if (!text) {
      continue;
    }

    const key = Math.round(item.y / Y_TOLERANCE);
    const bucket = buckets.get(key) ?? { y: item.y, items: [] };
    bucket.items.push({ ...item, str: text });
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => b.y - a.y)
    .map((bucket) =>
      bucket.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .join(" "),
    )
    .join("\n");
}

/**
 * A real text layer yields visible characters on every page; a scanned PDF
 * yields almost none. The threshold is per page so short documents (a memo, a
 * title page) aren't misrouted to OCR.
 */
export function hasTextLayer(text: string, pageCount: number) {
  const chars = text.replace(/\s/g, "").length;

  return chars >= Math.max(MIN_CHARS_PER_PAGE, pageCount * MIN_CHARS_PER_PAGE);
}

export function alignPages(pages: PdfTextItem[][]) {
  return pages
    .map((page) => alignTextItems(page))
    .filter((page) => page.trim().length > 0)
    .join("\n\n");
}

/**
 * Extracts text for at most `maxPages` pages, rebuilding layout from item
 * coordinates. `totalPages` is the document's real page count, so callers can
 * tell the user when a document was truncated rather than silently indexing
 * only part of it.
 */
export async function readPdf(
  data: Uint8Array,
  maxPages: number = MAX_PAGES_PER_DOCUMENT,
) {
  const { totalPages, items } = await extractTextItems(data);
  const pages = items.slice(0, Math.max(1, maxPages));

  return { totalPages, processedPages: pages.length, text: alignPages(pages) };
}

/**
 * Renders PDF pages to PNG buffers for OCR. `scale` above 1 raises the raster
 * resolution, which materially improves tesseract accuracy on small type.
 */
export async function renderPages(
  data: Uint8Array,
  totalPages: number,
  maxPages: number,
) {
  const pages = Math.min(totalPages, maxPages);
  const images: Buffer[] = [];

  for (let page = 1; page <= pages; page += 1) {
    const rendered = await renderPageAsImage(data, page, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 2,
    });

    images.push(Buffer.from(rendered));
  }

  return images;
}
