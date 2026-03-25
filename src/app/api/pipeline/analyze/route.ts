import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { analyzeLesson } from "@/services/ai/analysis";
import { withRetry, triggerNextStep, verifyPipelineSecret } from "@/utils/background";
import type { DBLesson } from "@/types";

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
      "analyzing",
      lessonId,
    ]);

    const lesson = await queryOne<DBLesson>(
      "SELECT * FROM lessons WHERE id = $1",
      [lessonId]
    );
    if (!lesson || !lesson.transcript) {
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["error", "No transcript available for analysis", lessonId]
      );
      return NextResponse.json({ error: "No transcript" }, { status: 400 });
    }

    const result = await withRetry("Analysis", () =>
      analyzeLesson(lesson.transcript!)
    );

    if (!result.success || !result.data) {
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["error", result.error ?? "Analysis failed", lessonId]
      );
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const { summary, understanding_score, weaknesses, recommended_topics } =
      result.data;

    // Update lesson with analysis results
    await query(
      `UPDATE lessons
       SET summary = $1, understanding_score = $2, status = $3
       WHERE id = $4`,
      [
        summary + "\n\nRecommended topics: " + recommended_topics.join(", "),
        understanding_score,
        "analyzed",
        lessonId,
      ]
    );

    // Insert weaknesses
    for (const w of weaknesses) {
      await query(
        "INSERT INTO weaknesses (lesson_id, topic, confidence) VALUES ($1, $2, $3)",
        [lessonId, w.topic, w.confidence]
      );
    }

    // Trigger next step: homework generation
    await triggerNextStep("/api/pipeline/homework", { lessonId });

    return NextResponse.json({ success: true, status: "analyzed" });
  } catch (err) {
    console.error("[API] Analysis route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
