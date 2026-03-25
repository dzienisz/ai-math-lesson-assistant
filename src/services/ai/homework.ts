import type { HomeworkResult, DBWeakness } from "@/types";

// ============================================================
// Homework Generation Service (OpenAI GPT-4)
// Generates 5–10 practice exercises based on detected weaknesses
// ============================================================

const HOMEWORK_PROMPT = `You are an expert math tutor creating homework exercises. Given a list of student weaknesses (topics they struggled with and confidence levels), generate between 5 and 10 practice problems.

Requirements:
- Each problem should target one of the weak topics
- Include a mix of difficulties: easy (warm-up), medium (practice), hard (challenge)
- Problems should be specific, well-formatted math questions
- For lower-confidence weaknesses, include more problems

Return ONLY valid JSON with this structure:
{
  "questions": [
    { "question": "...", "difficulty": "easy|medium|hard", "topic": "..." }
  ]
}

No markdown fencing, just raw JSON.`;

/**
 * Generate homework exercises based on lesson weaknesses.
 */
export async function generateHomework(
  weaknesses: DBWeakness[],
  summary: string
): Promise<HomeworkResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const weaknessDescription = weaknesses
    .map((w) => `- Topic: "${w.topic}" (confidence in weakness: ${w.confidence})`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: HOMEWORK_PROMPT },
      {
        role: "user",
        content: `Lesson summary:\n${summary}\n\nStudent weaknesses:\n${weaknessDescription}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-4 returned empty homework response");

  return parseHomeworkResponse(content);
}

function parseHomeworkResponse(raw: string): HomeworkResult {
  try {
    const parsed = JSON.parse(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    return {
      questions: questions.map(
        (q: { question?: string; difficulty?: string; topic?: string }) => ({
          question: q.question ?? "",
          difficulty: (["easy", "medium", "hard"].includes(q.difficulty ?? "")
            ? q.difficulty
            : "medium") as "easy" | "medium" | "hard",
          topic: q.topic ?? "General",
        })
      ),
    };
  } catch (err) {
    throw new Error(
      `Failed to parse homework response: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
