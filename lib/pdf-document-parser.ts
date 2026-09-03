import { extractTextItems, getDocumentProxy } from "unpdf";

export const PDF_PARSER_VERSION = 5;

export type PdfParseErrorCode = "encrypted" | "invalid" | "insufficient_text";

export class PdfParseError extends Error {
  readonly code: PdfParseErrorCode;

  constructor(code: PdfParseErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PdfParseError";
    this.code = code;
  }
}

export type DocumentBlockType = "text" | "heading" | "table-row" | "header" | "footer" | "page-number";

export type DocumentBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentBlock = {
  id: string;
  pageNumber: number;
  text: string;
  bbox: DocumentBoundingBox;
  blockType: DocumentBlockType;
  sourceOrder: number;
  columnIndex: number | null;
  style: {
    fontSize: number;
    fontWeight: "normal" | "bold";
  };
};

export type ParsedDocumentQuality = {
  level: "high" | "medium" | "low";
  confidence: number;
  warnings: string[];
};

export type ParsedDocument = {
  parserVersion: number;
  source: {
    mimeType: "application/pdf";
    pageCount: number;
    extractionMethod: "native-text";
  };
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    columnCount: number;
    blocks: DocumentBlock[];
  }>;
  plainText: string;
  quality: ParsedDocumentQuality;
};

export type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
};

export type ExtractedPage = {
  width: number;
  height: number;
  items: PositionedTextItem[];
};

type RawTextItem = {
  str?: unknown;
  text?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  fontSize?: unknown;
  fontName?: unknown;
  fontFamily?: unknown;
  transform?: unknown;
};

type Row = {
  y: number;
  items: PositionedTextItem[];
};

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function cleanPdfText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/([\p{Script=Han}]{2,8})(?:\s*\1){1,}/gu, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[|｜·•\s]+|[|｜·•\s]+$/g, "")
    .trim();
}

function normalizeItem(value: RawTextItem): PositionedTextItem | null {
  const transform = Array.isArray(value.transform) ? value.transform : [];
  const str = cleanPdfText(String(value.str ?? value.text ?? ""));
  if (!str) return null;
  const height = finite(value.height, Math.hypot(finite(transform[2]), finite(transform[3])) || 10);
  return {
    str,
    x: finite(value.x, finite(transform[4])),
    y: finite(value.y, finite(transform[5])),
    width: Math.max(0, finite(value.width)),
    height: Math.max(1, height),
    fontSize: Math.max(1, finite(value.fontSize, height)),
    fontName: typeof value.fontName === "string" ? value.fontName : typeof value.fontFamily === "string" ? value.fontFamily : undefined,
  };
}

function groupRows(items: PositionedTextItem[]) {
  const rows: Row[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tolerance = Math.max(2.2, item.fontSize * 0.32);
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (row) {
      const duplicate = row.items.some((existing) => existing.str === item.str && Math.abs(existing.x - item.x) < 1.5);
      if (!duplicate) row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }
  return rows.sort((a, b) => b.y - a.y);
}

function clusterRowItems(items: PositionedTextItem[]) {
  const clusters: PositionedTextItem[][] = [];
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const cluster = clusters.at(-1);
    const previous = cluster?.at(-1);
    const gap = previous ? item.x - (previous.x + previous.width) : 0;
    if (!cluster || gap > Math.max(12, item.fontSize * 1.8)) clusters.push([item]);
    else cluster.push(item);
  }
  return clusters;
}

function clusterBounds(items: PositionedTextItem[]) {
  const left = Math.min(...items.map((item) => item.x));
  const right = Math.max(...items.map((item) => item.x + item.width));
  return { left, right, width: right - left };
}

