import type { TranscriptionResult } from "@/types";

// ============================================================
// Speech-to-Text Service (Deepgram)
// Swap implementation by changing the transcribe() function body
// ============================================================

const DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen";

function getDeepgramKey(): string {
  const key = process.env.ALEMATMA_DEEPGRAM_API_KEY;
  if (!key) throw new Error("ALEMATMA_DEEPGRAM_API_KEY is not set");
  return key;
}

/**
 * Transcribe an audio/video file from a public URL using Deepgram.
 * Supports: mp3, mp4, wav, webm, ogg, flac, m4a
 */
export async function transcribe(fileUrl: string): Promise<TranscriptionResult> {
  const key = getDeepgramKey();

  const response = await fetch(
    `${DEEPGRAM_API_URL}?model=nova-2&smart_format=true&paragraphs=true&utterances=true&language=en`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: fileUrl }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Deepgram API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error("Deepgram returned no transcription alternatives");
  }

  return {
    transcript: alternative.transcript as string,
    confidence: alternative.confidence as number,
    duration_seconds: data.metadata?.duration ?? 0,
  };
}

// ============================================================
// Alternative: OpenAI Whisper implementation (uncomment to use)
// ============================================================
// export async function transcribeWithWhisper(fileUrl: string): Promise<TranscriptionResult> {
//   const openai = new OpenAI({ apiKey: process.env.ALEMATMA_OPENAI_API_KEY });
//   // Download file, then send to Whisper
//   const fileResponse = await fetch(fileUrl);
//   const blob = await fileResponse.blob();
//   const file = new File([blob], "audio.mp3", { type: blob.type });
//   const result = await openai.audio.transcriptions.create({
//     model: "whisper-1",
//     file,
//   });
//   return {
//     transcript: result.text,
//     confidence: 0.95, // Whisper doesn't return confidence
//     duration_seconds: 0,
//   };
// }
