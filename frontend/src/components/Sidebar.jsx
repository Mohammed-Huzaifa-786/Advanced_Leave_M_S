import React from "react";
import { NavLink } from "react-router-dom";
import Icon from "./Icons";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ role: propRole, isOpen, onClose }) {
  const { role: authRole } = useAuth();
  const role = propRole || authRole || localStorage.getItem("role");
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors duration-150 ${
      isActive
        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs border-l-3 border-indigo-600"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
    }`;

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-50/95 md:bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-[calc(100vh-60px)] p-4 space-y-6 shrink-0 transition-transform duration-200 ease-out md:static md:translate-x-0 overflow-y-auto ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Mobile Close Header */}
        <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Icon name="graduationCap" className="w-5 h-5 text-indigo-600" />
            <span>Navigation Menu</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {role === "admin" ? (
          <div className="space-y-6">
            {/* Section: Academic Operations */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Academic Operations
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/admin" end>
                  <Icon name="building" className="w-4 h-4" />
                  Dashboard
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/class-attendance">
                  <Icon name="checkCircle" className="w-4 h-4" />
                  Class Attendance
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/timetable-management">
                  <Icon name="calendar" className="w-4 h-4" />
                  Timetable Manager
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/timetable-generator">
                  <Icon name="sparkles" className="w-4 h-4" />
                  Clash-Free Generator
                </NavLink>
              </nav>
            </div>

            {/* Section: Students & Records */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Students & Leaves
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/approve-leave">
                  <Icon name="fileText" className="w-4 h-4" />
                  Approve Leaves
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/manage-students">
                  <Icon name="users" className="w-4 h-4" />
                  Manage Students
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/attendance">
                  <Icon name="clock" className="w-4 h-4" />
                  Attendance Calendar
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/manage-holidays">
                  <Icon name="sun" className="w-4 h-4" />
                  Manage Holidays
                </NavLink>
              </nav>
            </div>

            {/* Section: Institutional Reports */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Analytics & Reports
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/reports">
                  <Icon name="trendingUp" className="w-4 h-4" />
                  Audit Reports
                </NavLink>
              </nav>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section: Academic Hub */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Academic Hub
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/student" end>
                  <Icon name="building" className="w-4 h-4" />
                  Dashboard
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/my-timetable">
                  <Icon name="calendar" className="w-4 h-4" />
                  My Timetable
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/attendance-analytics">
                  <Icon name="trendingUp" className="w-4 h-4" />
                  Attendance Analytics
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/smart-leave-planner">
                  <Icon name="sparkles" className="w-4 h-4" />
                  Smart Leave Planner
                </NavLink>
              </nav>
            </div>

            {/* Section: Leave Management */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Leave Management
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/apply-leave">
                  <Icon name="fileText" className="w-4 h-4" />
                  Apply for Leave
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/leave-history">
                  <Icon name="clock" className="w-4 h-4" />
                  Leave History
                </NavLink>

                <NavLink onClick={handleLinkClick} className={linkClass} to="/attendance">
                  <Icon name="calendar" className="w-4 h-4" />
                  Attendance Calendar
                </NavLink>
              </nav>
            </div>

            {/* Section: Account & Profile */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Account
              </p>
              <nav className="space-y-1">
                <NavLink onClick={handleLinkClick} className={linkClass} to="/profile">
                  <Icon name="user" className="w-4 h-4" />
                  My Profile
                </NavLink>
              </nav>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
