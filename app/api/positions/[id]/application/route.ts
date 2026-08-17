import { createUserSupabase } from "@/lib/supabase";
import { z } from "zod";

const stageSchema = z.enum([
  "interested", "preparing", "applied", "written_test", "interview_1", "interview_2",
  "final_interview", "offer_discussion", "hired", "rejected", "withdrawn",
]);

const updateSchema = z.object({
  stage: stageSchema,
  occurredAt: z.string().datetime().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
  nextEventAt: z.string().datetime().nullable().optional(),
  nextEventType: z.string().trim().max(120).optional(),
  channel: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(160).optional(),
  note: z.string().trim().max(2000).optional(),
});

const tokenFrom = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

async function ownedPosition(request: Request, positionId: string) {
  const supabase = createUserSupabase(tokenFrom(request));
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: Response.json({ error: "请先登录" }, { status: 401 }) };
  const { data: position, error } = await supabase.from("positions").select("id").eq("id", positionId).single();
  if (error || !position) return { error: Response.json({ error: "岗位不存在或无权访问" }, { status: 404 }) };
  return { supabase, user: userData.user };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedPosition(request, id);
    if ("error" in owned) return owned.error;
    const { data, error } = await owned.supabase.from("applications").select("*, application_events(*)").eq("position_id", id).maybeSingle();
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取进度失败" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "求职进度信息无效", details: input.error.flatten() }, { status: 400 });
  try {
    const { id } = await context.params;
    const owned = await ownedPosition(request, id);
    if ("error" in owned) return owned.error;
    const { data: previous } = await owned.supabase.from("applications").select("id,current_stage,applied_at,next_event_at,next_event_type,channel,contact,note").eq("position_id", id).maybeSingle();
    const values = {
      user_id: owned.user.id,
      position_id: id,
      current_stage: input.data.stage,
      applied_at: input.data.appliedAt !== undefined ? input.data.appliedAt : previous?.applied_at ?? null,
      next_event_at: input.data.nextEventAt !== undefined ? input.data.nextEventAt : previous?.next_event_at ?? null,
      next_event_type: input.data.nextEventType !== undefined ? input.data.nextEventType : previous?.next_event_type ?? "",
      channel: input.data.channel !== undefined ? input.data.channel : previous?.channel ?? "",
      contact: input.data.contact !== undefined ? input.data.contact : previous?.contact ?? "",
      note: input.data.note !== undefined ? input.data.note : previous?.note ?? "",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await owned.supabase.from("applications").upsert(values, { onConflict: "position_id" }).select().single();
    if (error) throw error;
    if (!previous || previous.current_stage !== input.data.stage) {
      const { error: eventError } = await owned.supabase.from("application_events").insert({
        user_id: owned.user.id,
        application_id: data.id,
        from_stage: previous?.current_stage ?? null,
        to_stage: input.data.stage,
        occurred_at: input.data.occurredAt,
        note: input.data.note ?? "",
      });
      if (eventError) throw eventError;
    }
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存进度失败" }, { status: 503 });
  }
}