function detectColumnSplit(rows: Row[], pageWidth: number) {
  if (rows.length < 6 || pageWidth <= 0) return null;
  const clusters = rows.flatMap((row) => clusterRowItems(row.items));
  const tableLikeRows = rows.filter((row) => clusterRowItems(row.items).length >= 3);
  // Repeated rows with three or more aligned cells are much more likely to be
  // a table than independent page columns. Keeping them in row order avoids
  // turning a table into three unrelated vertical lists.
  if (tableLikeRows.length >= 3 && tableLikeRows.length / rows.length >= 0.4) return null;
  let best: { split: number; score: number } | null = null;
  for (let ratio = 0.32; ratio <= 0.68; ratio += 0.02) {
    const split = pageWidth * ratio;
    const left = clusters.filter((cluster) => clusterBounds(cluster).right < split);
    const right = clusters.filter((cluster) => clusterBounds(cluster).left > split);
    const crossing = clusters.filter((cluster) => {
      const bounds = clusterBounds(cluster);
      return bounds.left <= split && bounds.right >= split;
    });
    if (left.length < 3 || right.length < 3) continue;
    const leftSpan = Math.max(...left.map((cluster) => clusterBounds(cluster).right)) - Math.min(...left.map((cluster) => clusterBounds(cluster).left));
    const rightSpan = Math.max(...right.map((cluster) => clusterBounds(cluster).right)) - Math.min(...right.map((cluster) => clusterBounds(cluster).left));
    if (leftSpan < pageWidth * 0.16 || rightSpan < pageWidth * 0.16) continue;
    const balance = Math.min(left.length, right.length) / Math.max(left.length, right.length);
    const crossingRatio = crossing.length / clusters.length;
    const score = crossingRatio + (1 - balance) * 0.2 + Math.abs(0.5 - ratio) * 0.05;
    if (crossingRatio <= 0.22 && (!best || score < best.score)) best = { split, score };
  }
  return best?.split ?? null;
}

function joinItems(items: PositionedTextItem[]) {
  let text = "";
  let previous: PositionedTextItem | undefined;
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const gap = previous ? item.x - (previous.x + previous.width) : 0;
    const needsSpace = Boolean(previous) && (gap > Math.max(1.5, item.fontSize * 0.12) || /[A-Za-z0-9]$/.test(text) || /^[A-Za-z0-9]/.test(item.str));
    text += `${needsSpace ? " " : ""}${item.str}`;
    previous = item;
  }
  return cleanPdfText(text);
}

function makeBlock(pageNumber: number, sourceOrder: number, items: PositionedTextItem[], columnIndex: number | null): DocumentBlock {
  const bounds = clusterBounds(items);
  const bottom = Math.min(...items.map((item) => item.y));
  const top = Math.max(...items.map((item) => item.y + item.height));
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const largeGaps = sorted.slice(1).filter((item, index) => item.x - (sorted[index].x + sorted[index].width) > Math.max(12, item.fontSize * 1.8)).length;
  return {
    id: `p${pageNumber}-b${String(sourceOrder + 1).padStart(3, "0")}`,
    pageNumber,
    text: joinItems(items),
    bbox: { x: bounds.left, y: bottom, width: bounds.width, height: top - bottom },
    blockType: largeGaps >= 2 ? "table-row" : "text",
    sourceOrder,
    columnIndex,
    style: {
      fontSize: Math.max(...items.map((item) => item.fontSize)),
      fontWeight: items.some((item) => /bold|heavy|semibold|demi/i.test(item.fontName ?? "")) ? "bold" : "normal",
    },
  };
}

function orderColumnBlocks(blocks: DocumentBlock[], split: number) {
  const full = blocks.filter((block) => block.bbox.x < split && block.bbox.x + block.bbox.width > split).sort((a, b) => b.bbox.y - a.bbox.y || a.bbox.x - b.bbox.x);
  const columns = blocks.filter((block) => !full.includes(block));
  const ordered: DocumentBlock[] = [];
  let upper = Number.POSITIVE_INFINITY;
  for (const divider of full) {
    const region = columns.filter((block) => block.bbox.y < upper && block.bbox.y > divider.bbox.y);
    ordered.push(...region.sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0) || b.bbox.y - a.bbox.y || a.bbox.x - b.bbox.x));
    ordered.push(divider);
    upper = divider.bbox.y;
  }
  const remainder = columns.filter((block) => block.bbox.y < upper);
  ordered.push(...remainder.sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0) || b.bbox.y - a.bbox.y || a.bbox.x - b.bbox.x));
  return ordered;
}

