import { z } from "zod";
import { createUserSupabase } from "@/lib/supabase";

export const runtime = "edge";

const preparationSchema = z.object({
  status: z.enum(["not_started", "drafting", "ready"]),
  answerDraft: z.string().max(12000),
  realExample: z.string().max(6000),
  keyMetrics: z.string().max(3000),
  notes: z.string().max(6000),
});

function tokenFrom(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createUserSupabase(tokenFrom(request));
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return Response.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const input = preparationSchema.parse(await request.json());
    const { data: question, error: questionError } = await supabase.from("interview_questions")
      .select("id,position_id").eq("id", id).maybeSingle();
    if (questionError) throw questionError;
    if (!question) return Response.json({ error: "面试问题不存在或你无权修改" }, { status: 404 });

    const updatedAt = new Date().toISOString();
    const comment = JSON.stringify({ kind: "question-preparation", version: 1, ...input, updatedAt });
    const { data: candidates, error: existingError } = await supabase.from("feedback")
      .select("id,comment").eq("target_type", "interview_question").eq("target_id", id)
      .order("created_at", { ascending: false }).limit(20);
    if (existingError) throw existingError;
    const existing = (candidates ?? []).find((candidate) => {
      try {
        const parsed = JSON.parse(candidate.comment) as { kind?: string; version?: number };
        return parsed.kind === "question-preparation" && parsed.version === 1;
      } catch { return false; }
    });
    const operation = existing
      ? supabase.from("feedback").update({ helpful: input.status === "ready", comment, created_at: updatedAt }).eq("id", existing.id)
      : supabase.from("feedback").insert({ user_id: user.user.id, position_id: question.position_id, target_type: "interview_question", target_id: id, helpful: input.status === "ready", comment, created_at: updatedAt });
    const { error } = await operation;
    if (error) throw error;
    return Response.json({ data: { ...input, updatedAt } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "回答准备内容格式不正确" }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "回答准备保存失败" }, { status: 503 });
  }
}
