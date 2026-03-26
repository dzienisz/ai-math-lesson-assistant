"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  FileText,
  Brain,
  ClipboardList,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Radio,
  Upload,
  UserPlus,
  Copy,
  Check,
  GraduationCap,
  Shield,
  Users,
} from "lucide-react";
import type { DBLesson, DBWeakness, DBHomework, DBInvitation, LessonStatus } from "@/types";

const POLL_INTERVAL_MS = 5000;

const STATUS_CONFIG: Record<
  LessonStatus,
  { label: string; color: string; icon: string }
> = {
  uploaded: { label: "Uploaded", color: "bg-gray-200 text-gray-700", icon: "📤" },
  bot_joining: { label: "Bot Joining...", color: "bg-cyan-100 text-cyan-800", icon: "🤖" },
  bot_waiting: { label: "In Waiting Room", color: "bg-cyan-100 text-cyan-800", icon: "⏳" },
  bot_recording: { label: "Recording Live", color: "bg-red-100 text-red-800", icon: "🔴" },
  bot_done: { label: "Call Ended", color: "bg-cyan-100 text-cyan-800", icon: "📞" },
  bot_error: { label: "Bot Error", color: "bg-red-100 text-red-800", icon: "❌" },
  transcribing: { label: "Transcribing...", color: "bg-yellow-100 text-yellow-800", icon: "🎙️" },
  transcribed: { label: "Transcribed", color: "bg-blue-100 text-blue-800", icon: "📝" },
  analyzing: { label: "Analyzing...", color: "bg-purple-100 text-purple-800", icon: "🧠" },
  analyzed: { label: "Analyzed", color: "bg-indigo-100 text-indigo-800", icon: "📊" },
  generating_homework: { label: "Generating Homework...", color: "bg-orange-100 text-orange-800", icon: "✏️" },
  ready: { label: "Ready", color: "bg-green-100 text-green-800", icon: "✅" },
  error: { label: "Error", color: "bg-red-100 text-red-800", icon: "❌" },
};

