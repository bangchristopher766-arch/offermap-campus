import { createUserSupabase } from "@/lib/supabase";

const STALLED_AFTER_MS = 6 * 60 * 1000;

type SupabaseClient = ReturnType<typeof createUserSupabase>;

export type ActiveAiRun = {
  id: string;
  task: string;
  phase: "core" | "expand" | null;
  kind: "evidence" | "resume" | "interview";
  startedAt: string;
  stalled: boolean;
};

function taskMeta(task: string) {
  if (task.startsWith("resume-")) return { kind: "resume" as const, phase: task.endsWith("expand") ? "expand" as const : "core" as const };
  if (task.startsWith("interview-")) return { kind: "interview" as const, phase: task.endsWith("expand") ? "expand" as const : "core" as const };
  return { kind: "evidence" as const, phase: null };
}

function toActiveRun(run: { id: string; task: string; created_at: string }): ActiveAiRun {
  return {
    id: run.id,
    task: run.task,
    ...taskMeta(run.task),
    startedAt: run.created_at,
    stalled: Date.now() - new Date(run.created_at).getTime() > STALLED_AFTER_MS,
  };
}

async function deterministicRunId(positionId: string, task: string, inputHash: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${positionId}\n${task}\n${inputHash}`));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function loadActiveAiRun(supabase: SupabaseClient, positionId: string): Promise<ActiveAiRun | null> {
  const { data, error } = await supabase.from("ai_runs")
    .select("id,task,created_at")
    .eq("position_id", positionId)
    .eq("status", "processing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toActiveRun(data) : null;
}

export async function claimAiRun({ supabase, userId, positionId, task, model, promptVersion, inputHash }: { supabase: SupabaseClient; userId: string; positionId: string; task: string; model: string; promptVersion: string; inputHash: string }) {
  const active = await loadActiveAiRun(supabase, positionId);
  if (active && !active.stalled) return { acquired: false as const, activeRun: active };
  if (active?.stalled) {
    await supabase.from("ai_runs").update({ status: "failed", error_code: "stalled:auto-released", duration_ms: Date.now() - new Date(active.startedAt).getTime() }).eq("id", active.id).eq("status", "processing");
    if (active.kind === "evidence") await supabase.from("positions").update({ analysis_status: "failed", updated_at: new Date().toISOString() }).eq("id", positionId).eq("analysis_status", "processing");
  }

  const id = await deterministicRunId(positionId, task, inputHash);
  const now = new Date().toISOString();
  const payload = {
    id,
    user_id: userId,
    position_id: positionId,
    task,
    model,
    prompt_version: promptVersion,
    input_hash: inputHash,
    status: "processing",
    error_code: `running:${task}`,
    created_at: now,
    duration_ms: null,
    input_tokens: null,
    output_tokens: null,
  };
  const { data: existing } = await supabase.from("ai_runs").select("id,status,task,created_at").eq("id", id).maybeSingle();
  if (existing?.status === "ready") return { acquired: false as const, completed: true as const, activeRun: null };
  const operation = existing
    ? supabase.from("ai_runs").update(payload).eq("id", id)
    : supabase.from("ai_runs").insert(payload);
  const { error: claimError } = await operation;
  if (claimError) {
    const concurrent = await loadActiveAiRun(supabase, positionId);
    if (concurrent) return { acquired: false as const, activeRun: concurrent };
    throw claimError;
  }
  return { acquired: true as const, runId: id, activeRun: toActiveRun({ id, task, created_at: now }) };
}
