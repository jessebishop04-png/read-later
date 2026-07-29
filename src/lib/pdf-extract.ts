export type PDFParseResult = {
  title: string | null;
  text: string;
  numpages: number;
};

export async function extractPdfFromBuffer(
  buffer: Buffer,
  fallbackTitle: string
): Promise<PDFParseResult> {
  // Dynamic import: pdf-parse's CJS export breaks under static webpack ESM interop.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo().catch(() => null);
    const text = (textResult.text || "").replace(/\r/g, "").trim();
    if (!text) {
      throw new Error("No text could be extracted from this PDF (it may be image-only).");
    }
    const metaTitle =
      infoResult &&
      typeof (infoResult as { info?: { Title?: string } }).info?.Title === "string"
        ? (infoResult as { info: { Title: string } }).info.Title.trim()
        : "";
    const numpages =
      typeof (infoResult as { total?: number } | null)?.total === "number"
        ? (infoResult as { total: number }).total
        : textResult.pages?.length ?? 0;

    return {
      title: metaTitle || fallbackTitle,
      text,
      numpages,
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
