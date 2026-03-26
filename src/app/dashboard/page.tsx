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
import type { DBLesson, DBWeakness, DBHomework, DBInvitation, DBTeacher, LessonStatus } from "@/types";

interface AdminTeacher extends DBTeacher {
  email: string;
  lesson_count: number;
  student_count: number;
}

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

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [lessons, setLessons] = useState<DBLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<DBLesson | null>(null);
  const [weaknesses, setWeaknesses] = useState<DBWeakness[]>([]);
  const [homework, setHomework] = useState<DBHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite state (teachers)
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStudentName, setInviteStudentName] = useState("");
  const [inviteGrade, setInviteGrade] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<DBInvitation[]>([]);
  const [copied, setCopied] = useState(false);

  // Admin state
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [showTeachers, setShowTeachers] = useState(false);

  // Fetch current user info
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setUserInfo(data.user))
      .catch(() => {});
  }, []);

  const isStudent = userInfo?.role === "student";
  const isAdmin = userInfo?.role === "admin";
  const lessonsEndpoint = isStudent ? "/api/student/lessons" : "/api/lessons";

  // Fetch all lessons
  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch(lessonsEndpoint);
      if (!res.ok) throw new Error("Failed to load lessons");
      const data = await res.json();
      setLessons(data.lessons || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [lessonsEndpoint]);

  // Fetch single lesson detail
  const fetchLessonDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${lessonsEndpoint}?id=${id}`);
      if (!res.ok) throw new Error("Failed to load lesson");
      const data = await res.json();
      setSelectedLesson(data.lesson);
      setWeaknesses(data.weaknesses || []);
      setHomework(data.homework || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setDetailLoading(false);
    }
  }, [lessonsEndpoint]);

  // Fetch invitations (teachers only)
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

  // Fetch teachers (admin only)
  const fetchTeachers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
      }
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Polling for status updates
  useEffect(() => {
    fetchLessons();
    fetchInvitations();
    fetchTeachers();
    const interval = setInterval(fetchLessons, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLessons, fetchInvitations, fetchTeachers]);

  // Refresh detail if selected lesson is processing
  useEffect(() => {
    if (!selectedLesson) return;
    const isProcessing = !["ready", "error"].includes(selectedLesson.status);
    if (!isProcessing) return;

    const interval = setInterval(() => {
      fetchLessonDetail(selectedLesson.id);
    }, POLL_INTERVAL_MS);
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

  // ---- Detail view ----
  if (selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedLesson(null)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to lessons
        </button>

        {detailLoading && !selectedLesson.summary ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Lesson Detail</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Created {new Date(selectedLesson.created_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={selectedLesson.status} />
            </div>

            {/* Error */}
            {selectedLesson.status === "error" && selectedLesson.error_log && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" /> Pipeline Error
                </div>
                <p className="text-sm text-red-600">{selectedLesson.error_log}</p>
              </div>
            )}

            {/* Understanding Score */}
            {selectedLesson.understanding_score !== null && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Understanding Score
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {selectedLesson.understanding_score}
                    <span className="text-lg text-gray-400">/100</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${selectedLesson.understanding_score}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedLesson.summary && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <Brain className="w-4 h-4" /> Summary
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {selectedLesson.summary}
                </div>
              </div>
            )}

            {/* Transcript */}
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

            {/* Weaknesses */}
            {weaknesses.length > 0 && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <AlertCircle className="w-4 h-4" /> Weaknesses Detected
                </h2>
                <div className="space-y-2">
                  {weaknesses.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-2"
                    >
                      <span className="font-medium text-sm">{w.topic}</span>
                      <span className="text-xs text-gray-500">
                        Confidence: {(Number(w.confidence) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Homework */}
            {homework.length > 0 && (
              <div className="bg-white border rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  <ClipboardList className="w-4 h-4" /> Generated Homework ({homework.length} questions)
                </h2>
                <div className="space-y-3">
                  {homework.map((h, idx) => (
                    <div key={h.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          Q{idx + 1} — {h.topic}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            h.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : h.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {h.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {h.question}
                      </p>
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

  // ---- List view ----
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? "Admin Dashboard" : isStudent ? "My Lessons" : "Lessons"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            {isStudent && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <GraduationCap className="w-3 h-3" /> Student
              </span>
            )}
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} across {isAdmin ? "all teachers" : "your account"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowTeachers(!showTeachers)}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-2"
            >
              <Users className="w-4 h-4" /> Teachers ({teachers.length})
            </button>
          )}
          {!isStudent && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-3 py-2"
            >
              <UserPlus className="w-4 h-4" /> Invite Student
            </button>
          )}
          <button
            onClick={fetchLessons}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-lg px-3 py-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Admin Teachers Panel */}
      {showTeachers && isAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> All Teachers
          </h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-red-600">No teachers registered yet.</p>
          ) : (
            <div className="space-y-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {t.lesson_count} lesson{t.lesson_count !== 1 ? "s" : ""}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                      {t.student_count} student{t.student_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Student Form (teachers only) */}
      {showInviteForm && !isStudent && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-purple-800 mb-3">Invite a Student</h2>
          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={inviteStudentName}
                onChange={(e) => setInviteStudentName(e.target.value)}
                required
                placeholder="Student name"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="Student email"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <input
                type="text"
                value={inviteGrade}
                onChange={(e) => setInviteGrade(e.target.value)}
                placeholder="Grade (optional)"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Invite Link
              </button>
              {inviteLink && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 border rounded-lg text-xs bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Existing invitations */}
          {invitations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">
                Sent invitations ({invitations.length})
              </p>
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
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-6 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No lessons yet</p>
          <p className="text-sm mt-1">
            {isStudent
              ? "Your teacher hasn\u2019t assigned any lessons yet."
              : "Upload a lesson recording to get started."}
          </p>
          {!isStudent && (
            <a
              href="/upload"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Upload Lesson
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => fetchLessonDetail(lesson.id)}
              className="w-full text-left bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 ${lesson.source === "live" ? "bg-red-50" : "bg-blue-50"}`}>
                  {lesson.source === "live" ? (
                    <Radio className="w-5 h-5 text-red-600" />
                  ) : (
                    <Upload className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {lesson.source === "live" ? "Live Lesson" : "Uploaded Lesson"}{" "}
                    {new Date(lesson.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(lesson.created_at).toLocaleTimeString()}
                    {lesson.understanding_score !== null &&
                      ` · Score: ${lesson.understanding_score}/100`}
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
