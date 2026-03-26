"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, Loader2, CheckCircle2, Link as LinkIcon, Radio, GraduationCap } from "lucide-react";

const SUPPORTED_PLATFORMS = [
  { name: "Google Meet", prefix: "https://meet.google.com/", placeholder: "https://meet.google.com/abc-defg-hij" },
  { name: "Zoom", prefix: "https://zoom.us/j/", placeholder: "https://zoom.us/j/1234567890" },
  { name: "Microsoft Teams", prefix: "https://teams.microsoft.com/", placeholder: "https://teams.microsoft.com/l/meetup-join/..." },
];

interface StudentOption {
  id: string;
  name: string;
  grade: string | null;
}

export default function LiveLessonPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <LiveLessonPageInner />
    </Suspense>
  );
}

function LiveLessonPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meetingUrl, setMeetingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Student selection
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(searchParams.get("studentId") || "");
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => setStudents(data.students || []))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/live-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingUrl: meetingUrl.trim(), studentId: selectedStudentId || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start live lesson");
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Live Lesson</h1>
      <p className="text-gray-500 mb-8">
        Paste your Google Meet, Zoom, or Teams link. A recording bot will join
        the call and capture the lesson. When the call ends, the AI pipeline
        runs automatically.
      </p>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-blue-800 text-sm mb-3">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-blue-700">
          {[
            { step: "1", label: "Paste meeting link" },
            { step: "2", label: "Bot joins & records" },
            { step: "3", label: "Call ends → AI analyzes" },
            { step: "4", label: "View results on dashboard" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                {s.step}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleStart} className="space-y-4">
        {/* Student selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <GraduationCap className="w-4 h-4 inline mr-1" />
            Student
          </label>
          {loadingStudents ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading students...</div>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-500">No students yet. <a href="/dashboard" className="text-purple-600 hover:underline">Invite a student first.</a></p>
          ) : (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.grade ? ` (Grade ${s.grade})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meeting Link
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              required
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Supported platforms */}
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_PLATFORMS.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
            >
              <Video className="w-3 h-3" />
              {p.name}
            </span>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 rounded-lg p-4 text-sm border border-green-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Bot is joining the call! Redirecting to dashboard...
          </div>
        )}

        <button
          type="submit"
          disabled={!meetingUrl.trim() || loading || !selectedStudentId}
          className={`
            w-full py-3 px-6 rounded-lg font-medium text-white
            transition-colors duration-200 flex items-center justify-center gap-2
            ${!meetingUrl.trim() || loading || !selectedStudentId
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              Start Live Recording
            </>
          )}
        </button>
      </form>

      {/* Note */}
      <p className="text-xs text-gray-400 mt-6 text-center">
        A &quot;MathLessonAI Recorder&quot; bot will appear as a participant in the call.
        Participants will see it join. The bot leaves automatically when the call ends.
      </p>
    </div>
  );
}
