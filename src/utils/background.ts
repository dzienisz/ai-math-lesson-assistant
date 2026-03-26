import type { PipelineStepResult } from "@/types";

// ============================================================
// Async Pipeline Helper with Retry + Exponential Backoff
// ============================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

/**
 * Execute a pipeline step with retry logic and exponential backoff.
 */
export async function withRetry<T>(
  stepName: string,
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<PipelineStepResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[Pipeline] ${stepName} attempt ${attempt + 1}/${retries + 1} failed:`,
        lastError.message
      );

      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[Pipeline] Retrying ${stepName} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: `${stepName} failed after ${retries + 1} attempts: ${lastError?.message}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire-and-forget: trigger a pipeline API route without awaiting completion.
 * Used to chain pipeline steps from API routes.
 */
export async function triggerNextStep(
  stepUrl: string,
  body: Record<string, unknown>
): Promise<void> {
  const appUrl = process.env.ALEMATMA_APP_URL || "http://localhost:3000";
  const secret = process.env.ALEMATMA_PIPELINE_API_SECRET;

  try {
    // Fire and forget — don't await the full response
    fetch(`${appUrl}${stepUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-pipeline-secret": secret } : {}),
      },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error(`[Pipeline] Failed to trigger ${stepUrl}:`, err);
    });
  } catch (err) {
    console.error(`[Pipeline] Failed to trigger ${stepUrl}:`, err);
  }
}

/**
 * Verify the pipeline API secret from request headers.
 */
export function verifyPipelineSecret(headerSecret: string | null): boolean {
  const expected = process.env.ALEMATMA_PIPELINE_API_SECRET;
  if (!expected) return true; // No secret configured = allow all (dev mode)
  return headerSecret === expected;
}
