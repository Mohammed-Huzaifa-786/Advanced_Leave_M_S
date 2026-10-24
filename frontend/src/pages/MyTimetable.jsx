import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import TimetablePrintModal from "../components/TimetablePrintModal";
import TimetableGrid, { PERIODS_DEF } from "../components/TimetableGrid";

export default function MyTimetable() {
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Today's Day Name
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date().getDay()
  ];

  useEffect(() => {
    loadTimetable();
  }, []);

  async function loadTimetable() {
    try {
      setLoading(true);
      const res = await api.get("/timetable/my-timetable");
      setTimetableData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Find today's classes
  const todaySlots = timetableData?.days?.[todayName] || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="My Academic Timetable"
          subtitle="Official departmental schedule, laboratory sessions, faculty assignments, and classroom locations."
          icon="calendar"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "My Timetable" },
          ]}
          actions={
            timetableData?.hasTimetable && (
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-flex px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{timetableData.timetable.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <Icon name="printer" className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Export PDF</span>
                </button>
              </div>
            )
          }
        />

        {loading ? (
          <CardSkeleton count={2} />
        ) : !timetableData?.hasTimetable ? (
          <EmptyState
            icon="calendar"
            title="No Published Timetable Found"
            description={
              timetableData?.message ||
              "Your department administrator has not published an active schedule for your class section yet."
            }
            actionText="Refresh Schedule"
            onAction={loadTimetable}
          />
        ) : (
          <div className="space-y-6">
            {/* TODAY'S SCHEDULE HERO CARD */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-indigo-600/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                    <Icon name="clock" className="w-3 h-3" />
                    <span>Today&rsquo;s Overview • {todayName}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {todayName === "Sunday"
                      ? "Sunday • College Holiday"
                      : `${todaySlots.length} Classes Scheduled Today`}
                  </h2>
                  <p className="text-xs text-indigo-100 font-medium">
                    {timetableData.student?.department || "CSE"} • Semester{" "}
                    {timetableData.student?.semester || 7} &lsquo;
                    {timetableData.student?.section || "A"}&rsquo;
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                      Academic Year
                    </span>
                    <p className="text-sm font-bold text-white">
                      {timetableData.timetable?.academicYear || "2026-27"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5 border border-white/20"
                  >
                    <Icon name="printer" className="w-3.5 h-3.5" />
                    <span>Print Schedule</span>
                  </button>
                </div>
              </div>
            </div>

            {/* UNIFIED TIMETABLE GRID */}
            {(() => {
              const allSlots =
                (timetableData.timetable?.slots && timetableData.timetable.slots.length > 0)
                  ? timetableData.timetable.slots
                  : Object.entries(timetableData.days || {}).flatMap(([dayName, daySlots]) =>
                      (daySlots || []).map((s) => ({ ...s, day: s.day || dayName }))
                    );

              return (
                <>
                  <TimetableGrid
                    slots={allSlots}
                    timetableInfo={{
                      name: timetableData.timetable?.name,
                      department: timetableData.timetable?.department,
                      semester: timetableData.timetable?.semester,
                      section: timetableData.timetable?.section,
                      academicYear: timetableData.timetable?.academicYear,
                      status: "published",
                    }}
                    defaultViewMode="weekly"
                    highlightToday={true}
                  />

                  {/* Timetable Print & Export Modal */}
                  {showPrintModal && (
                    <TimetablePrintModal
                      timetable={{
                        ...timetableData.timetable,
                        slots: allSlots,
                      }}
                      onClose={() => setShowPrintModal(false)}
                    />
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
