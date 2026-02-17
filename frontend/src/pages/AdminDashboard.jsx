import React, { useEffect, useState } from "react";
import api from "../api/axios";
import LogoutButton from "../components/LogoutButton";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const leaves = await api.get("/leave/all");
      const students = await api.get("/students/all");

      const data = leaves.data;

      setStats({
        totalStudents: students.data?.length || 0,
        pending: data.filter((l) => l.status === "pending").length,
        approved: data.filter((l) => l.status === "approved").length,
        rejected: data.filter((l) => l.status === "rejected").length,
      });

    } catch (err) {
      console.error(err);
      alert("Error loading dashboard stats");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* Top Right Actions */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <a 
            href="/change-password" 
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Change Password
          </a>
          <LogoutButton />
        </div>

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Admin Dashboard 🏫
          </h1>
          <p className="text-gray-600 text-lg">Manage your institution efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="group bg-white p-6 shadow-lg hover:shadow-2xl rounded-2xl text-center border-l-4 border-blue-600 transform transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Students</h3>
            <p className="text-4xl font-bold text-blue-600 mt-3">{stats.totalStudents}</p>
            <div className="mt-3 text-sm text-gray-500">All registered</div>
          </div>

          <div className="group bg-white p-6 shadow-lg hover:shadow-2xl rounded-2xl text-center border-l-4 border-yellow-500 transform transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Leaves</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-3">{stats.pending}</p>
            <div className="mt-3 text-sm text-gray-500">Awaiting review</div>
          </div>

          <div className="group bg-white p-6 shadow-lg hover:shadow-2xl rounded-2xl text-center border-l-4 border-green-600 transform transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Approved</h3>
            <p className="text-4xl font-bold text-green-600 mt-3">{stats.approved}</p>
            <div className="mt-3 text-sm text-gray-500">Granted leaves</div>
          </div>

          <div className="group bg-white p-6 shadow-lg hover:shadow-2xl rounded-2xl text-center border-l-4 border-red-600 transform transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Rejected</h3>
            <p className="text-4xl font-bold text-red-600 mt-3">{stats.rejected}</p>
            <div className="mt-3 text-sm text-gray-500">Denied requests</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            Quick Actions <span className="text-3xl">⚡</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            <a href="/approve-leave" className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl block text-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative text-xl font-semibold">Approve Leave Requests</div>
            </a>

            <a href="/manage-students" className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl block text-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative text-xl font-semibold">Manage Students</div>
            </a>

            <a href="/manage-holidays" className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl block text-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative text-xl font-semibold">Manage Holidays</div>
            </a>

            <a href="/attendance" className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl block text-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative text-xl font-semibold">Attendance Calendar</div>
            </a>

            <a href="/reports" className="group relative overflow-hidden bg-gradient-to-br from-gray-600 to-gray-800 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl block text-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative text-xl font-semibold">Reports</div>
            </a>

          </div>
        </div>
      </div>
    </div>
  );
}