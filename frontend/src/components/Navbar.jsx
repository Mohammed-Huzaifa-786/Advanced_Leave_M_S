import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icons";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/useAuth";

export default function Navbar({ isMobileMenuOpen, onToggleMobileMenu }) {
  const { role, user, logout } = useAuth();
  const name = user?.name || user?.username || (role === "admin" ? "Administrator" : "Student");

  const handleLogout = () => {
    logout();
    window.location.replace("/");
  };

  const dashboardPath = role === "admin" ? "/admin" : "/student";
  const userInitial = (name || "U").charAt(0).toUpperCase();

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex justify-between items-center sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <Icon name={isMobileMenuOpen ? "x" : "menu"} className="w-5 h-5" />
        </button>

        {/* Institution Brand */}
        <Link to={dashboardPath} className="flex items-center gap-3 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors shrink-0">
            <Icon name="graduationCap" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Academic Portal
              </span>
              <span className="hidden lg:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block mt-0.5">
              Attendance & Timetable System
            </p>
          </div>
        </Link>
      </div>

      {/* User Actions, Theme Toggle & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {role && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {userInitial}
            </div>
            <span className="hidden sm:inline max-w-[120px] sm:max-w-[180px] truncate text-slate-800 dark:text-slate-200">
              {name}
            </span>
            <span
              className={`hidden md:inline px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                role === "admin"
                  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {role}
            </span>
          </div>
        )}

        <Link
          to="/change-password"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition border border-transparent hover:border-indigo-100 dark:hover:border-slate-700 flex items-center gap-1.5"
          title="Security & Password"
          aria-label="Security & Password"
        >
          <Icon name="key" className="w-4 h-4" />
          <span className="hidden md:inline">Password</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-200 dark:hover:border-rose-900 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700 shadow-2xs"
          title="Sign out of account"
        >
          <Icon name="logOut" className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