function StatusBadge({ status }: { status: LessonStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.uploaded;
  const isProcessing = ["bot_joining", "bot_waiting", "bot_recording", "bot_done", "transcribing", "analyzing", "generating_homework"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface StudentWithStats {
  id: string;
  user_id: string | null;
  teacher_id: string;
  name: string;
  grade: string | null;
  teacher_name: string;
  lesson_count: number;
  last_lesson_at: string | null;
  avg_score: number | null;
}

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Students list (teacher/admin main view)
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);

  // Student detail: lessons for selected student
  const [studentLessons, setStudentLessons] = useState<DBLesson[]>([]);
  const [studentWeaknesses, setStudentWeaknesses] = useState<DBWeakness[]>([]);
  const [studentHomework, setStudentHomework] = useState<DBHomework[]>([]);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  // Lesson detail view
  const [selectedLesson, setSelectedLesson] = useState<DBLesson | null>(null);
  const [lessonWeaknesses, setLessonWeaknesses] = useState<DBWeakness[]>([]);
  const [lessonHomework, setLessonHomework] = useState<DBHomework[]>([]);
  const [lessonDetailLoading, setLessonDetailLoading] = useState(false);

  // Student's own lessons (when logged in as student)
  const [myLessons, setMyLessons] = useState<DBLesson[]>([]);

  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStudentName, setInviteStudentName] = useState("");
  const [inviteGrade, setInviteGrade] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<DBInvitation[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch current user info
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setUserInfo(data.user))
      .catch(() => {});
  }, []);

  const isStudent = userInfo?.role === "student";
  const isAdmin = userInfo?.role === "admin";

  // Fetch students list (teacher/admin)
  const fetchStudents = useCallback(async () => {
    if (isStudent) return;
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setStudents(data.students || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  // Fetch student detail (lessons, weaknesses, homework)
  const fetchStudentDetail = useCallback(async (studentId: string) => {
    setStudentDetailLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (!res.ok) throw new Error("Failed to load student");
      const data = await res.json();
      setStudentLessons(data.lessons || []);
      setStudentWeaknesses(data.weaknesses || []);
      setStudentHomework(data.homework || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student");
    } finally {
      setStudentDetailLoading(false);
    }
  }, []);

  // Fetch lesson detail
  const fetchLessonDetail = useCallback(async (lessonId: string) => {
    setLessonDetailLoading(true);
    try {
      const res = await fetch(`/api/lessons?id=${lessonId}`);
      if (!res.ok) throw new Error("Failed to load lesson");
      const data = await res.json();
      setSelectedLesson(data.lesson);
      setLessonWeaknesses(data.weaknesses || []);
      setLessonHomework(data.homework || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLessonDetailLoading(false);
    }
  }, []);

  // Fetch own lessons (student role)
  const fetchMyLessons = useCallback(async () => {
    if (!isStudent) return;
    try {
      const res = await fetch("/api/student/lessons");
      if (!res.ok) throw new Error("Failed to load lessons");
      const data = await res.json();
      setMyLessons(data.lessons || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    if (isStudent) return;
    try {
      const res = await fetch("/api/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch { /* ignore */ }
  }, [isStudent]);

  // Initial data load + polling
  useEffect(() => {
    if (isStudent) {
      fetchMyLessons();
      const interval = setInterval(fetchMyLessons, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    } else {
      fetchStudents();
      fetchInvitations();
      const interval = setInterval(fetchStudents, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [isStudent, fetchStudents, fetchMyLessons, fetchInvitations]);

  // Poll student detail if viewing
  useEffect(() => {
    if (!selectedStudent) return;
    fetchStudentDetail(selectedStudent.id);
    const interval = setInterval(() => fetchStudentDetail(selectedStudent.id), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedStudent, fetchStudentDetail]);

  // Poll lesson detail if processing
  useEffect(() => {
    if (!selectedLesson) return;
    const isProcessing = !["ready", "error"].includes(selectedLesson.status);
    if (!isProcessing) return;
    const interval = setInterval(() => fetchLessonDetail(selectedLesson.id), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedLesson, fetchLessonDetail]);

  // Create invitation
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteLink(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          studentName: inviteStudentName,
          grade: inviteGrade || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create invitation");
      const data = await res.json();
      setInviteLink(data.inviteLink);
      setInviteEmail("");
      setInviteStudentName("");
      setInviteGrade("");
      fetchInvitations();
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openStudent = (s: StudentWithStats) => {
    setSelectedStudent(s);
    setSelectedLesson(null);
  };

  const backToStudents = () => {
    setSelectedStudent(null);
    setSelectedLesson(null);
    setStudentLessons([]);
    setStudentWeaknesses([]);
    setStudentHomework([]);
  };

  const backToStudentDetail = () => {
    setSelectedLesson(null);
    setLessonWeaknesses([]);
    setLessonHomework([]);
  };

  // ====================
  // LESSON DETAIL VIEW (shared by teacher/admin and student)
  // ====================
  if (selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={isStudent ? () => setSelectedLesson(null) : backToStudentDetail}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {isStudent ? "Back to my lessons" : `Back to ${selectedStudent?.name || "student"}`}
        </button>

        {lessonDetailLoading && !selectedLesson.summary ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {selectedLesson.source === "live" ? "Live Lesson" : "Uploaded Lesson"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedLesson.created_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={selectedLesson.status} />
            </div>

            {selectedLesson.status === "error" && selectedLesson.error_log && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" /> Pipeline Error
                </div>
                <p className="text-sm text-red-600">{selectedLesson.error_log}</p>
              </div>
            )}

            {selectedLesson.understanding_score !== null && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Understanding Score</h2>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {selectedLesson.understanding_score}
                    <span className="text-lg text-gray-400">/100</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${selectedLesson.understanding_score}%` }} />
                  </div>
                </div>
              </div>
            )}

            {selectedLesson.summary && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <Brain className="w-4 h-4" /> Summary
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{selectedLesson.summary}</div>
              </div>
            )}

            {selectedLesson.transcript && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <FileText className="w-4 h-4" /> Transcript
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {selectedLesson.transcript}
                </div>
              </div>
            )}

            {lessonWeaknesses.length > 0 && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <AlertCircle className="w-4 h-4" /> Weaknesses Detected
                </h2>
                <div className="space-y-2">
                  {lessonWeaknesses.map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-2">
                      <span className="font-medium text-sm">{w.topic}</span>
                      <span className="text-xs text-gray-500">Confidence: {(Number(w.confidence) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lessonHomework.length > 0 && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <ClipboardList className="w-4 h-4" /> Generated Homework ({lessonHomework.length} questions)
                </h2>
                <div className="space-y-3">
                  {lessonHomework.map((h, idx) => (
                    <div key={h.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">Q{idx + 1} — {h.topic}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.difficulty === "easy" ? "bg-green-100 text-green-700" :
                          h.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{h.difficulty}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{h.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ====================
  // STUDENT DETAIL VIEW (teacher/admin clicks a student)
  // ====================
  if (selectedStudent && !isStudent) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={backToStudents} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to students
        </button>

        {/* Student header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-purple-600" />
              {selectedStudent.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedStudent.grade && <span className="mr-2">Grade {selectedStudent.grade}</span>}
              {isAdmin && <span className="text-xs text-gray-400">Teacher: {selectedStudent.teacher_name}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/upload?studentId=${selectedStudent.id}`}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-2"
            >
              <Upload className="w-4 h-4" /> Upload Lesson
            </a>
            <a
              href={`/live-lesson?studentId=${selectedStudent.id}`}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-2"
            >
              <Radio className="w-4 h-4" /> Live Lesson
            </a>
          </div>
        </div>

        {studentDetailLoading && studentLessons.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{studentLessons.length}</p>
                <p className="text-xs text-gray-500 mt-1">Lessons</p>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{studentWeaknesses.length}</p>
                <p className="text-xs text-gray-500 mt-1">Weaknesses</p>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{studentHomework.length}</p>
                <p className="text-xs text-gray-500 mt-1">Homework Questions</p>
              </div>
            </div>

            {/* Weaknesses summary */}
            {studentWeaknesses.length > 0 && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <AlertCircle className="w-4 h-4" /> All Weaknesses
                </h2>
                <div className="space-y-2">
                  {studentWeaknesses.slice(0, 10).map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-2">
                      <span className="font-medium text-sm">{w.topic}</span>
                      <span className="text-xs text-gray-500">Confidence: {(Number(w.confidence) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {studentWeaknesses.length > 10 && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      +{studentWeaknesses.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Lessons list */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lessons</h2>
              {studentLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No lessons yet for this student.</p>
                  <a
                    href={`/upload?studentId=${selectedStudent.id}`}
                    className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Upload First Lesson
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentLessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => fetchLessonDetail(lesson.id)}
                      className="w-full text-left bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2 ${lesson.source === "live" ? "bg-red-50" : "bg-blue-50"}`}>
                          {lesson.source === "live" ? <Radio className="w-5 h-5 text-red-600" /> : <Upload className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {lesson.source === "live" ? "Live Lesson" : "Uploaded Lesson"}{" "}
                            {new Date(lesson.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(lesson.created_at).toLocaleTimeString()}
                            {lesson.understanding_score !== null && ` · Score: ${lesson.understanding_score}/100`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={lesson.status} />
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====================
  // STUDENT'S OWN VIEW (logged in as student)
  // ====================
  if (isStudent) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Lessons</h1>
            <p className="text-gray-500 text-sm mt-1">
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <GraduationCap className="w-3 h-3" /> Student
              </span>
              {myLessons.length} lesson{myLessons.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={fetchMyLessons} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-lg px-3 py-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-6 border border-red-200">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : myLessons.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No lessons yet</p>
            <p className="text-sm mt-1">Your teacher hasn&apos;t assigned any lessons yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => fetchLessonDetail(lesson.id)}
                className="w-full text-left bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${lesson.source === "live" ? "bg-red-50" : "bg-blue-50"}`}>
                    {lesson.source === "live" ? <Radio className="w-5 h-5 text-red-600" /> : <Upload className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {lesson.source === "live" ? "Live Lesson" : "Uploaded Lesson"}{" "}
                      {new Date(lesson.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(lesson.created_at).toLocaleTimeString()}
                      {lesson.understanding_score !== null && ` · Score: ${lesson.understanding_score}/100`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={lesson.status} />
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ====================
  // TEACHER/ADMIN MAIN VIEW — STUDENTS LIST
  // ====================
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? "Admin Dashboard" : "My Students"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-3 py-2"
          >
            <UserPlus className="w-4 h-4" /> Invite Student
          </button>
          <button
            onClick={fetchStudents}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-lg px-3 py-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Invite Student Form */}
      {showInviteForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-purple-800 mb-3">Invite a Student</h2>
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" value={inviteStudentName} onChange={(e) => setInviteStudentName(e.target.value)} required placeholder="Student name" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="Student email" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              <input type="text" value={inviteGrade} onChange={(e) => setInviteGrade(e.target.value)} placeholder="Grade (optional)" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={inviteLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2">
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Invite Link
              </button>
              {inviteLink && (
                <div className="flex items-center gap-2 flex-1">
                  <input type="text" readOnly value={inviteLink} className="flex-1 px-3 py-2 border rounded-lg text-xs bg-white font-mono" />
                  <button type="button" onClick={copyInviteLink} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </form>

          {invitations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">Sent invitations ({invitations.length})</p>
              <div className="space-y-1">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs text-purple-800 bg-white rounded px-3 py-1.5">
                    <span>{inv.student_name} ({inv.email})</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      inv.status === "accepted" ? "bg-green-100 text-green-700" :
                      inv.status === "expired" ? "bg-gray-100 text-gray-500" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-6 border border-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No students yet</p>
          <p className="text-sm mt-1">Invite your first student to get started.</p>
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <UserPlus className="w-4 h-4" /> Invite Student
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => openStudent(student)}
              className="w-full text-left bg-white border rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-2 bg-purple-50">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{student.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {student.grade && `Grade ${student.grade} · `}
                    {student.lesson_count} lesson{student.lesson_count !== 1 ? "s" : ""}
                    {student.last_lesson_at && ` · Last: ${new Date(student.last_lesson_at).toLocaleDateString()}`}
                    {isAdmin && ` · Teacher: ${student.teacher_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {student.avg_score !== null && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Avg: {student.avg_score}/100
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
