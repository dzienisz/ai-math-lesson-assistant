// ============================================================
// Recall.ai Meeting Bot Service
// Manages bot lifecycle: create → join → record → retrieve recording
// ============================================================

const RECALL_API_BASE = "https://us-east-1.recall.ai/api/v1";

function getApiKey(): string {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Token ${getApiKey()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

// ---- Create Bot (joins a meeting) ----

interface CreateBotOptions {
  meetingUrl: string;
  botName?: string;
  lessonId: string;
}

interface CreateBotResponse {
  id: string;
  status: { code: string };
}

export async function createBot(
  options: CreateBotOptions
): Promise<CreateBotResponse> {
  const res = await fetch(`${RECALL_API_BASE}/bot/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      meeting_url: options.meetingUrl,
      bot_name: options.botName || "MathLessonAI Recorder",
      recording_config: {
        video_mixed_mp4: {},
      },
      metadata: {
        lesson_id: options.lessonId,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.ai create bot failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ---- Retrieve Bot (get status + recording URL) ----

interface BotRecording {
  id: string;
  status: { code: string };
  media_shortcuts: {
    video_mixed?: {
      data?: { download_url: string };
      format: string;
    };
  };
}

interface RetrieveBotResponse {
  id: string;
  status: { code: string; sub_code: string | null };
  recordings: BotRecording[];
  media_shortcuts: {
    video_mixed?: {
      data?: { download_url: string };
      format: string;
    };
  };
  metadata: Record<string, unknown>;
}

export async function retrieveBot(
  botId: string
): Promise<RetrieveBotResponse> {
  const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.ai retrieve bot failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ---- Stop Bot (leave the call early) ----

export async function stopBot(botId: string): Promise<void> {
  const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/leave_call/`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.ai stop bot failed (${res.status}): ${body}`);
  }
}

// ---- Get Recording URL from a completed bot ----

export async function getRecordingUrl(
  botId: string
): Promise<string | null> {
  const bot = await retrieveBot(botId);

  // Check media_shortcuts first (newer API)
  const shortcut = bot.media_shortcuts?.video_mixed?.data?.download_url;
  if (shortcut) return shortcut;

  // Fall back to recordings array
  for (const rec of bot.recordings) {
    const url = rec.media_shortcuts?.video_mixed?.data?.download_url;
    if (url) return url;
  }

  return null;
}

// ---- Map Recall bot status to our lesson status ----

export function mapRecallStatusToLessonStatus(
  eventCode: string
): string | null {
  const mapping: Record<string, string> = {
    "bot.joining_call": "bot_joining",
    "bot.in_waiting_room": "bot_waiting",
    "bot.in_call_not_recording": "bot_joining",
    "bot.recording_permission_allowed": "bot_recording",
    "bot.in_call_recording": "bot_recording",
    "bot.call_ended": "bot_done",
    "bot.done": "bot_done",
    "bot.fatal": "bot_error",
    "bot.recording_permission_denied": "bot_error",
  };
  return mapping[eventCode] ?? null;
}
