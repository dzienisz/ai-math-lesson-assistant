import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import {
  mapRecallStatusToLessonStatus,
  getRecordingUrl,
} from "@/services/meeting/recall";
import { triggerNextStep } from "@/utils/background";
import type { DBLesson, RecallBotEvent } from "@/types";

export async function POST(request: Request) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.ALEMATMA_RECALL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = request.headers.get("x-recall-signature");
      if (sig !== webhookSecret) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event: RecallBotEvent = await request.json();
    const botId = event.data?.bot?.id;
    const eventCode = event.event;

    if (!botId) {
      return NextResponse.json({ error: "Missing bot ID" }, { status: 400 });
    }

    console.log(`[Recall Webhook] ${eventCode} for bot ${botId}`);

    // Find the lesson associated with this bot
    const lesson = await queryOne<DBLesson>(
      "SELECT * FROM lessons WHERE recall_bot_id = $1",
      [botId]
    );

    if (!lesson) {
      console.warn(`[Recall Webhook] No lesson found for bot ${botId}`);
      return NextResponse.json({ ok: true });
    }

    // Map Recall status to our lesson status
    const newStatus = mapRecallStatusToLessonStatus(eventCode);
    if (!newStatus) {
      console.log(`[Recall Webhook] Unmapped event: ${eventCode}`);
      return NextResponse.json({ ok: true });
    }

    // Handle errors
    if (newStatus === "bot_error") {
      const subCode = event.data?.data?.sub_code || "unknown";
      await query(
        "UPDATE lessons SET status = $1, error_log = $2 WHERE id = $3",
        ["bot_error", `Bot error: ${eventCode} (${subCode})`, lesson.id]
      );
      return NextResponse.json({ ok: true, status: "bot_error" });
    }

    // Update lesson status
    await query("UPDATE lessons SET status = $1 WHERE id = $2", [
      newStatus,
      lesson.id,
    ]);

    // When bot is done, get the recording URL and trigger pipeline
    if (newStatus === "bot_done") {
      try {
        const recordingUrl = await getRecordingUrl(botId);

        if (recordingUrl) {
          // Store the recording URL and trigger transcription pipeline
          await query(
            "UPDATE lessons SET file_url = $1, status = 'uploaded' WHERE id = $2",
            [recordingUrl, lesson.id]
          );

          // Trigger the existing transcription pipeline
          await triggerNextStep("/api/pipeline/transcribe", {
            lessonId: lesson.id,
          });

          return NextResponse.json({
            ok: true,
            status: "pipeline_triggered",
          });
        } else {
          await query(
            "UPDATE lessons SET status = 'error', error_log = 'No recording URL available after call ended' WHERE id = $1",
            [lesson.id]
          );
        }
      } catch (err) {
        console.error("[Recall Webhook] Error getting recording:", err);
        await query(
          "UPDATE lessons SET status = 'error', error_log = $1 WHERE id = $2",
          [
            `Failed to get recording: ${err instanceof Error ? err.message : String(err)}`,
            lesson.id,
          ]
        );
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[Recall Webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}
