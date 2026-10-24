import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

export default function LeaveHistory() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leave/my-leaves");
      setLeaves(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          icon: "checkCircle",
          label: "Approved",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "rejected":
        return {
          icon: "xCircle",
          label: "Rejected",
          badge: "bg-rose-50 text-rose-700 border-rose-200",
        };
      default:
        return {
          icon: "clock",
          label: "Pending Review",
          badge: "bg-amber-50 text-amber-700 border-amber-200",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Leave Application History"
          subtitle="Track submitted leave applications, administrative decisions, and attached documentation."
          icon="clock"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "Leave History" },
          ]}
          actions={
            <Link
              to="/apply-leave"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition flex items-center gap-1.5"
            >
              <Icon name="plus" className="w-4 h-4 text-indigo-200" />
              <span>New Leave Request</span>
            </Link>
          }
        />

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 text-center">
            <p className="text-xl font-bold text-slate-800 dark:text-white">{leaves.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Submissions</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 text-center">
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {leaves.filter((l) => l.status === "approved").length}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Approved</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 text-center">
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {leaves.filter((l) => l.status === "pending").length}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">Pending Review</p>
          </div>
        </div>

        {/* Loading State Skeleton */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon="fileText"
            title="No Leave Applications Found"
            description="You haven't submitted any leave applications yet. Need to apply for excused absence?"
            actionText="Apply for Leave"
            onAction={() => navigate("/apply-leave")}
          />
        ) : (
          <div className="space-y-3.5">
            {leaves.map((leave) => {
              const meta = getStatusBadge(leave.status);
              return (
                <div
                  key={leave.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:shadow-md transition flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center border border-indigo-100 dark:border-indigo-700 flex-shrink-0 mt-0.5">
                        <Icon name="fileText" className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{leave.leaveType}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-xs font-semibold ${meta.badge}`}
                          >
                            <Icon name={meta.icon} className="w-3 h-3" />
                            <span>{meta.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Icon name="calendar" className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{leave.fromDate} to {leave.toDate}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700 text-xs">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Submitted Reason
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{leave.reason}</p>

                    {leave.document && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <Icon name="fileText" className="w-3.5 h-3.5 text-slate-400" />
                          <span>Supporting Certificate Attached</span>
                        </span>
                        <a
                          href={leave.documentUrl || `/uploads/certificates/${leave.document}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <span>View Document</span>
                          <Icon name="externalLink" className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}