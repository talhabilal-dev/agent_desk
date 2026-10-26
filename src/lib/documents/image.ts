import sharp from "sharp";
import { createWorker } from "tesseract.js";

import { DocumentError } from "./errors";

const MIN_SHORT_SIDE = 200;
/**
 * Laplacian-stddev sharpness below this is treated as too blurry for reliable
 * OCR. Image-dependent, so every measurement is logged for calibration.
 */
const MIN_SHARPNESS = 1.5;

export async function validateImage(bytes: Buffer) {
  const image = sharp(bytes, { failOn: "error" });
  const metadata = await image.metadata();
  const shortSide = Math.min(metadata.width ?? 0, metadata.height ?? 0);

  if (shortSide < MIN_SHORT_SIDE) {
    throw new DocumentError(
      "IMAGE_TOO_SMALL",
      `Image is ${shortSide}px on its short side; at least ${MIN_SHORT_SIDE}px is required for OCR.`,
    );
  }

  const stats = await image.stats();

  console.log(
    `[documents] image ${metadata.width}x${metadata.height} sharpness=${stats.sharpness.toFixed(2)} entropy=${stats.entropy.toFixed(2)}`,
  );

  if (stats.sharpness < MIN_SHARPNESS) {
    throw new DocumentError(
      "IMAGE_TOO_BLURRY",
      `Image looks blurry (sharpness ${stats.sharpness.toFixed(2)}, minimum ${MIN_SHARPNESS}). Try a sharper scan.`,
    );
  }
}

/** OCRs one or more images using a single worker (worker startup is expensive). */
export async function ocrImages(images: Buffer[]) {
  const worker = await createWorker("eng");

  try {
    const texts: string[] = [];

    for (const image of images) {
      const { data } = await worker.recognize(image);
      texts.push(data.text.trim());
    }

    return texts;
  } finally {
    await worker.terminate();
  }
}
