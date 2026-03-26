"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useEffect, useState } from "react";
import { BookOpen, Upload, LayoutDashboard, LogOut, LogIn, Radio } from "lucide-react";

export function NavBar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setLoggedIn(!!data?.user);
    });
  }, [pathname]);

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
                <Link href="/upload" className={linkClass("/upload")}>
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload</span>
                </Link>
                <Link href="/live-lesson" className={linkClass("/live-lesson")}>
                  <Radio className="w-4 h-4" />
                  <span className="hidden sm:inline">Live</span>
                </Link>
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
