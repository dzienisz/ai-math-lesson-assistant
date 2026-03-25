import Link from "next/link";
import { BookOpen, Upload, BarChart3, Brain, ClipboardList, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-3xl mb-6">
          <BookOpen className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          AI Math Lesson Assistant
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Upload math lesson recordings. Get AI-powered transcription, analysis,
          weakness detection, and personalized homework — automatically.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Lesson
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {[
          {
            icon: Upload,
            title: "Upload",
            desc: "Audio or video lesson recordings up to 500MB",
          },
          {
            icon: Brain,
            title: "Transcribe & Analyze",
            desc: "AI transcription + LLM analysis of understanding",
          },
          {
            icon: Zap,
            title: "Detect Weaknesses",
            desc: "Identify topics the student struggled with",
          },
          {
            icon: ClipboardList,
            title: "Generate Homework",
            desc: "5-10 targeted exercises based on weaknesses",
          },
        ].map((step, i) => (
          <div
            key={i}
            className="bg-white border rounded-xl p-5 text-center"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg mb-3">
              <step.icon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm">{step.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-16">
        Built with Next.js, Supabase, Neon Postgres, Deepgram, and GPT-4 / Claude.
      </p>
    </div>
  );
}
