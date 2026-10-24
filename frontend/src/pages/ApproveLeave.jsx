import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";

export default function ApproveLeave() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leave/all");
      setLeaves(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/leave/approve/${id}`);
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l))
      );
      toast.success("Leave application approved. Attendance excused.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to approve leave");
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/leave/reject/${id}`);
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l))
      );
      toast.warning("Leave application rejected.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to reject leave");
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Leave Requests Review"
          subtitle="Inspect, approve, or reject student leave requests with automatic attendance excusal logging."
          icon="fileText"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Approve Leaves" },
          ]}
          actions={
            <button
              onClick={load}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs flex items-center gap-1.5"
            >
              <Icon name="refresh" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Refresh</span>
            </button>
          }
        />

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              filter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <span>All Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "all" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {leaves.length}
            </span>
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              filter === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <span>Pending Review</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "pending" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {leaves.filter((l) => l.status === "pending").length}
            </span>
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              filter === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <span>Approved</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "approved" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {leaves.filter((l) => l.status === "approved").length}
            </span>
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              filter === "rejected"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <span>Rejected</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "rejected" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {leaves.filter((l) => l.status === "rejected").length}
            </span>
          </button>
        </div>

        {/* Leave Requests List */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : filteredLeaves.length === 0 ? (
          <EmptyState
            icon="fileText"
            title="No Leave Requests Found"
            description="There are currently no leave requests matching the selected status filter."
          />
        ) : (
          <div className="space-y-3.5">
            {filteredLeaves.map((l) => (
              <div
                key={l.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs hover:shadow-md transition p-5 border border-slate-200/80 dark:border-slate-700 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center border border-indigo-100 dark:border-indigo-700 flex-shrink-0">
                      {(l.studentName || "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {l.studentName || `Student #${l.studentId}`}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${getStatusBadge(
                            l.status
                          )}`}
                        >
                          {l.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {l.department ? `${l.department} • ` : ""}
                        {l.className ? `${l.className} • ` : ""}
                        ID: #{l.studentId}
                        {l.username ? ` (@${l.username})` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-700">
                    {l.leaveType}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Start Date</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{l.fromDate}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">End Date</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{l.toDate}</p>
                  </div>
                </div>

                <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Reason for Absence</p>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{l.reason}</p>
                </div>

                {l.document && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/60 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Icon name="fileText" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Supporting Certificate Attached</span>
                    </span>
                    <a
                      href={l.documentUrl || `/uploads/certificates/${l.document}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Inspect Attachment</span>
                      <Icon name="externalLink" className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {l.status === "pending" && (
                  <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => approve(l.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition shadow-xs flex items-center gap-1.5"
                    >
                      <Icon name="checkCircle" className="w-3.5 h-3.5" />
                      <span>Approve Request</span>
                    </button>
                    <button
                      onClick={() => reject(l.id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium transition shadow-xs flex items-center gap-1.5"
                    >
                      <Icon name="xCircle" className="w-3.5 h-3.5" />
                      <span>Reject Request</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}