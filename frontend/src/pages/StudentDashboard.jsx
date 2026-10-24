import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import { CardSkeleton } from "../components/Skeleton";

export default function StudentDashboard() {
  const [profile, setProfile] = useState({
    name: localStorage.getItem("username") || "Student",
    username: localStorage.getItem("username") || "",
    department: "",
    className: "",
  });
  const [attendance, setAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [timetableData, setTimetableData] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(true);

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (studentId) {
      api.get(`/students/${studentId}`)
        .then((res) => {
          if (res.data) {
            setProfile({
              name: res.data.name || localStorage.getItem("username") || "Student",
              username: res.data.username || localStorage.getItem("username") || "",
              department: res.data.department || "",
              className: res.data.className || "",
            });
          }
        })
        .catch(() => {});

      api.get("/analytics/subject-attendance")
        .then((res) => {
          if (res.data) {
            setAttendance(res.data);
          }
        })
        .catch((err) => {
          console.error("Attendance fetch error:", err);
        })
        .finally(() => {
          setLoadingAttendance(false);
        });

      api.get("/timetable/my-timetable")
        .then((res) => {
          if (res.data) {
            setTimetableData(res.data);
          }
        })
        .catch((err) => {
          console.error("Timetable fetch error:", err);
        })
        .finally(() => {
          setLoadingTimetable(false);
        });
    } else {
      setLoadingAttendance(false);
      setLoadingTimetable(false);
    }
  }, []);

  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date().getDay()
  ];
  const todaySlots = (timetableData?.days?.[todayName] || []).sort(
    (a, b) => a.periodNumber - b.periodNumber
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Profile / Greeting Banner */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-700 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome, {profile.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                    Student Portal
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {profile.department ? `${profile.department} Department` : "Academic Services"}
                  {profile.className ? ` • Section ${profile.className}` : ""}
                  {profile.username ? ` • USN/ID: ${profile.username}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-medium text-xs sm:text-sm transition bg-white dark:bg-slate-800 shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <Icon name="user" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>My Profile</span>
              </Link>
              <Link
                to="/smart-leave-planner"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <Icon name="sparkles" className="w-4 h-4 text-indigo-100" />
                <span>Smart Leave Planner</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Attendance Health Card */}
        {loadingAttendance ? (
          <CardSkeleton count={1} />
        ) : attendance && (attendance.overall || attendance.summary) ? (() => {
          const stats = attendance.overall || attendance.summary;
          const pct = stats.percentage ?? stats.overallAttendancePercentage ?? 0;
          const conducted = stats.totalConducted ?? 0;
          const present = stats.present ?? stats.totalPresent ?? 0;
          const absent = stats.absent ?? stats.totalAbsent ?? 0;
          const onLeave = stats.onLeave ?? stats.totalOnLeave ?? 0;
          const isSafe = pct >= 75;
          const isWarning = pct >= 65 && pct < 75;

          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-700 transition hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 ${
                    isSafe
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800"
                      : isWarning
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800"
                  }`}>
                    <Icon
                      name={isSafe ? "shield" : "alertTriangle"}
                      className="w-7 h-7"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Overall Attendance Standing: {pct}%
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        isSafe
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : isWarning
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}>
                        {isSafe
                          ? "Compliant (≥ 75%)"
                          : isWarning
                          ? "Warning (< 75%)"
                          : "Critical Shortage"}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {isSafe
                        ? "Your attendance meets statutory institutional requirements. Keep attending to preserve safe margins."
                        : "Your attendance is below the mandatory 75% threshold. Prioritize attending scheduled classes."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/attendance-analytics"
                    className="px-3.5 py-2 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                  >
                    <span>Subject Breakdown</span>
                    <Icon name="chevronRight" className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                  </Link>
                  <Link
                    to="/smart-leave-planner"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-sm transition flex items-center gap-1.5"
                  >
                    <Icon name="sparkles" className="w-4 h-4 text-indigo-200" />
                    <span>Simulate Leaves</span>
                  </Link>
                </div>
              </div>

              {/* Attendance Progress Bar & Summary Stats */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <span>Current Attendance Rate</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Required Target: 75%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isSafe
                        ? "bg-emerald-500"
                        : isWarning
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  ></div>
                  {/* 75% Regulatory Guideline Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-slate-200 z-10 opacity-70"
                    style={{ left: "75%" }}
                    title="75% Regulatory Threshold"
                  ></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <span className="block text-xl font-bold text-slate-800 dark:text-white">{conducted}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Conducted</span>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/60">
                    <span className="block text-xl font-bold text-emerald-700 dark:text-emerald-300">{present}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Present</span>
                  </div>
                  <div className="bg-rose-50/50 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-100 dark:border-rose-800/60">
                    <span className="block text-xl font-bold text-rose-700 dark:text-rose-300">{absent}</span>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Absent</span>
                  </div>
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800/60">
                    <span className="block text-xl font-bold text-indigo-700 dark:text-indigo-300">{onLeave}</span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Approved Leave (Excused)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* TODAY'S CLASS SCHEDULE WIDGET */}
        {loadingTimetable ? (
          <CardSkeleton count={1} />
        ) : timetableData?.hasTimetable ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-700 transition hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60 flex-shrink-0">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Today&rsquo;s Class Schedule • {todayName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {timetableData.timetable?.department || "CSE"} • Sem {timetableData.timetable?.semester || 7} &lsquo;{timetableData.timetable?.section || "A"}&rsquo;
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {todayName === "Sunday"
                      ? "Sunday • Weekly College Closure"
                      : todaySlots.length > 0
                      ? `${todaySlots.length} sessions scheduled today • Academic Year ${timetableData.timetable?.academicYear || "2026-27"}`
                      : "No classes scheduled for today"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/my-timetable"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <Icon name="layoutGrid" className="w-4 h-4 text-indigo-200" />
                  <span>Full Weekly Matrix</span>
                </Link>
              </div>
            </div>

            {/* Today's Period Cards / Timeline */}
            {todayName === "Sunday" ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-2">
                  <Icon name="sun" className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Institutional Holiday (Sunday)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enjoy your weekend break! Regular lectures resume on Monday morning at 08:30 AM.
                </p>
              </div>
            ) : todaySlots.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 mx-auto flex items-center justify-center mb-2">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Classes Scheduled Today</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You have a free day according to your section&rsquo;s official academic timetable.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-5">
                {todaySlots.map((slot, idx) => {
                  const isLab = Boolean(slot.isLab);
                  const isProj =
                    (slot.subject?.code || slot.subjectCode || "").toUpperCase().startsWith("MP") ||
                    (slot.subject?.name || slot.subjectName || "").toLowerCase().includes("project");

                  return (
                    <div
                      key={slot.id || idx}
                      className={`p-3.5 rounded-xl border transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                        isProj
                          ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60"
                          : isLab
                          ? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60"
                          : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                            P{slot.periodNumber} • {slot.startTime || "08:30"} - {slot.endTime || "09:25"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              isProj
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                : isLab
                                ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300"
                                : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300"
                            }`}
                          >
                            {isProj ? "Project" : isLab ? "Lab" : "Theory"}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {slot.subject?.code || slot.subjectCode}: {slot.subject?.name || slot.subjectName}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[120px]" title={slot.faculty?.name || slot.facultyName || "Faculty TBD"}>
                          👤 {slot.faculty?.name || slot.facultyName || "Faculty TBD"}
                        </span>
                        <span className="font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                          📍 {slot.room?.name || slot.roomName || "LH-101"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* Academic Hub - 6 Action Cards */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Icon name="graduationCap" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Academic Services & Management</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Direct Access</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. My Academic Timetable */}
            <Link
              to="/my-timetable"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    My Class Timetable
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">Official</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  View your complete weekly class schedule, lab sessions, assigned faculty, room locations, and print official PDF format.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>View Schedule</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 2. Attendance Analytics */}
            <Link
              to="/attendance-analytics"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icon name="trendingUp" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Attendance Analytics
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">Metrics</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Track subject-wise attendance percentages, safe margin classes to skip, and shortage alerts measured against the 75% threshold.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>View Analytics</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 3. Smart Leave Planner */}
            <Link
              to="/smart-leave-planner"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-amber-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-800/60 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Icon name="sparkles" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Smart Leave Planner
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">Predictive</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Simulate upcoming leave dates, discover affected subject periods, and see projected attendance before submitting an application.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>Launch Planner</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 4. Apply for Leave */}
            <Link
              to="/apply-leave"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800/60 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Icon name="fileText" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Apply for Leave
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">Request</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Submit formal leave applications with date range, leave classification, documented reason, and optional certificate attachments.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Submit Request</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 5. Leave History */}
            <Link
              to="/leave-history"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                  <Icon name="clock" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    Leave History
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">Records</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Monitor status of previous leave submissions, review administrator approval/rejection notes, and inspect submitted documents.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Check History</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 6. Attendance Calendar */}
            <Link
              to="/attendance"
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Attendance Calendar
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">Monthly</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Interactive month-by-month calendar view with daily present and absent markings, college holidays, and weekend indicators.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Open Calendar</span>
                <Icon name="chevronRight" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}