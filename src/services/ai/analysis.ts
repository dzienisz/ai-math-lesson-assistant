import type { AnalysisResult } from "@/types";

// ============================================================
// LLM Lesson Analysis Service (OpenAI GPT-4 or Anthropic Claude)
// Swap provider by setting USE_ANTHROPIC=true in env
// ============================================================

const ANALYSIS_PROMPT = `You are an expert math education analyst. Given the transcript of a math lesson between a teacher and student, analyze the lesson and return a JSON object with:

1. "summary": A concise 2-3 paragraph summary of what was covered, teaching approach, and student engagement.
2. "understanding_score": A number 0-100 indicating the student's overall understanding level.
3. "weaknesses": An array of objects { "topic": string, "confidence": number (0-1) } identifying specific math topics the student struggled with. Confidence indicates how certain you are about the weakness.
4. "recommended_topics": An array of strings listing topics the student should review or practice.

Focus on mathematical concepts, common misconceptions, and areas where the student showed confusion or made errors.

Return ONLY valid JSON, no markdown fencing.`;

/**
 * Analyze a lesson transcript using an LLM.
 */
export async function analyzeLesson(transcript: string): Promise<AnalysisResult> {
  const useAnthropic = process.env.USE_ANTHROPIC === "true";

  if (useAnthropic) {
    return analyzeWithClaude(transcript);
  }
  return analyzeWithGPT4(transcript);
}

// ---- OpenAI GPT-4 ----

async function analyzeWithGPT4(transcript: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      {
        role: "user",
        content: `Here is the lesson transcript:\n\n${transcript}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-4 returned empty response");

  return parseAnalysisResponse(content);
}

// ---- Anthropic Claude ----

async function analyzeWithClaude(transcript: string): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `${ANALYSIS_PROMPT}\n\nHere is the lesson transcript:\n\n${transcript}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  return parseAnalysisResponse(textBlock.text);
}

// ---- Response parsing ----

function parseAnalysisResponse(raw: string): AnalysisResult {
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary ?? "",
      understanding_score: Number(parsed.understanding_score) || 0,
      weaknesses: Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses.map((w: { topic?: string; confidence?: number }) => ({
            topic: w.topic ?? "Unknown",
            confidence: Number(w.confidence) || 0.5,
          }))
        : [],
      recommended_topics: Array.isArray(parsed.recommended_topics)
        ? parsed.recommended_topics
        : [],
    };
  } catch (err) {
    throw new Error(
      `Failed to parse LLM analysis response: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
