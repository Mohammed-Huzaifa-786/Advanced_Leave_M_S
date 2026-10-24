import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function SmartLeavePlanner() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mode: "DURATION" vs "DATE_RANGE"
  const [mode, setMode] = useState("DURATION");
  const [duration, setDuration] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);

  useEffect(() => {
    runSimulation();
  }, [mode]);

  async function runSimulation(overrideParams = {}) {
    try {
      setLoading(true);
      const payload = {};
      const activeMode = overrideParams.mode || mode;

      if (activeMode === "DURATION") {
        payload.duration = overrideParams.duration !== undefined ? overrideParams.duration : duration;
      } else {
        payload.fromDate = overrideParams.fromDate || fromDate;
        payload.toDate = overrideParams.toDate || toDate;
      }

      const res = await api.post("/analytics/smart-leave-plan", payload);
      setPlanResult(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to simulate leave plan");
    } finally {
      setLoading(false);
    }
  }

  function handleDurationChange(d) {
    setDuration(d);
    runSimulation({ mode: "DURATION", duration: d });
  }

  function handleDateRangeSubmit(e) {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast.warning("Please select both start and end dates.");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      toast.warning("End date cannot precede start date.");
      return;
    }
    runSimulation({ mode: "DATE_RANGE", fromDate, toDate });
  }

  function proceedToApplyLeave(start, end) {
    navigate("/apply-leave", {
      state: {
        fromDate: start || fromDate,
        toDate: end || toDate || start,
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Smart Leave Planner"
          subtitle="Simulate projected attendance impact, discover safe leave intervals, and verify threshold margins before applying."
          icon="sparkles"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "Smart Leave Planner" },
          ]}
          actions={
            <Link
              to="/attendance-analytics"
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs flex items-center gap-1.5"
            >
              <Icon name="trendingUp" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Subject Analytics</span>
            </Link>
          }
        />

        {/* Mode Selector & Input Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("DURATION")}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === "DURATION"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                1. Duration Preset (Days)
              </button>
              <button
                type="button"
                onClick={() => setMode("DATE_RANGE")}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === "DATE_RANGE"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                2. Target Date Range
              </button>
            </div>

            {planResult && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Current Attendance:{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{planResult.currentOverallAttendance}%</span> (Mandatory Target: 75%)
              </div>
            )}
          </div>

          {mode === "DURATION" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-2">
                Simulate Leave Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDurationChange(d)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      duration === d
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span>{d} Day{d > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleDateRangeSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">From Date *</label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">To Date *</label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition disabled:opacity-50"
                >
                  {loading ? "Simulating..." : "Analyze Impact"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <CardSkeleton count={2} />
        )}

        {/* Simulation Results */}
        {!loading && planResult && (
          <div className="space-y-6">
            {/* Mode 1: Duration Recommendations */}
            {planResult.mode === "RECOMMENDATION" && (
              <>
                {/* No Safe Date Alert */}
                {!planResult.hasSafeDate && (
                  <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5 flex items-start gap-3.5">
                    <Icon name="alertTriangle" className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                        {planResult.noSafeDateMessage ||
                          "No fully safe leave dates found that keep you above 75% attendance."}
                      </h3>
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                        Taking leave during this upcoming window will cause one or more subjects to breach the mandatory 75% regulatory requirement. Attend scheduled lectures to build sufficient margin first.
                      </p>
                    </div>
                  </div>
                )}

                {/* Ranked Recommendations Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Safe Dates */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                          Safe Windows (≥ 75%)
                        </span>
                        <Icon name="checkCircle" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Leaves on these dates will keep all your enrolled subjects comfortably compliant.
                      </p>

                      <div className="space-y-2.5">
                        {planResult.recommendedDates.length === 0 ? (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 text-center">
                            No fully safe slots found
                          </div>
                        ) : (
                          planResult.recommendedDates.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{item.label}</p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                  {item.totalClassesMissed} classes impacted
                                </p>
                              </div>
                              <button
                                onClick={() => proceedToApplyLeave(item.startDate, item.endDate)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs"
                              >
                                Apply
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alternative Dates */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-amber-200/80 dark:border-amber-800/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                          Moderate (Borderline)
                        </span>
                        <Icon name="alertTriangle" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Leaves maintain 75%, but one or more subjects will operate with tight margins.
                      </p>

                      <div className="space-y-2.5">
                        {planResult.alternativeDates.length === 0 ? (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 text-center">
                            No moderate alternatives
                          </div>
                        ) : (
                          planResult.alternativeDates.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-800/50 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{item.label}</p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                  Tight margin • {item.totalClassesMissed} classes
                                </p>
                              </div>
                              <button
                                onClick={() => proceedToApplyLeave(item.startDate, item.endDate)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs"
                              >
                                Apply
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avoid Dates */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xs border border-rose-200/80 dark:border-rose-800/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full">
                          Critical Risk (&lt; 75%)
                        </span>
                        <Icon name="xCircle" className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Taking leave here will drop your subject attendance below the statutory 75%.
                      </p>

                      <div className="space-y-2.5">
                        {planResult.avoidDates.length === 0 ? (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 text-center">
                            No high-risk dates identified
                          </div>
                        ) : (
                          planResult.avoidDates.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800/50 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{item.label}</p>
                                <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                                  Risk • Drops below 75%
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Unsafe</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Mode 2: Specific Date Range Impact Breakdown */}
            {planResult.mode === "DATE_RANGE" && (
              <div className="space-y-6">
                {/* Overall Range Verdict Banner */}
                <div
                  className={`rounded-2xl p-5 sm:p-6 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    planResult.overallVerdict === "SAFE"
                      ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60"
                      : planResult.overallVerdict === "MODERATE"
                      ? "bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60"
                      : "bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        planResult.overallVerdict === "SAFE"
                          ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                          : planResult.overallVerdict === "MODERATE"
                          ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                          : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      <Icon
                        name={
                          planResult.overallVerdict === "SAFE"
                            ? "checkCircle"
                            : planResult.overallVerdict === "MODERATE"
                            ? "alertTriangle"
                            : "xCircle"
                        }
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {planResult.fromDate} to {planResult.toDate}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            planResult.overallVerdict === "SAFE"
                              ? "bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200"
                              : planResult.overallVerdict === "MODERATE"
                              ? "bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200"
                              : "bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200"
                          }`}
                        >
                          {planResult.overallVerdict}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{planResult.summaryExplanation}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => proceedToApplyLeave(planResult.fromDate, planResult.toDate)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition self-start sm:self-auto flex items-center gap-2"
                  >
                    <Icon name="fileText" className="w-4 h-4 text-indigo-200" />
                    <span>Apply for this Date Window</span>
                  </button>
                </div>

                {/* Daily Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon name="calendar" className="w-4 h-4 text-indigo-600" />
                    <span>Day-By-Day Schedule Analysis</span>
                  </h3>
                  <div className="space-y-2.5">
                    {planResult.dailyBreakdown.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">{day.date}</span> (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{day.dayOfWeek}</span>)
                          <span className="text-slate-500 dark:text-slate-400 ml-2">— {day.reason}</span>
                        </div>

                        <div>
                          {day.missedClasses.length > 0 ? (
                            <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-md font-semibold border border-rose-200 dark:border-rose-800/60">
                              {day.missedClasses.length} class{day.missedClasses.length > 1 ? "es" : ""} missed
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-md font-semibold border border-emerald-200 dark:border-emerald-800/60">
                              0 classes missed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subject-Wise Projected Impact Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700 overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon name="trendingUp" className="w-4 h-4 text-indigo-600" />
                    <span>Subject-Wise Projected Attendance Impact</span>
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="p-3 uppercase">Subject</th>
                          <th className="p-3 text-center uppercase">Current %</th>
                          <th className="p-3 text-center uppercase">Missed</th>
                          <th className="p-3 text-center uppercase">Projected %</th>
                          <th className="p-3 text-center uppercase">Delta</th>
                          <th className="p-3 text-center uppercase">Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {planResult.subjectImpacts.map((sub) => (
                          <tr key={sub.subjectId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              <div>{sub.name}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{sub.code}</div>
                            </td>
                            <td className="p-3 text-center font-medium text-slate-700 dark:text-slate-300">{sub.currentPercentage}%</td>
                            <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400">
                              {sub.missedClasses > 0 ? `-${sub.missedClasses}` : "0"}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-xs font-bold ${
                                  sub.projectedPercentage >= 75
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-700 dark:text-rose-400"
                                }`}
                              >
                                {sub.projectedPercentage}%
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium text-slate-500 dark:text-slate-400">
                              {sub.delta > 0 ? `-${sub.delta}%` : "0%"}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  sub.status === "SAFE"
                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                    : sub.status === "MODERATE"
                                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
