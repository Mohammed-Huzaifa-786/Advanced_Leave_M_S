import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const studentId = localStorage.getItem("studentId");

        const res = await api.get("/leave/all");

        const filtered = res.data.filter(
          (l) => l.studentId == studentId
        );

        setLeaves(filtered);
      } catch (err) {
        console.log(err);
        alert("Failed to load leave history");
      }
    };

    load();
  }, []);

  const getStatusStyles = (status) => {
    switch (status) {
      case "approved":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-700",
          badge: "bg-green-100 text-green-800 border-green-300"
        };
      case "rejected":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          badge: "bg-red-100 text-red-800 border-red-300"
        };
      default:
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-700",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-300"
        };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "rejected":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-8 lg:p-10 relative overflow-hidden">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20 mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Leave History
              </h1>
              <p className="text-gray-600 text-sm mt-1">Track all your leave applications</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{leaves.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {leaves.filter(l => l.status === 'approved').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {leaves.filter(l => l.status === 'pending').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {leaves.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg border border-white/20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Leave Applications</h3>
            <p className="text-gray-600 mb-6">You haven't submitted any leave applications yet.</p>
            <a 
              href="/apply-leave"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Apply for Leave
            </a>
          </div>
        )}

        {/* Leave Cards */}
        <div className="space-y-4">
          {leaves.map((leave) => {
            const styles = getStatusStyles(leave.status);
            return (
              <div
                key={leave.id}
                className={`${styles.bg} border-2 ${styles.border} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/90 backdrop-blur-sm`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 ${styles.badge} border rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {getStatusIcon(leave.status)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{leave.leaveType}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {leave.fromDate} - {leave.toDate}
                      </div>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center gap-2 px-4 py-2 ${styles.badge} border rounded-full font-semibold text-sm whitespace-nowrap`}>
                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                  </span>
                </div>

                <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Reason</p>
                      <p className="text-gray-800 text-sm leading-relaxed">{leave.reason}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        {leaves.length > 0 && (
          <div className="mt-8 text-center">
            <a 
              href="/student"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium hover:underline transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}