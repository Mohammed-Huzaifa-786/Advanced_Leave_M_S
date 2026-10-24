import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

export default function StudentProfile() {
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [student, setStudent] = useState(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("");
  const [className, setClassName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const studentId = localStorage.getItem("studentId");
      if (!studentId) {
        toast.error("Student session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const res = await api.get(`/students/${studentId}`);
      setStudent(res.data);
      setName(res.data.name || "");
      setUsername(res.data.username || "");
      setDepartment(res.data.department || "");
      setClassName(res.data.className || "");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Unable to load student profile");
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      const studentId = user?.studentId || localStorage.getItem("studentId");
      await api.put(`/students/update/${studentId}`, {
        name,
        username,
        department,
        className,
      });

      updateUser({ name, username });
      toast.success("Profile details updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Profile update failed");
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters long");
      return;
    }

    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Password change failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Student Profile & Security"
          subtitle="Manage your institutional personal details, department assignments, and authentication password."
          icon="user"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "Profile" },
          ]}
        />

        {loading ? (
          <CardSkeleton count={2} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details Form */}
            <form onSubmit={updateProfile} className="bg-white dark:bg-slate-800 shadow-xs border border-slate-200/80 dark:border-slate-700 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Icon name="user" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Personal Information</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Username / USN</label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Semester / Class</label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Semester 7"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Department</label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. CSE"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full pt-2.5 pb-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                Save Profile Changes
              </button>
            </form>

            {/* Password Change Form */}
            <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-800 shadow-xs border border-slate-200/80 dark:border-slate-700 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Icon name="key" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Security & Password</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Minimum 6 characters recommended with mixed casing or numbers.
              </p>

              <button
                type="submit"
                className="w-full pt-2.5 pb-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
