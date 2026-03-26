"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

interface TeacherWithStats {
  id: string;
  user_id: string;
  name: string;
  school_name: string | null;
  email: string;
  lesson_count: number;
  student_count: number;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminTeachersPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add teacher form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSchool, setAddSchool] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit teacher
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithStats | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherWithStats | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch user info
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setUserInfo(data.user))
      .catch(() => {});
  }, []);

  const isAdmin = userInfo?.role === "admin";

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.status === 403) {
        setError("Access denied — admin only");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load teachers");
      const data = await res.json();
      setTeachers(data.teachers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Add teacher
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          name: addName,
          school_name: addSchool || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add teacher");
      }
      setAddName("");
      setAddEmail("");
      setAddSchool("");
      setShowAddForm(false);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add teacher");
    } finally {
      setAddLoading(false);
    }
  };

  // Edit teacher
  const openEdit = (t: TeacherWithStats) => {
    setEditingTeacher(t);
    setEditName(t.name);
    setEditSchool(t.school_name || "");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setEditLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          school_name: editSchool || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update teacher");
      }
      setEditingTeacher(null);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete teacher
  const handleDelete = async () => {
    if (!deletingTeacher) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${deletingTeacher.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove teacher");
      }
      setDeletingTeacher(null);
      fetchTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove teacher");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Guard: non-admin
  if (userInfo && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Shield className="w-12 h-12 mx-auto mb-4 text-red-300" />
        <p className="text-lg font-medium text-gray-700">Admin access required</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Manage Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <Shield className="w-3 h-3" /> Admin
            </span>
            {teachers.length} teacher{teachers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
          <button
            onClick={fetchTeachers}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-lg px-3 py-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Add Teacher Form */}
      {showAddForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-emerald-800 mb-3">Add a Teacher</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
                placeholder="Teacher name"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                placeholder="Teacher email"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                value={addSchool}
                onChange={(e) => setAddSchool(e.target.value)}
                placeholder="School name (optional)"
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                {addLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Teacher
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Teacher</h2>
              <button onClick={() => setEditingTeacher(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-sm text-gray-500">{editingTeacher.email}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTeacher && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-700">Remove Teacher</h2>
              <button onClick={() => setDeletingTeacher(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Are you sure you want to remove <strong>{deletingTeacher.name}</strong> ({deletingTeacher.email})?
            </p>
            <p className="text-xs text-red-600 mb-4">
              This will also delete their {deletingTeacher.student_count} student{deletingTeacher.student_count !== 1 ? "s" : ""} and{" "}
              {deletingTeacher.lesson_count} lesson{deletingTeacher.lesson_count !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove Teacher
              </button>
              <button
                onClick={() => setDeletingTeacher(null)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-6 border border-red-200">
          {error}
        </div>
      )}

      {/* Teachers list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No teachers yet</p>
          <p className="text-sm mt-1">Add your first teacher to get started.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-2 bg-blue-50">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{teacher.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {teacher.email}
                    {teacher.school_name && (
                      <span className="ml-2 text-gray-400">· {teacher.school_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {teacher.student_count} student{teacher.student_count !== 1 ? "s" : ""}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {teacher.lesson_count} lesson{teacher.lesson_count !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(teacher)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit teacher"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingTeacher(teacher)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove teacher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
