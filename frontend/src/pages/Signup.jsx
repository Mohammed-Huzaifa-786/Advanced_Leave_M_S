import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";

export default function Signup() {
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [department, setDepartment] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        username,
        password,
        role,
        name,
        className,
        department,
      };

      const res = await api.post("/auth/signup", payload);
      setSuccess(res.data.message || "Account created successfully! Redirecting to sign in...");
      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please verify the provided details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle showLabel />
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 w-full max-w-md space-y-6 my-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center text-white shadow-sm shadow-indigo-600/20 mb-1">
            <Icon name="graduationCap" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create an Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Register for institutional attendance & leave access</p>
        </div>

        {/* Inline Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
            <Icon name="alertTriangle" className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-500 hover:text-rose-700 p-0.5 rounded-lg hover:bg-rose-100 transition"
              aria-label="Dismiss error"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
            <Icon name="checkCircle" className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{success}</div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Account Role
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="shield" className="w-4 h-4" />
              </span>
              <select
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-8 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition cursor-pointer appearance-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="chevronDown" className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="user" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                placeholder="e.g. Alan Turing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Username / USN *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="fileText" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="key" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                placeholder="At least 6 characters"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Student-only fields */}
          {role === "student" && (
            <>
              {/* Class/Semester */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Semester & Section
                </label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                  placeholder="e.g. Sem 7 - Section B"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Department / Branch
                </label>
                <input
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                  placeholder="e.g. CSE / ISE / ECE"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Back to Login */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>Already have an account? </span>
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}