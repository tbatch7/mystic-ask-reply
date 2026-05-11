import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { QUESTIONS, QUESTION_KEYS, CATEGORIES, type Category } from "./questions";
import { computeOverallScore, levelFromScore } from "./scoring";
import { generateSlug, SLUG_REGEX } from "./slug";

const tokenSchema = z.string().regex(SLUG_REGEX).min(8).max(48);

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { isTest?: boolean }) => z.object({ isTest: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    for (let attempt = 0; attempt < 6; attempt++) {
      const token = generateSlug();
      const { data: row, error } = await supabaseAdmin
        .from("sessions")
        .insert({ sender_id: userId, token, is_test: !!data.isTest })
        .select("id, token")
        .single();
      if (!error && row) return { sessionId: row.id, token: row.token };
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
    }
    throw new Error("Could not generate a unique link, please try again.");
  });

export const getSessionByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("sessions")
      .select("id, token, status, responder_name, is_test, created_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("This link doesn't exist or has been deleted.");
    return row;
  });

const submitSchema = z.object({
  token: tokenSchema,
  responderName: z.string().trim().max(60).optional().nullable(),
    answers: z
    .array(
      z.object({
        question_key: z.string().min(1).max(80),
        value: z.number().int().min(0).max(100),
        skipped: z.boolean(),
        text_answer: z.string().trim().max(2000).optional().nullable(),
      })
    )
    .min(1)
    .max(200),
});

export const submitAnswers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    // Validate question keys
    for (const a of data.answers) {
      if (!QUESTION_KEYS.has(a.question_key)) {
        throw new Error(`Unknown question: ${a.question_key}`);
      }
    }

    const { data: session, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) throw new Error("Session not found.");
    if (session.status !== "pending") throw new Error("This game has already been submitted.");

    const keyToCategory = new Map<string, Category>(QUESTIONS.map((q) => [q.key, q.category]));

    const rows = data.answers.map((a) => ({
      session_id: session.id,
      question_key: a.question_key,
      category: keyToCategory.get(a.question_key) ?? "relationship_secrets",
      value: a.skipped ? 0 : a.value,
      skipped: a.skipped,
      text_answer: a.skipped ? null : (a.text_answer?.trim() || null),
    }));

    const { error: aErr } = await supabaseAdmin.from("answers").insert(rows);
    if (aErr) throw aErr;

    const score = computeOverallScore(rows);
    const level = levelFromScore(score);

    const { error: uErr } = await supabaseAdmin
      .from("sessions")
      .update({
        status: "completed",
        openness_score: score,
        secrets_level: level,
        responder_name: data.responderName?.trim() || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    if (uErr) throw uErr;

    // Per-category breakdown
    const byCat: Record<string, { sum: number; count: number; skipped: number }> = {};
    for (const c of CATEGORIES) byCat[c] = { sum: 0, count: 0, skipped: 0 };
    for (const r of rows) {
      if (r.skipped) byCat[r.category].skipped++;
      else {
        byCat[r.category].sum += r.value;
        byCat[r.category].count++;
      }
    }
    const categoryScores = Object.fromEntries(
      Object.entries(byCat).map(([k, v]) => [
        k,
        { score: v.count ? Math.round(v.sum / v.count) : 0, answered: v.count, skipped: v.skipped },
      ])
    );

    return { sessionId: session.id, score, level, categoryScores };
  });

export const listMySessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("id, token, status, responder_name, openness_score, secrets_level, is_test, created_at, completed_at")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const getMySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", data.id)
      .eq("sender_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!session) throw new Error("Game not found.");
    const { data: answers, error: aErr } = await supabaseAdmin
      .from("answers")
      .select("question_key, category, value, skipped")
      .eq("session_id", data.id);
    if (aErr) throw aErr;
    return { session, answers: answers ?? [] };
  });

export const deleteMySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("id", data.id)
      .eq("sender_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteAllMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("sessions").delete().eq("sender_id", userId);
    if (error) throw error;
    return { ok: true };
  });
