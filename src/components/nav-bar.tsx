"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { BookOpen, Upload, LayoutDashboard, LogOut, LogIn, Radio, Shield, GraduationCap, User, Users } from "lucide-react";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof User }> = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
  teacher: { label: "Teacher", color: "bg-blue-100 text-blue-700", icon: BookOpen },
  student: { label: "Student", color: "bg-purple-100 text-purple-700", icon: GraduationCap },
};

export function NavBar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      const isLoggedIn = !!data?.user;
      setLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        fetch("/api/me")
          .then((r) => r.json())
          .then((d) => setUserInfo(d.user))
          .catch(() => {});
      } else {
        setUserInfo(null);
      }
    });
  }, [pathname]);

  const isStudent = userInfo?.role === "student";
  const isAdmin = userInfo?.role === "admin";

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-blue-100 text-blue-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600">
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">MathLessonAI</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {loggedIn ? (
              <>
                <Link href="/dashboard" className={linkClass("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                {!isStudent && (
                  <>
                    <Link href="/upload" className={linkClass("/upload")}>
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Upload</span>
                    </Link>
                    <Link href="/live-lesson" className={linkClass("/live-lesson")}>
                      <Radio className="w-4 h-4" />
                      <span className="hidden sm:inline">Live</span>
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <Link href="/dashboard/teachers" className={linkClass("/dashboard/teachers")}>
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Teachers</span>
                  </Link>
                )}

                {/* User info */}
                {userInfo && (
                  <div className="hidden sm:flex items-center gap-2 pl-2 ml-2 border-l">
                    {(() => {
                      const cfg = ROLE_CONFIG[userInfo.role];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-gray-500 max-w-[140px] truncate" title={userInfo.email}>
                      {userInfo.name || userInfo.email}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link href="/login" className={linkClass("/login")}>
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
