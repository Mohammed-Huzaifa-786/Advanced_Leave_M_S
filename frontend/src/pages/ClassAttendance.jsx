import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import EmptyState from "../components/EmptyState";

export default function ClassAttendance() {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState("7");
  const [section, setSection] = useState("B");

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadClassSheet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/attendance/class-sheet?date=${date}&department=${department}&semester=${semester}&section=${section}`
      );
      setRoster(res.data.roster || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load class attendance sheet");
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [date, department, semester, section, toast]);

  useEffect(() => {
    loadClassSheet();
  }, [loadClassSheet]);

  function handleStatusChange(studentId, newStatus) {
    setRoster((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
  }

  function markAllPresent() {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.hasApprovedLeave ? "on_leave" : "present",
      }))
    );
  }

  function markAllAbsent() {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        status: "absent",
      }))
    );
  }

  async function handleSaveAttendance() {
    const records = roster
      .filter((s) => s.status !== null)
      .map((s) => ({ studentId: s.id, status: s.status }));

    if (records.length === 0) {
      toast.warning("Please mark attendance for at least one student before saving.");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/attendance/batch-mark", {
        date,
        records,
      });

      toast.success(res.data.message || `Saved attendance for ${records.length} students.`);
      loadClassSheet();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save class attendance");
    } finally {
      setSaving(false);
    }
  }

  const markedCount = roster.filter((s) => s.status !== null).length;
  const presentCount = roster.filter((s) => s.status === "present").length;
  const absentCount = roster.filter((s) => s.status === "absent").length;
  const leaveCount = roster.filter((s) => s.status === "on_leave").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Class Attendance Register"
          subtitle="Record, review, and batch-save daily attendance for enrolled class cohorts."
          icon="calendar"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Attendance Sheet" },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Link
                to="/attendance"
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs sm:text-sm font-medium transition bg-white dark:bg-slate-800 shadow-xs flex items-center gap-2"
              >
                <Icon name="calendar" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Monthly Calendar</span>
              </Link>
              <button
                onClick={handleSaveAttendance}
                disabled={saving || roster.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                <Icon name="checkCircle" className="w-4 h-4 text-indigo-200" />
                <span>{saving ? "Saving Changes..." : "Save Attendance"}</span>
              </button>
            </div>
          }
        />

        {/* Filter Controls Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Attendance Date
              </label>
              <input
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Future dates restricted</p>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition cursor-pointer"
              >
                <option value="CSE">CSE (Computer Science)</option>
                <option value="ISE">ISE (Information Science)</option>
                <option value="ECE">ECE (Electronics & Comm)</option>
                <option value="AIML">AIML (Artificial Intelligence)</option>
                <option value="All">All Departments</option>
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition cursor-pointer"
              >
                <option value="7">Semester 7 (Final Year)</option>
                <option value="6">Semester 6 (3rd Year)</option>
                <option value="5">Semester 5 (3rd Year)</option>
                <option value="4">Semester 4 (2nd Year)</option>
                <option value="3">Semester 3 (2nd Year)</option>
                <option value="1">Semester 1 (1st Year)</option>
                <option value="All">All Semesters</option>
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition cursor-pointer"
              >
                <option value="B">Section B</option>
                <option value="A">Section A</option>
                <option value="C">Section C</option>
                <option value="All">All Sections</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Batch Controls & Stats Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-xl font-bold text-slate-800 dark:text-white">{roster.length}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Enrolled</p>
            </div>
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</p>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Present</p>
            </div>
            <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-center">
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{absentCount}</p>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Absent</p>
            </div>
            <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center">
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{leaveCount}</p>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">On Leave</p>
            </div>
          </div>

          {/* Batch Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={markAllPresent}
              className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
            >
              <Icon name="checkCircle" className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>
            <button
              onClick={markAllAbsent}
              className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
            >
              <Icon name="xCircle" className="w-3.5 h-3.5" />
              <span>Mark All Absent</span>
            </button>
            <button
              onClick={loadClassSheet}
              className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-600"
            >
              <Icon name="refresh" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Reload</span>
            </button>
          </div>
        </div>

        {/* Roster Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="users" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Student Attendance Roster ({roster.length})</span>
            </h3>
            <span className="text-xs font-medium px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200/60 dark:border-indigo-800">
              {markedCount} / {roster.length} Marked
            </span>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : roster.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon="users"
                title="No students found matching class criteria"
                description='Try selecting "All Departments" or "All Sections" to broaden your cohort roster.'
                actionText="Reload Sheet"
                onAction={loadClassSheet}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-750/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3 w-12">#</th>
                    <th className="px-5 py-3">Student Name & Account</th>
                    <th className="px-5 py-3">Department & Semester</th>
                    <th className="px-5 py-3 text-center">Month Attendance</th>
                    <th className="px-5 py-3 text-center">Leave Status</th>
                    <th className="px-5 py-3 text-center">Attendance Marking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {roster.map((student, idx) => {
                    const isPresent = student.status === "present";
                    const isAbsent = student.status === "absent";
                    const isOnLeave = student.status === "on_leave";

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition ${
                          isOnLeave ? "bg-indigo-50/20 dark:bg-indigo-950/20" : isAbsent ? "bg-rose-50/20 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        {/* Index */}
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Name & Account */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-100 dark:border-indigo-800/60 flex-shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{student.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{student.username}</p>
                            </div>
                          </div>
                        </td>

                        {/* Class & Dept */}
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium border border-transparent dark:border-slate-600">
                            {student.department || "CSE"} • {student.className || "Sem 7"}
                          </span>
                        </td>

                        {/* Month Attendance Rate */}
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              student.monthlyAttendancePct >= 75
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : student.monthlyAttendancePct >= 65
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {student.monthlyAttendancePct}%
                          </span>
                        </td>

                        {/* Leave Details */}
                        <td className="px-5 py-3.5 text-center">
                          {student.hasApprovedLeave ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-medium"
                              title={student.leaveDetails?.reason || "Approved Leave"}
                            >
                              <Icon name="clock" className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>{student.leaveDetails?.leaveType || "Approved Leave"}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                          )}
                        </td>

                        {/* Segmented Toggle for Attendance */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600 gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "present")}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              }`}
                            >
                              <Icon name="checkCircle" className="w-3 h-3" />
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "absent")}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                                isAbsent
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              }`}
                            >
                              <Icon name="xCircle" className="w-3 h-3" />
                              <span>Absent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "on_leave")}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                                isOnLeave
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              }`}
                            >
                              <Icon name="clock" className="w-3 h-3" />
                              <span>Leave</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer with Save Action */}
          {roster.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-750/70 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Total: {roster.length} students</span>
                <span className="mx-2">•</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{presentCount} Present</span>
                <span className="mx-2">•</span>
                <span className="text-rose-700 dark:text-rose-300 font-semibold">{absentCount} Absent</span>
                <span className="mx-2">•</span>
                <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{leaveCount} On Leave</span>
              </div>

              <button
                onClick={handleSaveAttendance}
                disabled={saving || roster.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Icon name="checkCircle" className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Class Attendance"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
