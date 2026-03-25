import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { generateHomework } from "@/services/ai/homework";
import { withRetry, verifyPipelineSecret } from "@/utils/background";
import type { DBLesson, DBWeakness } from "@/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-pipeline-secret");
    if (!verifyPipelineSecret(secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId required" }, { status: 400 });
    }

    await query("UPDATE lessons SET status = $1 WHERE id = $2", [
      "generating_homework",
      lessonId,
    ]);

    const lesson = await queryOne<DBLesson>(
      "SELECT * FROM lessons WHERE id = $1",
      [lessonId]
    );
    if (!lesson || !lesson.summary) {
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["error", "No summary available for homework generation", lessonId]
      );
      return NextResponse.json({ error: "No summary" }, { status: 400 });
    }

    const weaknesses = await query<DBWeakness>(
      "SELECT * FROM weaknesses WHERE lesson_id = $1",
      [lessonId]
    );

    if (weaknesses.length === 0) {
      // No weaknesses found — mark as ready without homework
      await query("UPDATE lessons SET status = $1 WHERE id = $2", [
        "ready",
        lessonId,
      ]);
      return NextResponse.json({ success: true, status: "ready", homework: 0 });
    }

    const result = await withRetry("Homework Generation", () =>
      generateHomework(weaknesses, lesson.summary!)
    );

    if (!result.success || !result.data) {
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["error", result.error ?? "Homework generation failed", lessonId]
      );
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Insert homework questions
    for (const q of result.data.questions) {
      await query(
        "INSERT INTO homework (lesson_id, question, difficulty, topic) VALUES ($1, $2, $3, $4)",
        [lessonId, q.question, q.difficulty, q.topic]
      );
    }

    // Mark lesson as ready
    await query("UPDATE lessons SET status = $1 WHERE id = $2", [
      "ready",
      lessonId,
    ]);

    return NextResponse.json({
      success: true,
      status: "ready",
      homework: result.data.questions.length,
    });
  } catch (err) {
    console.error("[API] Homework route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
