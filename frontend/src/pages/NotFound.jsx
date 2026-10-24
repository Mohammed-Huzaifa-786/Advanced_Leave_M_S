import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons";
import ThemeToggle from "../components/ThemeToggle";

export default function NotFound() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const homePath = role === "admin" ? "/admin" : role === "student" ? "/student" : "/";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle showLabel />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-6 border border-indigo-100 dark:border-indigo-800 shadow-xs">
          <Icon name="alertTriangle" className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block mb-3">
          Error 404
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          The academic module or page you are trying to access does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2"
          >
            <Icon name="arrowLeft" className="w-4 h-4" />
            Go Back
          </button>

          <Link
            to={homePath}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <Icon name="building" className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
