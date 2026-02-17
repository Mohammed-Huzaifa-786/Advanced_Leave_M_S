import React from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

export default function StudentDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 relative overflow-hidden">

      {/* 🌟 Animated Background Blobs - Premium Effect */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-0 left-20 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="relative z-10">

        {/* Top Right Actions - Enhanced */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <a
            href="/change-password"
            className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center gap-2">
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Change Password
            </span>
          </a>
          <LogoutButton />
        </div>

        {/* 💎 TOP BAR - Glassmorphism Enhanced */}
        <div className="flex justify-between items-center mb-12 bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-300">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 animate-pulse">
              Welcome Student 🎓
            </h1>
            <p className="text-gray-600 font-medium">Manage your academic journey</p>
          </div>
        </div>

        {/* MAIN CONTENT CENTERED */}
        <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto">

          {/* 🎯 Apply Leave Button - Premium */}
          <button
            onClick={() => navigate("/apply-leave")}
            className="w-full max-w-xl group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-10 py-6 rounded-3xl shadow-2xl hover:shadow-blue-500/50 transform hover:-translate-y-2 hover:scale-105 transition-all duration-500 font-bold text-lg"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
            </div>

            <span className="relative flex items-center justify-center gap-4">
              <svg className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Apply Leave
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          {/* 📊 Leave History Button - Dark Premium */}
          <button
            onClick={() => navigate("/leave-history")}
            className="w-full max-w-xl group relative overflow-hidden bg-gradient-to-r from-slate-700 via-slate-800 to-gray-900 text-white px-10 py-6 rounded-3xl shadow-2xl hover:shadow-slate-500/50 transform hover:-translate-y-2 hover:scale-105 transition-all duration-500 font-bold text-lg"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600 via-gray-700 to-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
            </div>

            <span className="relative flex items-center justify-center gap-4">
              <svg className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Leave History
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          {/* 📅 Attendance Card - Ultra Premium */}
          <div className="bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-xl p-10 shadow-2xl rounded-3xl w-full max-w-xl mt-8 border border-white/50 hover:shadow-3xl hover:border-green-200/50 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
            
            {/* Decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-t-3xl"></div>

            <div className="flex items-start gap-5 mb-8">
              {/* 🎨 Icon Badge - Enhanced */}
              <div className="relative group/icon">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl blur-lg opacity-50 group-hover/icon:opacity-75 transition-opacity duration-300"></div>
                <div className="relative p-4 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl shadow-xl group-hover/icon:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                  View Attendance
                </h2>
                <p className="text-gray-600 leading-relaxed text-base">
                  Check your monthly attendance with present/absent marking and track your academic progress effortlessly.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate("/attendance")}
              className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white px-10 py-5 rounded-2xl shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-1 hover:scale-105 transition-all duration-500 font-bold text-lg"
            >
              {/* Animated overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover/btn:translate-x-full transition-transform duration-700"></div>
              </div>

              <span className="relative flex items-center justify-center gap-3">
                <svg className="w-6 h-6 group-hover/btn:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                View Attendance Calendar
                <svg className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}