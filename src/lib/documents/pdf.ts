import { extractTextItems, renderPageAsImage } from "unpdf";

/** Non-whitespace characters required before a PDF counts as having a text layer. */
const MIN_TEXT_CHARS = 40;
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

export function hasTextLayer(text: string) {
  return text.replace(/\s/g, "").length >= MIN_TEXT_CHARS;
}

export function alignPages(pages: PdfTextItem[][]) {
  return pages
    .map((page) => alignTextItems(page))
    .filter((page) => page.trim().length > 0)
    .join("\n\n");
}

/** Extracts text for every page, rebuilding layout from item coordinates. */
export async function readPdf(data: Uint8Array) {
  const { totalPages, items } = await extractTextItems(data);

  return { totalPages, text: alignPages(items) };
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
