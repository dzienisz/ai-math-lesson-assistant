// ============================================================
// Core types for AI Math Lesson Assistant
// ============================================================

export type UserRole = "teacher" | "student" | "admin";

export type LessonSource = "upload" | "live";

export type LessonStatus =
  | "uploaded"
  | "bot_joining"
  | "bot_waiting"
  | "bot_recording"
  | "bot_done"
  | "bot_error"
  | "transcribing"
  | "transcribed"
  | "analyzing"
  | "analyzed"
  | "generating_homework"
  | "ready"
  | "error";

export type Difficulty = "easy" | "medium" | "hard";

// ---- Database row types ----

export interface DBUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface DBTeacher {
  id: string;
  user_id: string;
  name: string;
  school_name: string | null;
}

export interface DBStudent {
  id: string;
  teacher_id: string;
  name: string;
  grade: string | null;
}

export interface DBLesson {
  id: string;
  teacher_id: string;
  student_id: string | null;
  source: LessonSource;
  meeting_url: string | null;
  recall_bot_id: string | null;
  file_url: string | null;
  transcript: string | null;
  summary: string | null;
  understanding_score: number | null;
  status: LessonStatus;
  error_log: string | null;
  created_at: string;
}

export interface DBWeakness {
  id: string;
  lesson_id: string;
  topic: string;
  confidence: number;
}

export interface DBHomework {
  id: string;
  lesson_id: string;
  question: string;
  difficulty: Difficulty;
  topic: string;
}

// ---- AI service types ----

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration_seconds: number;
}

export interface AnalysisResult {
  summary: string;
  understanding_score: number;
  weaknesses: { topic: string; confidence: number }[];
  recommended_topics: string[];
}

export interface HomeworkQuestion {
  question: string;
  difficulty: Difficulty;
  topic: string;
}

export interface HomeworkResult {
  questions: HomeworkQuestion[];
}

// ---- Pipeline types ----

export interface PipelineStepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Meeting bot types ----

export type RecallBotStatus =
  | "joining_call"
  | "in_waiting_room"
  | "in_call_not_recording"
  | "in_call_recording"
  | "call_ended"
  | "done"
  | "fatal";

export interface RecallBotEvent {
  event: string;
  data: {
    data: {
      code: string;
      sub_code: string | null;
      updated_at: string;
    };
    bot: {
      id: string;
      metadata: Record<string, unknown>;
    };
  };
}

// ---- Future hooks ----

export interface KnowledgeGraphHook {
  updateGraph(lessonId: string, weaknesses: DBWeakness[]): Promise<void>;
}

export interface AITutorHook {
  generateSession(studentId: string, weaknesses: DBWeakness[]): Promise<string>;
}

export interface StudentDashboardHook {
  getRecommendations(studentId: string): Promise<string[]>;
}
