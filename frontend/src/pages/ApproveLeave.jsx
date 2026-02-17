import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function ApproveLeave() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/leave/all");
      setLeaves(res.data);
    };
    load();
  }, []);

  const approve = async (id) => {
    await api.post(`/leave/approve/${id}`);
    alert("Leave Approved!");
    window.location.reload();
  };

  const reject = async (id) => {
    await api.post(`/leave/reject/${id}`);
    alert("Leave Rejected!");
    window.location.reload();
  };

  const filteredLeaves = leaves.filter(l => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300"
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl text-center font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Leave Requests Management
          </h1>
          <p className="text-gray-600 text-center">Review and manage student leave applications</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Requests ({leaves.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                filter === "pending"
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending ({leaves.filter(l => l.status === "pending").length})
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                filter === "approved"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Approved ({leaves.filter(l => l.status === "approved").length})
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                filter === "rejected"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Rejected ({leaves.filter(l => l.status === "rejected").length})
            </button>
          </div>
        </div>

        {/* Leave Requests */}
        {filteredLeaves.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-600">No leave requests found</p>
            <p className="text-gray-500 mt-2">All caught up!</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredLeaves.map((l) => (
            <div 
              key={l.id} 
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">Student ID: {l.studentId}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(l.status)}`}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">📅 From Date</p>
                    <p className="text-lg font-semibold text-gray-800">{l.fromDate}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">📅 To Date</p>
                    <p className="text-lg font-semibold text-gray-800">{l.toDate}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-2">📝 Reason</p>
                  <p className="text-gray-800 leading-relaxed">{l.reason}</p>
                </div>

                {l.status === "pending" && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => approve(l.id)}
                      className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      ✓ Approve
                    </button>

                    <button
                      onClick={() => reject(l.id)}
                      className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}