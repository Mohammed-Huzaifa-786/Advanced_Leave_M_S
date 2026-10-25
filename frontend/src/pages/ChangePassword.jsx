import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useToast } from "../context/ToastContext";

export default function ChangePassword() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const role = localStorage.getItem("role");

  const submit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.warning("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Session expired. Please log in again.");
        setTimeout(() => navigate("/"), 1500);
        return;
      }

      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully! Redirecting...");

      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/student");
        }
      }, 1000);
    } catch (err) {
      console.error("Change password error:", err.response?.data);
      toast.error(err.response?.data?.message || "Failed to update password. Verify your current password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-xl mx-auto space-y-6">
        <PageHeader
          title="Account Security"
          subtitle="Update your authentication credentials and password."
          icon="key"
          breadcrumbs={[
            { label: role === "admin" ? "Admin Portal" : "Student Portal", to: role === "admin" ? "/admin" : "/student" },
            { label: "Change Password" },
          ]}
        />

        <form
          onSubmit={submit}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-700 space-y-4"
        >
          {/* Security Tip Alert */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <Icon name="info" className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Choose a secure password containing at least 6 characters. You will need to use this new credential on your next sign-in.
            </p>
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Current Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon name="key" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-white transition"
                placeholder="Enter current password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium"
              >
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon name="key" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-white transition"
                placeholder="Enter new password (min 6 chars)"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon name="checkCircle" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-white transition"
                placeholder="Re-enter new password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <Link
              to={role === "admin" ? "/admin" : "/student"}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="checkCircle" className="w-4 h-4 text-indigo-200" />
              <span>{isLoading ? "Updating Password..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}