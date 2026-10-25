import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";

export default function Reports() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [summary, setSummary] = useState({ present: 0, absent: 0, onLeave: 0 });

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await api.get("/students/all");
        setStudents(res.data || []);
      } catch {
        toast.error("Cannot load students data");
      }
    }

    async function loadLeaves() {
      try {
        const res = await api.get("/leave/all");
        setLeaves(res.data || []);
      } catch {
        toast.error("Cannot load leave applications data");
      }
    }

    loadStudents();
    loadLeaves();
  }, [toast]);

  async function loadAttendanceForStudent(studentId) {
    try {
      const res = await api.get(`/attendance/student/${studentId}`);
      setAttendance(res.data || []);

      const presentCount = (res.data || []).filter((a) => a.status === "present").length;
      const absentCount = (res.data || []).filter((a) => a.status === "absent").length;
      const onLeaveCount = (res.data || []).filter((a) => a.status === "on_leave").length;

      setSummary({
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
      });
    } catch {
      toast.error("Cannot load attendance data for student");
    }
  }

  const attendancePercentage =
    summary.present + summary.absent > 0
      ? ((summary.present / (summary.present + summary.absent)) * 100).toFixed(1)
      : 100;

  const currentStudentObj = students.find((s) => String(s.id) === String(selectedStudent));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Institutional Reports & Audit"
          subtitle="Generate cross-sectional attendance rates, leave allocation distributions, and individual compliance logs."
          icon="fileText"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Reports" },
          ]}
          actions={
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-2 print:hidden"
              title="Print Audit Report"
            >
              <Icon name="printer" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Print Audit Report</span>
            </button>
          }
        />

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Enrolled Students
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Active database accounts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60">
              <Icon name="users" className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Leave Request Status
              </p>
              <Icon name="clock" className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2 border border-amber-100 dark:border-amber-800/50">
                <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                  {leaves.filter((l) => l.status === "pending").length}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2 border border-emerald-100 dark:border-emerald-800/50">
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  {leaves.filter((l) => l.status === "approved").length}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Approved</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 rounded-lg p-2 border border-rose-100 dark:border-rose-800/50">
                <p className="text-base font-bold text-rose-700 dark:text-rose-300">
                  {leaves.filter((l) => l.status === "rejected").length}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Rejected</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Audit Scope
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Select any registered student below to audit their attendance record and day-by-day timestamps.
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 ml-3">
              <Icon name="info" className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Student Select Dropdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 border border-slate-200/80 dark:border-slate-700 print:hidden">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Select Student for Individual Audit
          </label>
          <div className="relative max-w-lg">
            <select
              onChange={(e) => {
                const id = e.target.value;
                setSelectedStudent(id);
                if (id) loadAttendanceForStudent(id);
              }}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900 cursor-pointer text-xs sm:text-sm font-medium text-slate-800 dark:text-white"
            >
              <option value="">-- Choose a Student from Directory --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (@{s.username}) {s.department ? `[${s.department}]` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Print Header when student selected */}
        {currentStudentObj && (
          <div className="hidden print:block bg-white border border-slate-300 rounded-xl p-4 text-black">
            <h2 className="text-base font-bold text-slate-900">
              Student Attendance & Leave Audit: {currentStudentObj.name} ({currentStudentObj.username})
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Department: {currentStudentObj.department || "General"} • Cohort: {currentStudentObj.className || `Sem ${currentStudentObj.semester || 7} Sec ${currentStudentObj.section || "A"}`} • Report Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Student-wise Report */}
        {selectedStudent && (
          <div className="space-y-6">
            {/* Attendance Summary Cards */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Attendance Audit Summary
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="text-center p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{summary.present}</p>
                  <p className="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">Days Attended</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Conducted lectures</p>
                </div>

                <div className="text-center p-4 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800/50">
                  <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{summary.absent}</p>
                  <p className="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">Days Missed</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Unexcused absence</p>
                </div>

                <div className="text-center p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                  <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{summary.onLeave}</p>
                  <p className="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">Approved Leaves</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Excused absence</p>
                </div>

                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <p className={`text-2xl font-extrabold ${Number(attendancePercentage) >= 75 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {attendancePercentage}%
                  </p>
                  <p className="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">Compliance Rate</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Mandatory target ≥ 75.0%</p>
                </div>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs overflow-hidden border border-slate-200/80 dark:border-slate-700">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Icon name="calendar" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Detailed Daily Record ({attendance.length})</span>
                </h4>
              </div>

              {attendance.length === 0 ? (
                <EmptyState
                  icon="fileText"
                  title="No Attendance Logs Found"
                  description="No attendance records have been marked for this student yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-center">Status Marking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {attendance.map((a) => {
                        const isPresent = a.status === "present";
                        const isOnLeave = a.status === "on_leave";
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                            <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{a.date}</td>
                            <td className="px-5 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                                  isPresent
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                    : isOnLeave
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                                }`}
                              >
                                <Icon
                                  name={isPresent ? "checkCircle" : isOnLeave ? "clock" : "xCircle"}
                                  className="w-3 h-3"
                                />
                                <span>{isPresent ? "Present" : isOnLeave ? "On Leave (Excused)" : "Absent"}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}