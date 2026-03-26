/**
 * Test script — triggers the full pipeline for a lesson.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts [lessonId]
 *
 * If no lessonId is provided, creates a test lesson and runs the pipeline.
 * Requires: ALEMATMA_DATABASE_URL, ALEMATMA_PIPELINE_API_SECRET, and ALEMATMA_APP_URL in .env.local
 */

const APP_URL = process.env.ALEMATMA_APP_URL || "http://localhost:3000";
const SECRET = process.env.ALEMATMA_PIPELINE_API_SECRET || "";

async function triggerStep(step: string, body: Record<string, unknown>) {
  console.log(`\n🔄  Triggering ${step}...`);
  const res = await fetch(`${APP_URL}/api/pipeline/${step}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pipeline-secret": SECRET,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`❌  ${step} failed (${res.status}):`, data);
    return false;
  }
  console.log(`✅  ${step} succeeded:`, data);
  return true;
}

async function testPipeline() {
  const lessonId = process.argv[2];

  if (!lessonId) {
    console.log("Usage: npx tsx scripts/test-pipeline.ts <lessonId>");
    console.log("");
    console.log("To get a lessonId:");
    console.log("1. Run 'npx tsx scripts/seed.ts' to create sample data");
    console.log("2. Use the lesson ID printed by the seed script");
    console.log("3. Or upload a file via the UI and check the API response");
    process.exit(1);
  }

  console.log(`🚀  Testing pipeline for lesson: ${lessonId}`);
  console.log(`📡  App URL: ${APP_URL}`);

  // Step 1: Transcription
  const transcribed = await triggerStep("transcribe", { lessonId });
  if (!transcribed) {
    console.log("\n⚠️   Transcription failed. Check that:");
    console.log("   - ALEMATMA_DEEPGRAM_API_KEY is set");
    console.log("   - The lesson has a valid file_url");
    console.log("   - The dev server is running (npm run dev)");
    return;
  }

  // Wait a moment for DB update
  await new Promise((r) => setTimeout(r, 2000));

  // Step 2: Analysis
  const analyzed = await triggerStep("analyze", { lessonId });
  if (!analyzed) {
    console.log("\n⚠️   Analysis failed. Check that ALEMATMA_OPENAI_API_KEY or ALEMATMA_ANTHROPIC_API_KEY is set.");
    return;
  }

  await new Promise((r) => setTimeout(r, 2000));

  // Step 3: Homework
  const homeworkDone = await triggerStep("homework", { lessonId });
  if (!homeworkDone) {
    console.log("\n⚠️   Homework generation failed.");
    return;
  }

  console.log("\n🎉  Pipeline complete! Check the dashboard to see results.");
}

testPipeline().catch((err) => {
  console.error("❌  Test error:", err);
  process.exit(1);
});
