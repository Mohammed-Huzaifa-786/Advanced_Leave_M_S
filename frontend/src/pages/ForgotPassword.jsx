import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { username });
      setStatusMessage(res.data.message || "Password reset request submitted successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Password reset request failed. Please check your username.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle showLabel />
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center text-white shadow-sm shadow-indigo-600/20 mb-1">
            <Icon name="key" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Forgot Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Submit your username to request credential recovery</p>
        </div>

        {statusMessage ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Request Logged</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">{statusMessage}</p>
            <Link
              to="/"
              className="inline-block text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 hover:underline pt-1"
            >
              ← Return to Sign In
            </Link>
          </div>
        ) : errorMessage ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300 space-y-1">
            <p className="font-bold">Request Error</p>
            <p>{errorMessage}</p>
          </div>
        ) : (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <Icon name="info" className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              For campus account security, password resets are processed and audited directly by system administrators.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Username or USN
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon name="user" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium transition"
                placeholder="Enter your registered username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? "Submitting Request..." : "Request Password Reset"}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>Remember your credentials? </span>
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}