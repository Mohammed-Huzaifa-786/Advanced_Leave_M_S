import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

export default function AttendanceAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await api.get("/analytics/subject-attendance");
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status) {
    if (status === "SAFE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Icon name="checkCircle" className="w-3.5 h-3.5" />
          <span>Compliant</span>
        </span>
      );
    }
    if (status === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Icon name="alertTriangle" className="w-3.5 h-3.5" />
          <span>Warning</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-full text-xs font-semibold uppercase tracking-wider">
        <Icon name="xCircle" className="w-3.5 h-3.5" />
        <span>Shortage</span>
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Subject-Wise Attendance Analytics"
          subtitle="Course attendance breakdown, 75% regulatory compliance standing, and predictive safety limits."
          icon="trendingUp"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "Attendance Analytics" },
          ]}
          actions={
            <Link
              to="/smart-leave-planner"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition flex items-center gap-2"
            >
              <Icon name="sparkles" className="w-4 h-4 text-indigo-200" />
              <span>Smart Leave Planner</span>
            </Link>
          }
        />

        {loading ? (
          <CardSkeleton count={2} />
        ) : !data ? (
          <EmptyState
            icon="trendingUp"
            title="Unable to Load Attendance Analytics"
            description="Could not compute your subject attendance records. Please ensure your timetable is configured and try again."
            actionText="Retry Calculation"
            onAction={loadAnalytics}
          />
        ) : (
          <div className="space-y-6">
            {/* Overall Attendance Summary Banner */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xs flex-shrink-0 ${
                    data.overall.percentage >= 75
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      : data.overall.percentage >= 65
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {data.overall.percentage}%
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Overall Attendance Score</h2>
                    {getStatusBadge(data.overall.status)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {data.overall.present} attended out of {data.overall.totalConducted} total scheduled classes conducted to date
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-around md:justify-end">
                <div className="text-center px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50 min-w-[80px]">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{data.overall.present}</p>
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Present</p>
                </div>
                <div className="text-center px-4 py-2.5 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800/50 min-w-[80px]">
                  <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{data.overall.absent}</p>
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Absent</p>
                </div>
                <div className="text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 min-w-[80px]">
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{data.totalSubjects}</p>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Subjects</p>
                </div>
              </div>
            </div>

            {/* Subject Cards Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon name="fileText" className="w-4 h-4 text-indigo-600" />
                  <span>Subject Performance Breakdown</span>
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">{data.subjects.length} active courses</span>
              </div>

              {data.subjects.length === 0 ? (
                <EmptyState
                  icon="fileText"
                  title="No Subjects Enrolled"
                  description="No subjects are currently registered for your profile. Once your semester timetable is active, your performance will appear here."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.subjects.map((sub) => (
                    <div
                      key={sub.subjectId}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                              {sub.isLab && (
                                <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] font-bold rounded uppercase">
                                  Lab
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{sub.code}</p>
                          </div>
                          {getStatusBadge(sub.status)}
                        </div>

                        {/* Progress Bar */}
                        <div className="my-3.5">
                          <div className="flex justify-between items-center text-xs font-medium mb-1">
                            <span className="text-slate-500 dark:text-slate-400">Attendance Rate</span>
                            <span
                              className={`text-sm font-bold ${
                                sub.attendancePercentage >= 75
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : sub.attendancePercentage >= 65
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {sub.attendancePercentage}%
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                sub.attendancePercentage >= 75
                                  ? "bg-emerald-500"
                                  : sub.attendancePercentage >= 65
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(sub.attendancePercentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            <span>0%</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">75% Target</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Class Stats Count */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-700">
                          <div>
                            <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{sub.present}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Present</p>
                          </div>
                          <div>
                            <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">{sub.absent}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Absent</p>
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{sub.totalClasses}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Conducted</p>
                          </div>
                        </div>
                      </div>

                      {/* Smart Guidance Footer */}
                      <div
                        className={`mt-3.5 p-3 rounded-xl text-xs font-medium border ${
                          sub.attendancePercentage >= 75
                            ? "bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                            : "bg-rose-50/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                          <Icon
                            name={sub.attendancePercentage >= 75 ? "shield" : "alertTriangle"}
                            className="w-3.5 h-3.5"
                          />
                          <span>
                            {sub.attendancePercentage >= 75 ? "Compliant Standing" : "Shortage Warning"}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{sub.guidance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
