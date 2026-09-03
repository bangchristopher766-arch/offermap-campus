import { cleanPdfText, parsePdfDocument, PDF_PARSER_VERSION } from "@/lib/pdf-document-parser";
import type { DocumentBlock, ParsedDocument } from "@/lib/pdf-document-parser";

export type ResumeSectionKind = "summary" | "personal" | "education" | "experience" | "projects" | "research" | "awards" | "skills" | "profile";

export type ResumeSection = {
  title: string;
  items: string[];
  originalTitle?: string | null;
  normalizedKind?: ResumeSectionKind | string | null;
  sourceBlockIds?: string[];
};

export type ResumeParseQuality = {
  level: "high" | "medium" | "low";
  detected_sections: number;
  total_lines: number;
  warnings: string[];
  method?: string;
  ai_enhanced?: boolean;
};

export type ResumeStructuredContent = {
  parser_version: number;
  sections: ResumeSection[];
  quality: ResumeParseQuality;
  document?: ParsedDocument;
};

const SECTION_KIND_HINTS: Array<{ kind: ResumeSectionKind; aliases: string[] }> = [
  { kind: "personal", aliases: ["个人信息", "基本信息", "联系方式", "personal information", "contact"] },
  { kind: "education", aliases: ["教育经历", "教育背景", "教育", "education", "academic background"] },
  { kind: "experience", aliases: ["实习经历", "工作经历", "工作经验", "实践经历", "职业经历", "experience", "work experience", "employment"] },
  { kind: "projects", aliases: ["项目经历", "项目经验", "个人项目", "projects", "selected projects"] },
  { kind: "research", aliases: ["研究经历", "科研经历", "论文与研究", "research", "publications"] },
  { kind: "awards", aliases: ["获奖经历", "荣誉奖项", "奖项荣誉", "荣誉与奖励", "awards", "honors"] },
  { kind: "skills", aliases: ["专业技能", "个人技能", "技能证书", "技能与证书", "语言能力", "其他技能", "skills", "certifications", "languages"] },
  { kind: "profile", aliases: ["自我评价", "个人总结", "个人优势", "关于我", "profile", "summary", "about me"] },
];

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function dominantBodyFontSize(blocks: DocumentBlock[]) {
  const values = blocks.map((block) => block.style.fontSize).filter((value) => value > 0);
  if (!values.length) return 10;
  const counts = new Map<number, number>();
  for (const value of values) {
    const bucket = Math.round(value * 2) / 2;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return ranked[0]?.[1] > 1 ? ranked[0][0] : median(values);
}

function isContentBlock(block: DocumentBlock) {
  return !["header", "footer", "page-number"].includes(block.blockType);
}

function looksLikeTitle(text: string) {
  const value = cleanPdfText(text);
  if (!value || value.length > 60 || /[。！？!?；;]$/.test(value)) return false;
  if (/^(?:19|20)\d{2}[./年-]|^[·•●▪◦]|@|https?:\/\//i.test(value)) return false;
  return value.split(/\s+/).filter(Boolean).length <= 8;
}

function headingScore(block: DocumentBlock, previous: DocumentBlock | undefined, bodyFontSize: number) {
  if (!looksLikeTitle(block.text)) return 0;
  let score = block.text.length <= 32 ? 1 : 0;
  if (block.style.fontSize >= bodyFontSize * 1.16) score += 3;
  if (block.style.fontWeight === "bold") score += 1;
  if (/^[A-Z][A-Z\d &/+-]{2,}$/.test(block.text)) score += 3;
  if (previous?.pageNumber === block.pageNumber && previous.columnIndex === block.columnIndex) {
    const gapAbove = previous.bbox.y - (block.bbox.y + block.bbox.height);
    const followsHeadingStyle = previous.style.fontSize >= bodyFontSize * 1.16 || previous.style.fontWeight === "bold" || /^[A-Z][A-Z\d &/+-]{2,}$/.test(previous.text);
    if (!followsHeadingStyle && gapAbove >= Math.max(bodyFontSize * 1.35, block.style.fontSize * 1.1)) score += 2;
  }
  return score;
}

function normalizedKindForTitle(title: string): ResumeSectionKind | null {
  const compact = cleanPdfText(title).toLocaleLowerCase().replace(/[：:｜|·•\s]/g, "");
  const match = SECTION_KIND_HINTS.find((candidate) => candidate.aliases.some((alias) => compact === alias.toLocaleLowerCase().replace(/\s/g, "")));
  return match?.kind ?? null;
}

export function discoverResumeSections(document: ParsedDocument): ResumeSection[] {
  const blocks = document.pages.flatMap((page) => page.blocks).filter(isContentBlock);
  const bodyFontSize = dominantBodyFontSize(blocks);
  const leadingOversizedCount = blocks.slice(0, 2).filter((block) => block.pageNumber === 1 && block.style.fontSize >= bodyFontSize * 1.3).length;
  const headingIds = new Set<string>();
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    // The first one or two oversized lines are commonly the candidate's name
    // and professional title. Treat them as document identity content until a
    // body-sized line establishes context, instead of presenting the name as a
    // resume section heading.
    const leadingDocumentTitle = block.pageNumber === 1 && (
      (index < 2 && leadingOversizedCount === 2 && block.style.fontSize >= bodyFontSize * 1.3)
      || (index === 0 && block.style.fontSize >= bodyFontSize * 1.7)
    );
    if (!leadingDocumentTitle && headingScore(block, blocks[index - 1], bodyFontSize) >= 3) {
      block.blockType = "heading";
      headingIds.add(block.id);
    }
  }

  const sections: ResumeSection[] = [];
  let current: ResumeSection = { title: "简历摘要", originalTitle: null, normalizedKind: "summary", items: [], sourceBlockIds: [] };
  for (const block of blocks) {
    if (headingIds.has(block.id)) {
      if (current.items.length || current.sourceBlockIds?.length) sections.push(current);
      current = {
        title: block.text,
        originalTitle: block.text,
        normalizedKind: normalizedKindForTitle(block.text),
        items: [],
        sourceBlockIds: [block.id],
      };
      continue;
    }
    current.items.push(block.text);
    current.sourceBlockIds?.push(block.id);
  }
  if (current.items.length || current.sourceBlockIds?.length) sections.push(current);
  if (!sections.length) {
    return [{ title: "简历全文", originalTitle: null, normalizedKind: null, items: blocks.map((block) => block.text), sourceBlockIds: blocks.map((block) => block.id) }];
  }
  return sections;
}

export function adaptParsedDocumentToResume(document: ParsedDocument): ResumeStructuredContent {
  const sections = discoverResumeSections(document);
  const detectedSections = sections.filter((section) => section.originalTitle).length;
  const warnings = [...document.quality.warnings];
  if (!detectedSections) warnings.push("未发现明确的模块标题，已完整保留原文，可使用 AI 辅助分段或人工校正");
  else if (detectedSections < 2) warnings.push("部分模块边界不够明确，请检查解析结果");
  const level = detectedSections >= 2 && document.quality.level !== "low" ? document.quality.level : detectedSections ? "medium" : "low";
  return {
    parser_version: PDF_PARSER_VERSION,
    sections,
    quality: {
      level,
      detected_sections: detectedSections,
      total_lines: document.pages.flatMap((page) => page.blocks).filter(isContentBlock).length,
      warnings,
      method: "native-layout-dynamic-sections",
      ai_enhanced: false,
    },
    document,
  };
}

export async function parseResumePdf(bytes: Uint8Array) {
  const document = await parsePdfDocument(bytes);
  return {
    totalPages: document.source.pageCount,
    text: document.plainText,
    document,
    structuredContent: adaptParsedDocumentToResume(document),
  };
}
