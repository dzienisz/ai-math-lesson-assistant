/**
 * Seed script — populates the database with sample data for testing.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires: DATABASE_URL in .env.local
 */

import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

async function seed() {
  const url = process.env.ALEMATMA_DATABASE_URL;
  if (!url) {
    console.error("❌  ALEMATMA_DATABASE_URL not set. Copy .env.example to .env.local and fill in your Neon connection string.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  console.log("🗄️  Running schema...");
  const schema = readFileSync(join(__dirname, "..", "database", "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("✅  Schema applied.");

  console.log("🌱  Inserting sample data...");

  // Sample user (this ID should match a Supabase Auth user for full flow)
  const SAMPLE_USER_ID = "00000000-0000-0000-0000-000000000001";
  const SAMPLE_TEACHER_ID = "00000000-0000-0000-0000-000000000010";
  const SAMPLE_STUDENT_ID = "00000000-0000-0000-0000-000000000020";
  const SAMPLE_LESSON_ID = "00000000-0000-0000-0000-000000000100";

  // Upsert user
  await pool.query(
    `INSERT INTO users (id, email, role)
     VALUES ($1, 'demo@mathlesson.ai', 'teacher')
     ON CONFLICT (id) DO NOTHING`,
    [SAMPLE_USER_ID]
  );

  // Upsert teacher
  await pool.query(
    `INSERT INTO teachers (id, user_id, name, school_name)
     VALUES ($1, $2, 'Demo Teacher', 'Springfield Elementary')
     ON CONFLICT (user_id) DO NOTHING`,
    [SAMPLE_TEACHER_ID, SAMPLE_USER_ID]
  );

  // Upsert student
  await pool.query(
    `INSERT INTO students (id, teacher_id, name, grade)
     VALUES ($1, $2, 'Alex Johnson', '8th')
     ON CONFLICT DO NOTHING`,
    [SAMPLE_STUDENT_ID, SAMPLE_TEACHER_ID]
  );

  // Sample lesson (status: ready — fully processed)
  await pool.query(
    `INSERT INTO lessons (id, teacher_id, student_id, file_url, transcript, summary, understanding_score, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ready')
     ON CONFLICT (id) DO UPDATE SET
       transcript = EXCLUDED.transcript,
       summary = EXCLUDED.summary,
       understanding_score = EXCLUDED.understanding_score,
       status = EXCLUDED.status`,
    [
      SAMPLE_LESSON_ID,
      SAMPLE_TEACHER_ID,
      SAMPLE_STUDENT_ID,
      "https://example.com/sample-lesson.mp3",
      `Teacher: Okay Alex, today we're going to work on fractions. Can you tell me what one-half plus one-third is?
Student: Um, is it two-fifths?
Teacher: Not quite. Remember, when we add fractions we need a common denominator. What's the least common denominator of 2 and 3?
Student: Six?
Teacher: That's right! So what's one-half written with a denominator of six?
Student: Three-sixths.
Teacher: Perfect. And one-third?
Student: Two-sixths.
Teacher: Great! So what's three-sixths plus two-sixths?
Student: Five-sixths!
Teacher: Excellent! Now let's try something harder. What about two-thirds minus one-fourth?
Student: I'm not sure... do I need to find a common denominator again?
Teacher: Yes! What would it be for 3 and 4?
Student: Twelve?
Teacher: Right. So two-thirds becomes...?
Student: Um... eight-twelfths?
Teacher: That's correct! And one-fourth?
Student: Three-twelfths.
Teacher: So two-thirds minus one-fourth is...?
Student: Five-twelfths!
Teacher: Well done! Let's move on to multiplying fractions now.`,
      `This lesson covered fraction operations with an 8th-grade student. The teacher guided Alex through adding and subtracting fractions with unlike denominators, focusing on finding the least common denominator (LCD).

The student initially made a common error of adding numerators and denominators directly (1/2 + 1/3 = 2/5), which indicates a fundamental misconception about fraction addition. After guidance, the student correctly applied the LCD method for both addition and subtraction.

The teaching approach was effective — using scaffolded questions to guide discovery rather than direct instruction. The student showed improvement during the session but may need more practice with the conceptual understanding of why common denominators are needed.

Recommended topics: Fraction addition with unlike denominators, Fraction subtraction, Visual fraction models, Equivalent fractions`,
      72,
    ]
  );

  // Sample weaknesses
  const weaknesses = [
    { topic: "Adding fractions with unlike denominators", confidence: 0.85 },
    { topic: "Conceptual understanding of common denominators", confidence: 0.7 },
    { topic: "Fraction subtraction", confidence: 0.55 },
  ];

  for (const w of weaknesses) {
    await pool.query(
      `INSERT INTO weaknesses (lesson_id, topic, confidence)
       VALUES ($1, $2, $3)`,
      [SAMPLE_LESSON_ID, w.topic, w.confidence]
    );
  }

  // Sample homework
  const homeworkQuestions = [
    { question: "Calculate: 1/4 + 2/3. Show your work by finding the LCD first.", difficulty: "easy", topic: "Adding fractions with unlike denominators" },
    { question: "Calculate: 3/5 + 1/6. What is the least common denominator?", difficulty: "easy", topic: "Adding fractions with unlike denominators" },
    { question: "Calculate: 5/8 - 1/3. Express your answer in simplest form.", difficulty: "medium", topic: "Fraction subtraction" },
    { question: "Calculate: 7/12 + 2/9. Simplify your answer.", difficulty: "medium", topic: "Adding fractions with unlike denominators" },
    { question: "A recipe calls for 2/3 cup of sugar and 1/4 cup of brown sugar. How much total sugar is needed?", difficulty: "medium", topic: "Adding fractions with unlike denominators" },
    { question: "Explain in your own words why you cannot simply add the numerators and denominators when adding fractions like 1/2 + 1/3.", difficulty: "medium", topic: "Conceptual understanding of common denominators" },
    { question: "Calculate: 11/15 - 3/10. Simplify your answer and show each step.", difficulty: "hard", topic: "Fraction subtraction" },
    { question: "A board is 7/8 of a meter long. You cut off 2/5 of a meter. How long is the remaining piece? Express as a simplified fraction.", difficulty: "hard", topic: "Fraction subtraction" },
  ];

  for (const q of homeworkQuestions) {
    await pool.query(
      `INSERT INTO homework (lesson_id, question, difficulty, topic)
       VALUES ($1, $2, $3, $4)`,
      [SAMPLE_LESSON_ID, q.question, q.difficulty, q.topic]
    );
  }

  console.log("✅  Sample data inserted.");
  console.log("");
  console.log("📋  Sample IDs:");
  console.log(`   User:    ${SAMPLE_USER_ID}`);
  console.log(`   Teacher: ${SAMPLE_TEACHER_ID}`);
  console.log(`   Student: ${SAMPLE_STUDENT_ID}`);
  console.log(`   Lesson:  ${SAMPLE_LESSON_ID}`);
  console.log("");
  console.log("⚠️   Note: The sample user ID won't match your Supabase Auth user.");
  console.log("   After signing up, update the users/teachers records or run the full pipeline via upload.");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed error:", err);
  process.exit(1);
});
