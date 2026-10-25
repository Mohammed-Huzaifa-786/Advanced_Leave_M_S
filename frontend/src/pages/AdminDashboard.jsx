import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Icon from "../components/Icons";
import PageHeader from "../components/PageHeader";
import Skeleton from "../components/Skeleton";
import { useToast } from "../context/ToastContext";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalTimetables: 0,
    publishedTimetables: 0,
    draftTimetables: 0,
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setErrorMsg("");
      const [leavesRes, studentsRes, timetablesRes] = await Promise.all([
        api.get("/leave/all"),
        api.get("/students/all"),
        api.get("/timetable/admin/list").catch(() => ({ data: [] })),
      ]);

      const leavesData = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const timetablesData = Array.isArray(timetablesRes.data) ? timetablesRes.data : [];

      setStats({
        totalStudents: studentsData.length,
        pending: leavesData.filter((l) => l.status === "pending").length,
        approved: leavesData.filter((l) => l.status === "approved").length,
        rejected: leavesData.filter((l) => l.status === "rejected").length,
        totalTimetables: timetablesData.length,
        publishedTimetables: timetablesData.filter((t) => t.status === "published").length,
        draftTimetables: timetablesData.filter((t) => t.status === "draft").length,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load dashboard statistics. Please check server connectivity.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedBmsit() {
    try {
      setSeeding(true);
      const initialRes = await api.post("/timetable/admin/seed-bmsit");
      if (initialRes.data.exists) {
        const confirmOverwrite = window.confirm(
          `${initialRes.data.message}\n\nClick OK to update its slots with the BMSIT demo schedule, or Cancel to keep existing data unchanged.`
        );
        if (!confirmOverwrite) {
          setSeeding(false);
          return;
        }
        const overwriteRes = await api.post("/timetable/admin/seed-bmsit", { overwrite: true });
        toast.success(overwriteRes.data.message);
        loadStats();
        return;
      }
      toast.success(initialRes.data.message);
      loadStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to seed BMSIT timetable");
    } finally {
      setSeeding(false);
    }
  }

  const actions = [
    {
      title: "Class Attendance Register",
      tag: "1-Click Roster",
      badgeType: "success",
      desc: "Record attendance for an entire class roster with 1-click presets, approved leave reconciliation, and batch save.",
      icon: "checkCircle",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      path: "/class-attendance",
    },
    {
      title: "Clash-Free Timetable Generator",
      tag: "CSP Engine",
      badgeType: "info",
      desc: "Automated Constraint Satisfaction Problem (CSP) scheduler with hard constraint clash detection and resolution.",
      icon: "sparkles",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      path: "/timetable-generator",
    },
    {
      title: "Timetable Management",
      tag: stats.totalTimetables > 0 ? `${stats.publishedTimetables} Published` : "Branch Schedules",
      badgeType: "info",
      desc: "Manage departmental weekly matrices, assign faculty and room allocations, and export official A4 schedules.",
      icon: "calendar",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      path: "/timetable-management",
    },
    {
      title: "Approve Leave Requests",
      tag: stats.pending > 0 ? `${stats.pending} Pending` : "Reviewed",
      badgeType: stats.pending > 0 ? "warning" : "neutral",
      desc: "Inspect student medical and casual leave applications, review attached certificates, and approve or reject.",
      icon: "fileText",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      path: "/approve-leave",
    },
    {
      title: "Manage Student Directory",
      tag: "Student RBAC",
      badgeType: "neutral",
      desc: "Register new student profiles, assign departments and sections, reset credentials, and review records.",
      icon: "users",
      iconBg: "bg-slate-100 text-slate-700 border-slate-200",
      path: "/manage-students",
    },
    {
      title: "Attendance Calendar",
      tag: "Monthly Audit",
      badgeType: "neutral",
      desc: "Inspect month-by-month student attendance grids, view excused absence flags, and manage daily records.",
      icon: "clock",
      iconBg: "bg-purple-50 text-purple-600 border-purple-100",
      path: "/attendance",
    },
    {
      title: "Institutional Holidays",
      tag: "Academic Calendar",
      badgeType: "neutral",
      desc: "Configure institutional non-working days and official college holidays factored into attendance math.",
      icon: "sun",
      iconBg: "bg-amber-50 text-amber-700 border-amber-200",
      path: "/manage-holidays",
    },
    {
      title: "Audit & Attendance Reports",
      tag: "Analytics",
      badgeType: "info",
      desc: "Generate institution-wide student attendance summaries, overall presence percentages, and leave audit exports.",
      icon: "trendingUp",
      iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      path: "/reports",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-transparent p-4 sm:p-6 lg:p-10 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Standard Page Header */}
        <PageHeader
          title="Administrator Portal"
          subtitle="Manage academic operations, student leaves, clash-free timetables, and college attendance records."
          icon="building"
          badge="Live System"
          badgeType="success"
          breadcrumbs={[
            { label: "Dashboard", path: "/admin" },
            { label: "Overview" },
          ]}
          actions={
            <button
              type="button"
              onClick={loadStats}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <Icon name="refresh" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          }
        />

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-rose-800 dark:text-rose-200 text-sm">
            <div className="flex items-center gap-2.5">
              <Icon name="alertTriangle" className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={loadStats}
              className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-lg text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
          {/* Total Students */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Enrolled</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/80 dark:border-indigo-800/80">
                <Icon name="users" className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="w-20 h-8 mb-2" />
            ) : (
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.totalStudents}</p>
            )}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Active students in directory
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Pending Review</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/80 dark:border-amber-800/80">
                <Icon name="clock" className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="w-20 h-8 mb-2" />
            ) : (
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">{stats.pending}</p>
            )}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {stats.pending > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Requires administrative attention</span>
              ) : (
                <span>All applications reviewed</span>
              )}
            </div>
          </div>

          {/* Approved Leaves */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Approved Leaves</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100/80 dark:border-emerald-800/80">
                <Icon name="checkCircle" className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="w-20 h-8 mb-2" />
            ) : (
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.approved}</p>
            )}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Reconciled with attendance</span>
            </div>
          </div>

          {/* Rejected Leaves */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Denied Requests</span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100/80 dark:border-rose-800/80">
                <Icon name="xCircle" className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <Skeleton className="w-20 h-8 mb-2" />
            ) : (
              <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{stats.rejected}</p>
            )}
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Rejected or canceled leaves</span>
            </div>
          </div>
        </div>

        {/* Timetable Operations & Clash-Free Schedules Highlight Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-indigo-900/50 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                <Icon name="sparkles" className="w-3.5 h-3.5 text-indigo-400" />
                <span>Academic Timetable Engine • CSP Backtracking</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Academic Schedules & Clash-Free Generator
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Automate conflict-free departmental schedules, verify zero faculty or room collisions, enforce practical laboratory consecutive constraints, and publish official timetables for students.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-200 font-semibold">{stats.publishedTimetables} Published Schedules</span>
                </div>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-300">{stats.draftTimetables} Drafts in Progress</span>
                </div>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                  <span className="text-slate-300">{stats.totalTimetables} Total Configured</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/timetable-generator"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-indigo-600/30 flex items-center gap-2"
              >
                <Icon name="sparkles" className="w-4 h-4 text-indigo-200" />
                <span>Clash Generator</span>
              </Link>

              <Link
                to="/timetable-management"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition backdrop-blur-xs flex items-center gap-2 border border-white/10"
              >
                <Icon name="calendar" className="w-4 h-4 text-indigo-300" />
                <span>Manage Matrices</span>
              </Link>

              <button
                type="button"
                onClick={handleSeedBmsit}
                disabled={seeding}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs transition border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
                title="Seed BMSIT 7th Sem Sec B Reference Timetable"
              >
                <Icon name="refresh" className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
                <span>{seeding ? "Seeding..." : "Load Demo Timetable"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Management & Action Grid */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Icon name="building" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Institutional Modules & Operations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a module to manage records or execute schedules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {actions.map((act) => (
            <Link
              key={act.path}
              to={act.path}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${act.iconBg} dark:bg-slate-750 dark:border-slate-600`}>
                    <Icon name={act.icon} className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {act.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  {act.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Access Module</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}