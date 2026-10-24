import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/Toast";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendar() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const myStudentId = localStorage.getItem("studentId");

  const [current, setCurrent] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(myStudentId || "");
  const [loading, setLoading] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();

  // Load students list if admin
  useEffect(() => {
    if (role === "admin") {
      api.get("/students/all")
        .then((res) => {
          setStudents(res.data);
          if (res.data.length > 0 && !selectedStudentId) {
            setSelectedStudentId(String(res.data[0].id));
          }
        })
        .catch((err) => console.error("Error loading students:", err));
    }
  }, [role]);

  useEffect(() => {
    loadHolidays();
  }, []);

  useEffect(() => {
    const activeStudentId = role === "admin" ? selectedStudentId : myStudentId;
    if (activeStudentId) {
      loadAttendance(activeStudentId);
    } else {
      setAttendance({});
    }
  }, [month, year, selectedStudentId, role, myStudentId]);

  async function loadAttendance(id) {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/${id}/${year}/${month + 1}`);
      setAttendance(res.data || {});
    } catch (err) {
      console.error("Attendance error:", err);
      setAttendance({});
    } finally {
      setLoading(false);
    }
  }

  async function loadHolidays() {
    try {
      const res = await api.get("/holidays/all");
      setHolidays(res.data || []);
    } catch (err) {
      console.error("Holiday error:", err);
    }
  }

  function daysInMonth() {
    return new Date(year, month + 1, 0).getDate();
  }

  async function mark(day, status) {
    const activeStudentId = role === "admin" ? selectedStudentId : myStudentId;

    if (!activeStudentId) {
      toast.warning("Please select a student first.");
      return;
    }

    try {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      await api.post("/attendance/mark", {
        studentId: activeStudentId,
        date,
        status,
      });

      setAttendance((prev) => ({ ...prev, [day]: status }));
      toast.success(`Day ${day} marked as ${status}.`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update attendance");
    }
  }

  function isHoliday(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;
    const isMarkedHoliday = holidays.some((h) => h.date === dateStr);

    return isSunday || isMarkedHoliday;
  }

  function getHolidayLabel(day) {
    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isMarkedHoliday = holidays.some((h) => h.date === dateStr);

    if (isSunday && isMarkedHoliday) return "Sunday & Holiday";
    if (isSunday) return "Sunday";
    return "Holiday";
  }

  const totalDays = daysInMonth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Attendance Calendar"
          subtitle={
            role === "admin"
              ? "View and manage daily attendance for the selected student across months."
              : "Official monthly attendance history, marked status, and scheduled institutional holidays."
          }
          icon="calendar"
          breadcrumbs={[
            { label: role === "admin" ? "Admin Portal" : "Student Portal", to: role === "admin" ? "/admin" : "/student" },
            { label: "Attendance Calendar" },
          ]}
          actions={
            role === "admin" ? (
              <Link
                to="/class-attendance"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition flex items-center gap-2"
              >
                <Icon name="users" className="w-4 h-4 text-indigo-200" />
                <span>Class Register</span>
              </Link>
            ) : (
              <Link
                to="/attendance-analytics"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition flex items-center gap-2"
              >
                <Icon name="trendingUp" className="w-4 h-4 text-indigo-200" />
                <span>Subject Analytics</span>
              </Link>
            )
          }
        />

        {/* Admin Student Picker */}
        {role === "admin" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Student for Calendar View
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pick a student to inspect and modify their daily record.</p>
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">-- Select a Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department || "No Dept"} • ID: {s.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Student Informational Banner */}
        {role !== "admin" && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="shield" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold">Institutional Record:</span> Class attendance is submitted by authorized faculty. Approved leaves are recorded as excused absences and factored into your compliance standing.
              </p>
            </div>
            <Link
              to="/attendance-analytics"
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 whitespace-nowrap ml-3"
            >
              View Analytics →
            </Link>
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 sm:p-7 border border-slate-200/80 dark:border-slate-700">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <button
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
            >
              <Icon name="chevronLeft" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Previous</span>
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {current.toLocaleString("en-us", { month: "long" })} {year}
            </h2>

            <button
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
            >
              <span>Next</span>
              <Icon name="chevronRight" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Calendar Grid with Horizontal Scroll Container */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-7 gap-2.5">
                {/* Day Headers */}
                {days.map((d) => (
                  <div
                    key={d}
                    className={`text-center py-2.5 font-semibold text-xs uppercase tracking-wider rounded-xl ${
                      d === "Sun"
                        ? "text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50"
                        : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700"
                    }`}
                  >
                    {d}
                  </div>
                ))}

                {/* Empty Cells for Month Start Offset */}
                {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px]"></div>
                ))}

                {/* Calendar Day Cells */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const status = attendance[day] || "";
                  const holiday = isHoliday(day);
                  const holidayLabel = getHolidayLabel(day);

                  const cellDate = new Date(year, month, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const todayDate = new Date();
                  todayDate.setHours(0, 0, 0, 0);

                  const isToday = cellDate.getTime() === todayDate.getTime();
                  const isFuture = cellDate.getTime() > todayDate.getTime();

                  return (
                    <div
                      key={day}
                      className={`
                        relative rounded-xl p-3 border transition flex flex-col justify-between min-h-[110px]
                        ${
                          holiday
                            ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60"
                            : isFuture
                            ? "bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                            : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-xs"
                        }
                        ${isToday ? "ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-800" : ""}
                      `}
                    >
                      {/* Day Number */}
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-sm font-bold ${
                            isToday
                              ? "text-indigo-600 dark:text-indigo-400"
                              : holiday
                              ? "text-amber-800 dark:text-amber-300"
                              : isFuture
                              ? "text-slate-400 dark:text-slate-500"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {day}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Holiday Display */}
                      {holiday ? (
                        <div className="flex flex-col items-center justify-center py-2 text-center">
                          <Icon name="calendar" className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-0.5" />
                          <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-tight">
                            {holidayLabel}
                          </p>
                        </div>
                      ) : role !== "admin" ? (
                        /* Student View: Read-Only Badges */
                        <div className="flex flex-col items-center justify-center py-2">
                          {status === "present" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Icon name="checkCircle" className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Present</span>
                            </span>
                          ) : status === "absent" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <Icon name="xCircle" className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>Absent</span>
                            </span>
                          ) : status === "on_leave" ? (
                            <div className="text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Icon name="clock" className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                <span>Leave</span>
                              </span>
                              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">Excused</p>
                            </div>
                          ) : isFuture ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">— Upcoming</span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                          )}
                        </div>
                      ) : (
                        /* Admin View: Controls for Past/Today, Locked for Future */
                        isFuture ? (
                          <div className="flex flex-col items-center justify-center py-2 text-center text-slate-400 dark:text-slate-500">
                            <span className="text-xs font-medium">Future Date</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 mt-2">
                            {status === "on_leave" && (
                              <div className="text-center mb-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  Approved Leave
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => mark(day, "present")}
                              className={`py-1 px-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 ${
                                status === "present"
                                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                  : "bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-600"
                              }`}
                            >
                              <Icon name="checkCircle" className="w-3 h-3" />
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => mark(day, "absent")}
                              className={`py-1 px-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 ${
                                status === "absent"
                                  ? "bg-rose-600 text-white font-semibold shadow-xs"
                                  : "bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-600"
                              }`}
                            >
                              <Icon name="xCircle" className="w-3 h-3" />
                              <span>Absent</span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Statistics Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
            {(() => {
              const presentCount = Object.values(attendance).filter((s) => s === "present").length;
              const absentCount = Object.values(attendance).filter((s) => s === "absent").length;
              const onLeaveCount = Object.values(attendance).filter((s) => s === "on_leave").length;
              const totalActive = presentCount + absentCount;
              const rate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 100;
              const holidayCount = Array.from({ length: totalDays }).filter((_, i) => isHoliday(i + 1)).length;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-750/70 rounded-xl p-3.5 text-center border border-slate-200/80 dark:border-slate-700">
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Present Days</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-750/70 rounded-xl p-3.5 text-center border border-slate-200/80 dark:border-slate-700">
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{absentCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Absent Days</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-750/70 rounded-xl p-3.5 text-center border border-slate-200/80 dark:border-slate-700">
                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{onLeaveCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Excused Leaves</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-750/70 rounded-xl p-3.5 text-center border border-slate-200/80 dark:border-slate-700">
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{holidayCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Holidays & Sundays</p>
                  </div>

                  <div className={`col-span-2 sm:col-span-1 rounded-xl p-3.5 text-center border ${
                    rate >= 75
                      ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                  }`}>
                    <p className={`text-xl font-bold ${rate >= 75 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                      {rate}%
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      {rate >= 75 ? "Compliant Standing" : "Shortage Warning"}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
