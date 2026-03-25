"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Check your environment variables.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">AI Math Lesson Assistant</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === "login"
              ? "Sign in to your teacher account"
              : "Create a new teacher account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="teacher@school.edu"
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm border border-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm border border-green-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>

          <div className="text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
