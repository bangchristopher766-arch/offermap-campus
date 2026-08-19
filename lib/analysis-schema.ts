import { z } from "zod";

export const positionCategorySchema = z.enum(["technology", "product", "operations", "marketing"]);
export type PositionCategory = z.infer<typeof positionCategorySchema>;

export const evidenceMapSchema = z.object({
  requirements: z.array(z.object({
    id: z.string(),
    type: z.enum(["required", "preferred", "responsibility"]),
    requirement: z.string().min(1),
    jdQuote: z.string().min(1),
    importance: z.enum(["high", "medium", "low"]),
    status: z.enum(["strong", "partial", "missing"]),
    resumeQuote: z.string(),
    resumeQuotes: z.array(z.string()).max(4).default([]),
    rationale: z.string().min(1),
    action: z.string().min(1),
  })).min(1).max(20),
});

export const resumeSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    id: z.string(),
    action: z.enum(["keep", "rewrite", "add", "deemphasize"]),
    original: z.string().min(1),
    suggested: z.string().min(1),
    reason: z.string().min(1),
    risk: z.string().min(1),
    requirementIds: z.array(z.string()),
    sourceQuotes: z.array(z.string()).min(1),
  })).max(12),
});

export const interviewMapSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    priorityReason: z.string().min(1),
    mainQuestion: z.string().min(1),
    intent: z.string().min(1),
    jdQuotes: z.array(z.string()).min(1),
    resumeQuotes: z.array(z.string()).min(1),
    answerStructure: z.array(z.string()).min(2).max(6),
    followups: z.array(z.string()).min(2).max(4),
    missingInformation: z.string(),
    risk: z.string(),
  })).min(1).max(12),
});

export const analysisRequestSchema = z.object({
  kind: z.enum(["evidence", "resume", "interview"]),
  category: positionCategorySchema,
  jd: z.string().min(80).max(30_000),
  resume: z.string().min(80).max(50_000),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

export function assertVerifiableQuotes(result: unknown, jd: string, resume: string) {
  const serialized = JSON.stringify(result);
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  const strings: string[] = [];
  const visit = (value: unknown, key = "") => {
    if (typeof value === "string" && /quote/i.test(key) && value.trim()) strings.push(value.trim());
    if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === "object") Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  };
  visit(parsed);
  const invalid = strings.filter((quote) => !jd.includes(quote) && !resume.includes(quote));
  if (invalid.length) throw new Error(`模型返回了无法定位的引用：${invalid[0].slice(0, 40)}`);
}
