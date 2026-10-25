import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";

export default function ManageStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("");
  const [className, setClassName] = useState("");
  const [semester, setSemester] = useState(7);
  const [section, setSection] = useState("A");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/students/all");
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Cannot load students");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  async function addStudent(e) {
    if (e) e.preventDefault();
    if (!name || !username) {
      toast.warning("Name and username are required.");
      return;
    }

    try {
      await api.post("/students/add", {
        name,
        username,
        department,
        className,
        semester: Number(semester) || 7,
        section: section || "A",
        password: password || "123456",
      });
      toast.success(`Student added successfully (Default password: ${password || "123456"}).`);
      resetForm();
      loadStudents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error adding student");
    }
  }

  async function updateStudent(e) {
    if (e) e.preventDefault();
    try {
      await api.put(`/students/update/${editing}`, {
        name,
        username,
        department,
        className,
        semester: Number(semester) || 7,
        section: section || "A",
      });
      toast.success("Student details updated successfully.");
      resetForm();
      loadStudents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Cannot update student");
    }
  }

  async function deleteStudent(id) {
    if (!window.confirm("Are you sure you want to delete this student? All related records will be permanently removed.")) return;
    try {
      await api.delete(`/students/delete/${id}`);
      toast.success("Student removed successfully.");
      loadStudents();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Cannot delete student");
    }
  }

  async function resetStudentPassword(student) {
    const newPass = window.prompt(`Enter new password for student ${student.name} (@${student.username}):`, "123456");
    if (!newPass) return;
    if (newPass.length < 6) {
      toast.warning("Password must be at least 6 characters long.");
      return;
    }

    try {
      await api.post(`/students/reset-password/${student.id}`, { password: newPass });
      toast.success(`Password for @${student.username} updated to: ${newPass}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to reset student password");
    }
  }

  function startEdit(s) {
    setEditing(s.id);
    setName(s.name);
    setUsername(s.username);
    setDepartment(s.department || "");
    setClassName(s.className || "");
    setSemester(s.semester || 7);
    setSection(s.section || "A");
    setPassword("");
  }

  function resetForm() {
    setName("");
    setUsername("");
    setDepartment("");
    setClassName("");
    setSemester(7);
    setSection("A");
    setPassword("");
    setEditing(null);
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Student Directory & Accounts"
          subtitle="Provision, update, and manage student institutional credentials, class assignments, and passwords."
          icon="users"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Manage Students" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
                {students.length} Enrolled
              </span>
            </div>
          }
        />

        {/* Add/Edit Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name={editing ? "refresh" : "plus"} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{editing ? "Edit Student Details" : "Enroll New Student"}</span>
          </h2>

          <form onSubmit={editing ? updateStudent : addStudent}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alan Turing"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Username / USN *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1BY21CS001"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Semester
                </label>
                <select
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Section
                </label>
                <select
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  {["A", "B", "C", "D"].map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Class Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7B"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              {!editing && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Initial Password (Default: 123456)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
              >
                <Icon name="checkCircle" className="w-4 h-4 text-indigo-200" />
                <span>{editing ? "Save Changes" : "Create Account"}</span>
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 border border-slate-200/80 dark:border-slate-700">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Icon name="search" className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by student name, USN, or department..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Student List */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title="No Students Found"
            description={search ? "Try adjusting your search criteria" : "Add your first student to populate the directory"}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs hover:shadow-md transition p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-sm border border-indigo-100 dark:border-indigo-800/60 flex-shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</h3>
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded font-semibold text-[11px] border border-indigo-100 dark:border-indigo-800/60">
                        Sem {s.semester || 7} • Sec {s.section || "A"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">@{s.username}</span>
                      <span>•</span>
                      <span>ID: #{s.id}</span>
                      {s.department && (
                        <>
                          <span>•</span>
                          <span>{s.department}</span>
                        </>
                      )}
                      {s.className && (
                        <>
                          <span>•</span>
                          <span>{s.className}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => resetStudentPassword(s)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                    title="Reset Student Password"
                  >
                    <Icon name="key" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Reset Pass</span>
                  </button>

                  <button
                    onClick={() => startEdit(s)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium transition border border-indigo-200 dark:border-indigo-800/60"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium transition border border-rose-200 dark:border-rose-800/60"
                    title="Delete Account"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}