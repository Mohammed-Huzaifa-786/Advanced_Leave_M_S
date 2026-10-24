import React from "react";
import { useTheme } from "../context/ThemeContext";
import Icon from "./Icons";

export default function ThemeToggle({ className = "", showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-xl transition text-xs font-semibold border ${
        isDark
          ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750 hover:border-slate-600 shadow-2xs"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
      } ${className}`}
    >
      <Icon
        name={isDark ? "sun" : "moon"}
        className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-12"
      />
      {showLabel && (
        <span className="hidden sm:inline">{isDark ? "Light Mode" : "Dark Mode"}</span>
      )}
    </button>
  );
}
