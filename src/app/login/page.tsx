"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { BookOpen, Mail, Lock, Loader2, User as UserIcon, GraduationCap } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Invite state
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteStudentName, setInviteStudentName] = useState("");

  // Verify invite token on mount
  useEffect(() => {
    if (!inviteToken) return;
    setMode("signup");
    fetch(`/api/invitations/verify?token=${inviteToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInviteValid(true);
          setEmail(data.email || "");
          setInviteStudentName(data.studentName || "");
          setName(data.studentName || "");
        } else {
          setInviteValid(false);
          setError("This invitation link is invalid or has expired.");
        }
      })
      .catch(() => {
        setInviteValid(false);
        setError("Failed to verify invitation.");
      });
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "forgot") {
        const { error: err } = await authClient.forgetPassword.emailOtp({ email });
        if (err) throw new Error(err.message || "Failed to send OTP");
        setMessage("Check your email for a one-time code.");
        setMode("reset");
        setLoading(false);
        return;
      }

      if (mode === "reset") {
        const { error: err } = await authClient.emailOtp.resetPassword({ email, otp, password: newPassword });
        if (err) throw new Error(err.message || "Failed to reset password");
        setMessage("Password updated. You can now sign in.");
        setMode("login");
        setOtp("");
        setNewPassword("");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name || email.split("@")[0],
          email,
          password,
        });
        if (signUpError) throw new Error(signUpError.message || "Failed to create account");

        // If signing up via invite, accept the invitation
        if (inviteToken) {
          const acceptRes = await fetch("/api/invitations/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inviteToken }),
          });
          if (!acceptRes.ok) {
            const data = await acceptRes.json();
            throw new Error(data.error || "Failed to accept invitation");
          }
        }

        window.location.href = "/dashboard";
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) throw new Error(signInError.message || "Failed to sign in");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isStudentInvite = inviteToken && inviteValid;

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
            {isStudentInvite
              ? `Welcome, ${inviteStudentName}! Create your student account`
              : mode === "login"
              ? "Sign in to your account"
              : mode === "signup"
              ? "Create a new teacher account"
              : mode === "forgot"
              ? "Enter your email to receive a reset code"
              : "Enter the code from your email"}
          </p>
          {isStudentInvite && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <GraduationCap className="w-3.5 h-3.5" />
              Student Invitation
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

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
                placeholder={isStudentInvite ? "student@email.com" : "teacher@school.edu"}
                disabled={!!isStudentInvite}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {mode === "forgot" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="123456"
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {(mode === "login" || mode === "signup") && (
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
            {mode === "login" && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          )}

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
            ) : mode === "signup" ? (
              "Create Account"
            ) : mode === "forgot" ? (
              "Send Code"
            ) : (
              "Reset Password"
            )}
          </button>

          {(mode === "forgot" || mode === "reset") && (
            <div className="text-center text-sm text-gray-500">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                className="text-blue-600 hover:underline font-medium"
              >
                Back to sign in
              </button>
            </div>
          )}

          {!isStudentInvite && mode !== "forgot" && mode !== "reset" && (
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
          )}
        </form>
      </div>
    </div>
  );
}