function layoutPage(page: ExtractedPage, pageNumber: number) {
  const rows = groupRows(page.items);
  const split = detectColumnSplit(rows, page.width);
  const blocks: DocumentBlock[] = [];
  for (const row of rows) {
    if (!split) {
      blocks.push(makeBlock(pageNumber, blocks.length, row.items, null));
      continue;
    }
    const clusters = clusterRowItems(row.items);
    const leftItems = clusters.filter((cluster) => clusterBounds(cluster).right < split).flat();
    const rightItems = clusters.filter((cluster) => clusterBounds(cluster).left > split).flat();
    const fullItems = clusters.filter((cluster) => {
      const bounds = clusterBounds(cluster);
      return bounds.left <= split && bounds.right >= split;
    }).flat();
    if (leftItems.length) blocks.push(makeBlock(pageNumber, blocks.length, leftItems, 0));
    if (rightItems.length) blocks.push(makeBlock(pageNumber, blocks.length, rightItems, 1));
    if (fullItems.length) blocks.push(makeBlock(pageNumber, blocks.length, fullItems, null));
  }
  const ordered = split ? orderColumnBlocks(blocks, split) : blocks.sort((a, b) => b.bbox.y - a.bbox.y || a.bbox.x - b.bbox.x);
  return {
    pageNumber,
    width: page.width,
    height: page.height,
    columnCount: split ? 2 : 1,
    blocks: ordered.map((block, index) => ({ ...block, sourceOrder: index, id: `p${pageNumber}-b${String(index + 1).padStart(3, "0")}` })),
  };
}

function markRepeatedPageFurniture(pages: ParsedDocument["pages"]) {
  const occurrences = new Map<string, DocumentBlock[]>();
  for (const page of pages) {
    for (const block of page.blocks) {
      const isTop = block.bbox.y >= page.height * 0.9;
      const isBottom = block.bbox.y + block.bbox.height <= page.height * 0.1;
      if (!isTop && !isBottom) continue;
      const key = `${isTop ? "top" : "bottom"}:${block.text.toLocaleLowerCase()}`;
      occurrences.set(key, [...(occurrences.get(key) ?? []), block]);
    }
  }
  for (const [key, blocks] of occurrences) {
    if (new Set(blocks.map((block) => block.pageNumber)).size < 2) continue;
    for (const block of blocks) block.blockType = key.startsWith("top:") ? "header" : "footer";
  }
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.blockType === "text" && /^(?:page\s*)?\d+(?:\s*\/\s*\d+)?$/i.test(block.text) && block.bbox.y < page.height * 0.12) {
        block.blockType = "page-number";
      }
    }
  }
}

export function buildParsedDocument(extractedPages: ExtractedPage[]): ParsedDocument {
  const pages = extractedPages.map((page, index) => layoutPage(page, index + 1));
  markRepeatedPageFurniture(pages);
  const contentBlocks = pages.flatMap((page) => page.blocks).filter((block) => !["header", "footer", "page-number"].includes(block.blockType));
  const plainText = pages.map((page) => page.blocks.filter((block) => !["header", "footer", "page-number"].includes(block.blockType)).map((block) => block.text).join("\n")).filter(Boolean).join("\n\n");
  const warnings: string[] = [];
  if (pages.some((page) => page.blocks.some((block) => block.blockType === "table-row"))) warnings.push("检测到表格式内容，请检查行列顺序");
  if (contentBlocks.length < 8) warnings.push("识别到的文本块较少，请确认 PDF 包含可选择的文字");
  return {
    parserVersion: PDF_PARSER_VERSION,
    source: { mimeType: "application/pdf", pageCount: pages.length, extractionMethod: "native-text" },
    pages,
    plainText,
    quality: {
      level: contentBlocks.length < 8 ? "low" : warnings.length ? "medium" : "high",
      confidence: contentBlocks.length < 8 ? 0.35 : warnings.length ? 0.72 : 0.92,
      warnings,
    },
  };
}

export function parseFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/password|encrypted|encryption|口令|加密/i.test(message)) {
    return new PdfParseError("encrypted", "PDF 已加密或受密码保护，请上传未加密的文本型 PDF", { cause: error });
  }
  return new PdfParseError("invalid", "PDF 文件已损坏或格式无效", { cause: error });
}

export function assertSufficientPdfText(document: ParsedDocument) {
  if (document.plainText.replace(/\s/g, "").length < 80) {
    throw new PdfParseError("insufficient_text", "没有识别到足够文字，暂不支持扫描版 PDF");
  }
}

export async function parsePdfDocument(bytes: Uint8Array): Promise<ParsedDocument> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractTextItems(pdf);
    const extractedPages = await Promise.all(result.items.map(async (rawItems, index) => {
      const page = await pdf.getPage(index + 1);
      const viewport = page.getViewport({ scale: 1 });
      return {
        width: viewport.width,
        height: viewport.height,
        items: (rawItems as RawTextItem[]).map(normalizeItem).filter((item): item is PositionedTextItem => Boolean(item)),
      };
    }));
    const document = buildParsedDocument(extractedPages);
    assertSufficientPdfText(document);
    return document;
  } catch (error) {
    if (error instanceof PdfParseError) throw error;
    throw parseFailure(error);
  }
}
