import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
        role,
      });

      // Atomically update React state and localStorage in AuthContext
      login(res.data);

      toast.success(`Signed in successfully as ${res.data.role === "admin" ? "Administrator" : "Student"}!`);

      const destination = res.data.role === "admin" ? "/admin" : "/student";
      navigate(destination, { replace: true });
    } catch (err) {
      if (!err.response || err.response.status >= 500) {
        console.error("Login request failed:", err);
      } else {
        console.warn("Login request rejected:", err.response?.data?.message || err.message);
      }
      if (err.response?.status === 403) {
        const errorMsg = err.response?.data?.message || "This account belongs to a different portal. Please select the correct account type.";
        setError(errorMsg);
        toast.error(errorMsg);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        toast.error(err.response.data.message);
      } else if (err.message === "Network Error" || !err.response) {
        const errorMsg = "Unable to connect to the backend server. Please check your connection.";
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        const errorMsg = err.message || "Authentication failed. Please verify your credentials.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
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
            <Icon name="graduationCap" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Sign in to Portal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Access your academic attendance and leave dashboard</p>
        </div>

        {/* Error Alert */}
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

        <form onSubmit={submit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Username or USN
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="user" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                placeholder="e.g. admin or student USN"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="key" className="w-4 h-4" />
              </span>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition"
                placeholder="Enter password"
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

          {/* Role Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Account Role
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-400">
                Select the portal that matches your account.
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="shield" className="w-4 h-4" />
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-8 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 transition cursor-pointer appearance-none"
              >
                <option value="student">Student Portal</option>
                <option value="admin">Admin Portal</option>
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="chevronDown" className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <Icon name="chevronRight" className="w-4 h-4 text-indigo-200" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Auto-Fill */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Demo Credentials
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">click to auto-fill</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setUsername("King");
                setPassword("King@123");
                setRole("student");
                setError("");
              }}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
            >
              <div className="font-bold text-slate-800 dark:text-white">Student</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">King / King@123</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername("Admin");
                setPassword("Admin@123");
                setRole("admin");
                setError("");
              }}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
            >
              <div className="font-bold text-slate-800 dark:text-white">Admin</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Admin / Admin@123</div>
            </button>
          </div>
        </div>

        {/* Action Links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline">
            Register Account
          </Link>
          <Link to="/forgot-password" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:underline">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}