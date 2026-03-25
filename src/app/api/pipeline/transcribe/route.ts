import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { transcribe } from "@/services/ai/transcription";
import { withRetry, triggerNextStep, verifyPipelineSecret } from "@/utils/background";
import type { DBLesson } from "@/types";

export const maxDuration = 300; // 5 min timeout for Vercel

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

    // Update status to transcribing
    await query("UPDATE lessons SET status = $1 WHERE id = $2", [
      "transcribing",
      lessonId,
    ]);

    // Get lesson file URL
    const lesson = await queryOne<DBLesson>(
      "SELECT * FROM lessons WHERE id = $1",
      [lessonId]
    );
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Transcribe with retry
    const result = await withRetry("Transcription", () =>
      transcribe(lesson.file_url)
    );

    if (!result.success || !result.data) {
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["error", result.error ?? "Transcription failed", lessonId]
      );
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Store transcript and update status
    await query(
      "UPDATE lessons SET transcript = $1, status = $2 WHERE id = $3",
      [result.data.transcript, "transcribed", lessonId]
    );

    // Trigger next step: analysis
    await triggerNextStep("/api/pipeline/analyze", { lessonId });

    return NextResponse.json({ success: true, status: "transcribed" });
  } catch (err) {
    console.error("[API] Transcription route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
