export type ResumeSection = {
  title: string;
  items: string[];
};

const SECTION_RULES: Array<{ title: string; pattern: RegExp }> = [
  { title: "教育经历", pattern: /^(教育经历|教育背景|教育)$/ },
  { title: "实习经历", pattern: /^(实习经历|工作经历|工作经验|实践经历)$/ },
  { title: "项目经历", pattern: /^(项目经历|项目经验|项目)$/ },
  { title: "校园经历", pattern: /^(校园经历|学生工作|社团经历|校内经历)$/ },
  { title: "技能与证书", pattern: /^(专业技能|技能|技能证书|证书|语言能力|其他技能)$/ },
  { title: "个人信息", pattern: /^(个人信息|基本信息|联系方式)$/ },
  { title: "自我评价", pattern: /^(自我评价|个人总结|个人优势)$/ },
];

function cleanLine(line: string) {
  return line.replace(/[\t\u00a0]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function structureResumeText(text: string): { sections: ResumeSection[] } {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const buckets = new Map<string, string[]>();
  let currentTitle = "简历摘要";
  buckets.set(currentTitle, []);

  for (const line of lines) {
    const compact = line.replace(/[：:｜|·•\s]/g, "");
    const match = SECTION_RULES.find((rule) => rule.pattern.test(compact));
    if (match) {
      currentTitle = match.title;
      if (!buckets.has(currentTitle)) buckets.set(currentTitle, []);
      continue;
    }
    const bucket = buckets.get(currentTitle) ?? [];
    if (bucket.length < 16 && line.length <= 240) bucket.push(line);
    buckets.set(currentTitle, bucket);
  }

  const sections = Array.from(buckets.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => ({ title, items }));

  return { sections: sections.length ? sections : [{ title: "简历全文", items: lines.slice(0, 16) }] };
}
