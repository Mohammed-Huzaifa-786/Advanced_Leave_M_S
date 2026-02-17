import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [summary, setSummary] = useState({present: 0, absent: 0});

  useEffect(() => {
    loadStudents();
    loadLeaves();
  }, []);

  async function loadStudents() {
    try {
      const res = await api.get("/students/all");
      setStudents(res.data);
    } catch (err) {
      alert("Cannot load students");
    }
  }

  async function loadLeaves() {
    try {
      const res = await api.get("/leave/all");
      setLeaves(res.data);
    } catch (err) {
      alert("Cannot load leave data");
    }
  }

  async function loadAttendanceForStudent(studentId) {
    try {
      const res = await api.get(`/attendance/student/${studentId}`);
      setAttendance(res.data);

      const presentCount = res.data.filter(a => a.status === "present").length;
      const absentCount = res.data.filter(a => a.status === "absent").length;

      setSummary({
        present: presentCount,
        absent: absentCount
      });

    } catch (err) {
      alert("Cannot load attendance");
    }
  }

  const attendancePercentage = summary.present + summary.absent > 0 
    ? ((summary.present / (summary.present + summary.absent)) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium mb-4 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl text-center font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Reports & Analytics 📊
          </h1>
          <p className="text-gray-600 text-center">View comprehensive reports and student analytics</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-600 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Total Students</h3>
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{students.length}</p>
            <p className="text-sm text-gray-500 mt-2">Registered students</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-600 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Leave Status</h3>
              <span className="text-3xl">📋</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold text-sm">
                  {leaves.filter(l => l.status === "pending").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Approved:</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                  {leaves.filter(l => l.status === "approved").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rejected:</span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold text-sm">
                  {leaves.filter(l => l.status === "rejected").length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-pink-600 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Quick Info</h3>
              <span className="text-3xl">ℹ️</span>
            </div>
            {students.length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <p className="text-gray-600">Select a student below to view detailed attendance reports</p>
            )}
          </div>
        </div>

        {/* Student Select Dropdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            Select Student for Detailed Report
          </h2>

          <div className="relative">
            <select
              onChange={(e) => {
                const id = e.target.value;
                setSelectedStudent(id);
                if (id) loadAttendanceForStudent(id);
              }}
              className="w-full md:max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white appearance-none cursor-pointer"
            >
              <option value="">-- Select Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (@{s.username})
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Student-wise Report */}
        {selectedStudent && (
          <div className="space-y-6">
            {/* Attendance Summary Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Attendance Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {summary.present}
                    </span>
                  </div>
                  <p className="mt-4 font-bold text-lg text-gray-800">Present Days</p>
                  <p className="text-sm text-gray-600">Total attendance</p>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {summary.absent}
                    </span>
                  </div>
                  <p className="mt-4 font-bold text-lg text-gray-800">Absent Days</p>
                  <p className="text-sm text-gray-600">Missed classes</p>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {attendancePercentage}%
                    </span>
                  </div>
                  <p className="mt-4 font-bold text-lg text-gray-800">Attendance Rate</p>
                  <p className="text-sm text-gray-600">Overall percentage</p>
                </div>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <span>📅</span>
                  Attendance Records
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <th className="px-6 py-4 text-left font-semibold">Date</th>
                      <th className="px-6 py-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, index) => (
                      <tr 
                        key={a.id} 
                        className={`border-b border-gray-100 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-purple-50`}
                      >
                        <td className="px-6 py-4 text-gray-800">{a.date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-4 py-1.5 rounded-full font-semibold text-sm ${
                            a.status === "present"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {a.status === "present" ? "✓ Present" : "✗ Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan="2" className="px-6 py-12 text-center">
                          <div className="text-4xl mb-3">📭</div>
                          <p className="text-gray-600">No attendance records found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}