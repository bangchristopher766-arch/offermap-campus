import { extractTextItems, getDocumentProxy } from "unpdf";

export type ResumeSection = {
  title: string;
  items: string[];
};

export type ResumeParseQuality = {
  level: "high" | "medium" | "low";
  detected_sections: number;
  total_lines: number;
  warnings: string[];
};

type PositionedItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

type LayoutLine = {
  text: string;
  y: number;
  fontSize: number;
};

const SECTION_RULES: Array<{ title: string; aliases: string[] }> = [
  { title: "教育经历", aliases: ["教育经历", "教育背景", "教育"] },
  { title: "实习经历", aliases: ["实习经历", "工作经历", "工作经验", "实践经历", "职业经历"] },
  { title: "项目经历", aliases: ["项目经历", "项目经验", "个人项目", "项目"] },
  { title: "校园经历", aliases: ["校园经历", "学生工作", "社团经历", "校内经历", "社会实践"] },
  { title: "研究经历", aliases: ["研究经历", "科研经历", "论文与研究"] },
  { title: "获奖经历", aliases: ["获奖经历", "荣誉奖项", "奖项荣誉", "荣誉与奖励"] },
  { title: "技能与证书", aliases: ["专业技能", "技能证书", "技能与证书", "语言能力", "其他技能", "技能", "证书"] },
  { title: "个人信息", aliases: ["个人信息", "基本信息", "联系方式"] },
  { title: "自我评价", aliases: ["自我评价", "个人总结", "个人优势", "关于我"] },
];

function cleanText(value: string) {
  return value
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/([\p{Script=Han}]{2,8})(?:\s*\1){1,}/gu, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[|｜·•\s]+|[|｜·•\s]+$/g, "")
    .trim();
}

function groupPageLines(items: PositionedItem[]): LayoutLine[] {
  const visible = items.filter((item) => cleanText(item.str));
  const groups: Array<{ y: number; fontSize: number; items: PositionedItem[] }> = [];

  for (const item of [...visible].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tolerance = Math.max(2.2, item.fontSize * 0.32);
    const group = groups.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (group) {
      const duplicate = group.items.some((existing) => existing.str === item.str && Math.abs(existing.x - item.x) < 1.5);
      if (!duplicate) group.items.push(item);
      group.y = (group.y + item.y) / 2;
      group.fontSize = Math.max(group.fontSize, item.fontSize);
    } else {
      groups.push({ y: item.y, fontSize: item.fontSize, items: [item] });
    }
  }

  return groups
    .sort((a, b) => b.y - a.y)
    .map((group) => {
      const sorted = group.items.sort((a, b) => a.x - b.x);
      let text = "";
      let previous: PositionedItem | undefined;
      for (const item of sorted) {
        const value = cleanText(item.str);
        if (!value) continue;
        const gap = previous ? item.x - (previous.x + previous.width) : 0;
        const needsSpace = Boolean(previous) && (gap > Math.max(1.5, item.fontSize * 0.12) || /[A-Za-z0-9]$/.test(text) || /^[A-Za-z0-9]/.test(value));
        text += `${needsSpace ? " " : ""}${value}`;
        previous = item;
      }
      return { text: cleanText(text), y: group.y, fontSize: group.fontSize };
    })
    .filter((line) => line.text);
}

function headingAtStart(text: string) {
  const compact = text.replace(/[：:｜|·•\s]/g, "");
  for (const rule of SECTION_RULES) {
    const alias = rule.aliases.find((candidate) => compact.startsWith(candidate));
    if (!alias) continue;
    const flexible = alias.split("").map((character) => `${character}\\s*`).join("");
    const rest = cleanText(text.replace(new RegExp(`^[\\s|｜·•]*${flexible}[：:\\s|｜·•]*`), ""));
    return { title: rule.title, rest };
  }
  return null;
}

function mergeShortFragments(lines: string[]) {
  const merged: string[] = [];
  for (const line of lines) {
    const value = cleanText(line);
    if (!value) continue;
    const previous = merged.at(-1);
    const looksLikeContinuation = previous && previous.length < 100 && value.length < 120 && /^[，。；、）)\-–—0-9A-Za-z]/.test(value);
    if (looksLikeContinuation) merged[merged.length - 1] = cleanText(`${previous} ${value}`);
    else merged.push(value);
  }
  return merged;
}

export async function parseResumePdf(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const result = await extractTextItems(pdf);
  const pageLines = result.items.map((items) => groupPageLines(items as PositionedItem[]));
  const allLines = pageLines.flat();
  const sections = new Map<string, string[]>();
  let currentTitle = "简历摘要";
  sections.set(currentTitle, []);

  for (const line of allLines) {
    const heading = headingAtStart(line.text);
    if (heading) {
      currentTitle = heading.title;
      if (!sections.has(currentTitle)) sections.set(currentTitle, []);
      if (heading.rest) sections.get(currentTitle)?.push(heading.rest);
      continue;
    }
    sections.get(currentTitle)?.push(line.text);
  }

  const structuredSections = Array.from(sections.entries())
    .map(([title, items]) => ({ title, items: mergeShortFragments(items).slice(0, 40) }))
    .filter((section) => section.items.length > 0);
  const detectedSections = structuredSections.filter((section) => section.title !== "简历摘要").length;
  const warnings: string[] = [];
  if (detectedSections < 2) warnings.push("栏目标题识别较少，建议检查 PDF 是否为多栏或图片排版");
  if (structuredSections.some((section) => section.items.length > 24)) warnings.push("部分栏目内容较长，可能存在栏目边界未识别");
  if (allLines.length < 8) warnings.push("识别到的文本较少，请确认 PDF 不是扫描图片");

  return {
    totalPages: result.totalPages,
    text: pageLines.map((lines) => lines.map((line) => line.text).join("\n")).join("\n\n"),
    structuredContent: {
      parser_version: 2,
      sections: structuredSections.length ? structuredSections : [{ title: "简历全文", items: allLines.map((line) => line.text).slice(0, 40) }],
      quality: {
        level: detectedSections >= 3 ? "high" : detectedSections >= 2 ? "medium" : "low",
        detected_sections: detectedSections,
        total_lines: allLines.length,
        warnings,
      } satisfies ResumeParseQuality,
    },
  };
}
