import React, { useEffect, useState } from "react";
import api from "../api/axios";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendar() {
  const [current, setCurrent] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [holidays, setHolidays] = useState([]);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    loadAttendance();
    loadHolidays();
  }, [month]);

  async function loadAttendance() {
    try {
      const studentId = localStorage.getItem("studentId");
      const res = await api.get(`/attendance/${studentId}/${year}/${month + 1}`);
      setAttendance(res.data);
    } catch (err) {
      console.log(err);
    }
  }

  async function loadHolidays() {
    try {
      const res = await api.get("/holidays/all");
      setHolidays(res.data);
    } catch (err) {
      console.log("Holiday error");
    }
  }

  function daysInMonth() {
    return new Date(year, month + 1, 0).getDate();
  }

  async function mark(day, status) {
    try {
      const studentId = localStorage.getItem("studentId"); // Fixed OK ✔

      const date = `${year}-${month + 1}-${day}`;
      await api.post("/attendance/mark", {
        studentId,
        date,
        status,
      });

      setAttendance({ ...attendance, [day]: status });
    } catch (err) {
      alert("Failed to update attendance");
    }
  }

  function isHoliday(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Check if it's a Sunday (day 0)
    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;

    // Check if it's in the holidays list
    const isMarkedHoliday = holidays.some((h) => h.date === dateStr);

    return isSunday || isMarkedHoliday;
  }

  function getHolidayLabel(day) {
    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const isMarkedHoliday = holidays.some((h) => h.date === dateStr);

    if (isSunday && isMarkedHoliday) return "Sunday + Holiday";
    if (isSunday) return "Sunday";
    return "Holiday";
  }

  const totalDays = daysInMonth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium mb-4 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
        </div>
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl text-center md:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center shadow-skyblue gap-3">
            Attendance Calendar
            <span className="text-4xl">📅</span>
          </h1>
          <p className="text-gray-600 text-center">Track and manage your daily attendance</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border border-gray-100">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <button
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Previous
              </span>
            </button>

            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {current.toLocaleString("en-us", { month: "long" })} {year}
            </h2>

            <button
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                Next
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-3 md:gap-4">
            {/* Day Headers */}
            {days.map((d) => (
              <div
                key={d}
                className={`text-center py-3 font-bold text-sm md:text-base rounded-lg ${d === "Sun"
                    ? "text-red-700 bg-red-50"
                    : "text-indigo-700 bg-indigo-50"
                  }`}
              >
                {d}
              </div>
            ))}

            {/* Empty Cells for Month Start Alignment */}
            {Array.from({ length: new Date(year, month, 1).getDay() }).map(
              (_, i) => <div key={`empty-${i}`}></div>
            )}

            {/* Calendar Day Cells */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const today = attendance[day] || "";
              const holiday = isHoliday(day);
              const holidayLabel = getHolidayLabel(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={day}
                  className={`
                    relative overflow-hidden rounded-2xl p-3 md:p-4 
                    border-2 transition-all duration-300
                    min-h-[120px] md:min-h-[140px]
                    ${holiday
                      ? "bg-gradient-to-br from-amber-100 to-yellow-200 border-amber-300 shadow-md"
                      : "bg-white border-gray-200 hover:border-indigo-400 hover:shadow-xl"
                    }
                    ${isToday ? "ring-4 ring-indigo-500 ring-offset-2 scale-105" : ""}
                  `}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`
                      text-lg md:text-xl font-bold
                      ${isToday ? "text-indigo-600" : holiday ? "text-amber-800" : "text-gray-700"}
                    `}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] rounded-full font-semibold">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Holiday or Attendance Buttons */}
                  {holiday ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-3xl mb-2">
                        {holidayLabel === "Sunday" ? "☀️" : "🎉"}
                      </span>
                      <p className="text-sm font-bold text-amber-800">{holidayLabel}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        className={`
                          relative overflow-hidden py-2 px-3 rounded-xl text-xs md:text-sm font-semibold
                          transition-all duration-300 transform hover:scale-105 active:scale-95
                          ${today === "present"
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-200"
                            : "bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-200 hover:border-green-400"
                          }
                        `}
                        onClick={() => mark(day, "present")}
                      >
                        <span className="flex items-center justify-center gap-1">
                          {today === "present" ? "✓" : "○"} Present
                        </span>
                      </button>

                      <button
                        className={`
                          relative overflow-hidden py-2 px-3 rounded-xl text-xs md:text-sm font-semibold
                          transition-all duration-300 transform hover:scale-105 active:scale-95
                          ${today === "absent"
                            ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-red-200"
                            : "bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-200 hover:border-red-400"
                          }
                        `}
                        onClick={() => mark(day, "absent")}
                      >
                        <span className="flex items-center justify-center gap-1">
                          {today === "absent" ? "✗" : "○"} Absent
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Statistics Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {Object.values(attendance).filter((s) => s === "present").length}
                </p>
                <p className="text-sm text-green-600 font-medium">Present</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {Object.values(attendance).filter((s) => s === "absent").length}
                </p>
                <p className="text-sm text-red-600 font-medium">Absent</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {Array.from({ length: totalDays }).filter((_, i) => {
                    const day = i + 1;
                    return isHoliday(day);
                  }).length}
                </p>
                <p className="text-sm text-amber-600 font-medium">Holidays</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {Math.round(
                    (Object.values(attendance).filter((s) => s === "present").length /
                      Math.max(Object.values(attendance).length, 1)) *
                    100
                  )}%
                </p>
                <p className="text-sm text-indigo-600 font-medium">Attendance Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
