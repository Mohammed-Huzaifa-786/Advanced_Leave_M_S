import React, { useState } from "react";
import { Icon } from "./Icons";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Standard Institutional Period Timings (VTU / BMSIT Standard)
export const PERIODS_SCHEDULE = [
  { num: 1, label: "Period I", startTime: "08:30", endTime: "09:25", time: "08:30 – 09:25", durationMin: 55 },
  { num: 2, label: "Period II", startTime: "09:25", endTime: "10:20", time: "09:25 – 10:20", durationMin: 55 },
  { num: 3, label: "Period III", startTime: "10:40", endTime: "11:35", time: "10:40 – 11:35", durationMin: 55 },
  { num: 4, label: "Period IV", startTime: "11:35", endTime: "12:30", time: "11:35 – 12:30", durationMin: 55 },
  { num: 5, label: "Period V", startTime: "13:25", endTime: "14:20", time: "13:25 – 14:20", durationMin: 55 },
  { num: 6, label: "Period VI", startTime: "14:20", endTime: "15:15", time: "14:20 – 15:15", durationMin: 55 },
  { num: 7, label: "Period VII", startTime: "15:15", endTime: "16:10", time: "15:15 – 16:10", durationMin: 55 },
];

export const BREAKS = [
  {
    id: "tea",
    label: "Tea Break",
    fullLabel: "Tea / Refreshment Break",
    startTime: "10:20",
    endTime: "10:40",
    time: "10:20 – 10:40",
    duration: "20 min",
    afterPeriod: 2,
    icon: "coffee",
  },
  {
    id: "lunch",
    label: "Lunch Break",
    fullLabel: "Institutional Lunch Break",
    startTime: "12:30",
    endTime: "13:25",
    time: "12:30 – 13:25",
    duration: "55 min",
    afterPeriod: 4,
    icon: "utensils",
  },
];

// Unified definitions for Days as Rows, Periods as Columns representation
export const PERIODS_DEF = [
  { num: 1, label: "Period I", shortLabel: "I", startTime: "08:30", endTime: "09:25", time: "08:30–09:25", durationMin: 55 },
  { num: 2, label: "Period II", shortLabel: "II", startTime: "09:25", endTime: "10:20", time: "09:25–10:20", durationMin: 55 },
  {
    num: "tea",
    label: "Tea Break",
    shortLabel: "Tea Break",
    startTime: "10:20",
    endTime: "10:40",
    time: "10:20–10:40",
    duration: "20 min",
    durationMin: 20,
    isBreak: true,
    breakType: "tea",
  },
  { num: 3, label: "Period III", shortLabel: "III", startTime: "10:40", endTime: "11:35", time: "10:40–11:35", durationMin: 55 },
  { num: 4, label: "Period IV", shortLabel: "IV", startTime: "11:35", endTime: "12:30", time: "11:35–12:30", durationMin: 55 },
  {
    num: "lunch",
    label: "Lunch Break",
    shortLabel: "Lunch Break",
    startTime: "12:30",
    endTime: "13:25",
    time: "12:30–13:25",
    duration: "55 min",
    durationMin: 55,
    isBreak: true,
    breakType: "lunch",
  },
  { num: 5, label: "Period V", shortLabel: "V", startTime: "13:25", endTime: "14:20", time: "13:25–14:20", durationMin: 55 },
  { num: 6, label: "Period VI", shortLabel: "VI", startTime: "14:20", endTime: "15:15", time: "14:20–15:15", durationMin: 55 },
  { num: 7, label: "Period VII", shortLabel: "VII", startTime: "15:15", endTime: "16:10", time: "15:15–16:10", durationMin: 55 },
];

/**
 * Standardized Slot Extractor
 */
export function normalizeSlot(slot) {
  if (!slot) return null;
  return {
    id: slot.id,
    periodNumber: slot.periodNumber,
    day: slot.day,
    startTime: slot.startTime || "",
    endTime: slot.endTime || "",
    isLab: Boolean(slot.isLab || slot.subject?.isLab),
    duration: slot.duration || (slot.isLab ? 2 : 1),
    batch: slot.batch || "All",
    subjectId: slot.subjectId || slot.subject?.id || null,
    subjectCode: slot.subject?.code || slot.subjectCode || "",
    subjectName: slot.subject?.name || slot.subjectName || "Academic Session",
    facultyId: slot.facultyId || slot.faculty?.id || null,
    facultyName: slot.faculty?.name || slot.facultyName || "Faculty TBD",
    roomId: slot.roomId || slot.room?.id || null,
    roomName: slot.room?.name || slot.roomName || "Classroom TBD",
    isProject:
      (slot.subject?.code || slot.subjectCode || "").toUpperCase().startsWith("MP") ||
      (slot.subject?.name || slot.subjectName || "").toLowerCase().includes("project"),
  };
}

/**
 * Check if two slots belong to the same session block (for continuous 110-minute lab or lecture)
 */
function isSameSession(s1, s2) {
  if (!s1 || !s2) return false;
  if (s1.day !== s2.day) return false;

  // Check matching subject
  const matchSubId = s1.subjectId && s2.subjectId && String(s1.subjectId) === String(s2.subjectId);
  const matchSubCode =
    s1.subjectCode &&
    s2.subjectCode &&
    s1.subjectCode.trim().toUpperCase() === s2.subjectCode.trim().toUpperCase();
  const matchSubName =
    s1.subjectName &&
    s2.subjectName &&
    s1.subjectName.trim().toLowerCase() === s2.subjectName.trim().toLowerCase();

  const sameSubject = matchSubId || matchSubCode || matchSubName;
  if (!sameSubject) return false;

  // Check batch compatibility
  const sameBatch = !s1.batch || !s2.batch || s1.batch === s2.batch || s1.batch === "All" || s2.batch === "All";
  return sameBatch;
}

export default function TimetableGrid({
  slots = [],
  timetableInfo = null,
  editable = false,
  onSlotClick = null,
  highlightToday = true,
  defaultViewMode = "weekly", // "weekly" (Days as Columns) | "matrix" (Days as Rows) | "daily"
  className = "",
}) {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Determine current day for auto-highlighting
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date().getDay()
  ];
  const initialActiveDay = DAYS.includes(todayName) ? todayName : "Monday";
  const [activeDay, setActiveDay] = useState(initialActiveDay);

  // Group normalized slots by Day
  const scheduleByDay = {};
  DAYS.forEach((d) => {
    scheduleByDay[d] = [];
  });

  (slots || []).forEach((rawSlot) => {
    const s = normalizeSlot(rawSlot);
    if (s && scheduleByDay[s.day]) {
      scheduleByDay[s.day].push(s);
    }
  });

  // Calculate high-level stats
  const totalSlots = (slots || []).length;
  const labSlots = (slots || []).filter((s) => s.isLab || s.duration > 1).length;
  const theorySlots = totalSlots - labSlots;

  function handleSlotCardClick(slot, day, pNum, timeRange = "", durationMin = 55) {
    if (onSlotClick) {
      onSlotClick(slot, day, pNum);
    } else if (slot) {
      setSelectedSlot({
        ...slot,
        day,
        periodNumber: pNum,
        displayTimeRange: timeRange || slot.startTime ? `${slot.startTime} – ${slot.endTime}` : "",
        displayDuration: durationMin ? `${durationMin} min` : "55 min",
      });
    }
  }

  // Pre-calculate weekly grid cells matrix (Days as Columns, Periods as Rows)
  // Maps: cellMatrix[periodNum][day] = { type: 'slot'|'empty'|'covered', slot, rowSpan, periodLabel, timeRange, durationLabel }
  const cellMatrix = {};
  for (let pNum = 1; pNum <= 7; pNum++) {
    cellMatrix[pNum] = {};
  }
  const coveredMatrix = {}; // coveredMatrix[day] = Set(coveredPeriodNums)
  DAYS.forEach((day) => {
    coveredMatrix[day] = new Set();
  });

  DAYS.forEach((day) => {
    const daySlots = scheduleByDay[day] || [];
    const slotByPeriod = {};
    daySlots.forEach((s) => {
      if (!slotByPeriod[s.periodNumber]) {
        slotByPeriod[s.periodNumber] = s;
      }
    });

    for (let p = 1; p <= 7; p++) {
      if (coveredMatrix[day].has(p)) {
        cellMatrix[p][day] = { type: "covered" };
        continue;
      }

      const currentSlot = slotByPeriod[p];
      const pDef = PERIODS_SCHEDULE[p - 1];

      if (!currentSlot) {
        cellMatrix[p][day] = {
          type: "empty",
          periodNumber: p,
          day,
          rowSpan: 1,
          timeRange: pDef.time,
          durationLabel: "55 min",
          periodLabel: pDef.label,
        };
        continue;
      }

      const canPairWithNext = p !== 2 && p !== 4 && p < 7;
      const nextSlot = canPairWithNext ? slotByPeriod[p + 1] : null;

      const isConsecutivePair =
        canPairWithNext &&
        ((nextSlot && isSameSession(currentSlot, nextSlot)) ||
          currentSlot.duration === 2 ||
          currentSlot.isLab);

      if (isConsecutivePair) {
        const nextPDef = PERIODS_SCHEDULE[p];
        const combinedTimeRange = `${pDef.startTime} – ${nextPDef.endTime}`;
        const combinedPeriodLabel = `${pDef.label} & ${nextPDef.label}`;

        cellMatrix[p][day] = {
          type: "slot",
          slot: currentSlot,
          secondSlot: nextSlot,
          periodNumber: p,
          day,
          rowSpan: 2,
          isCombined: true,
          timeRange: combinedTimeRange,
          durationMin: 110,
          durationLabel: "110 min",
          periodLabel: combinedPeriodLabel,
        };

        coveredMatrix[day].add(p + 1);
      } else {
        cellMatrix[p][day] = {
          type: "slot",
          slot: currentSlot,
          periodNumber: p,
          day,
          rowSpan: 1,
          isCombined: false,
          timeRange: currentSlot.startTime && currentSlot.endTime ? `${currentSlot.startTime} – ${currentSlot.endTime}` : pDef.time,
          durationMin: 55,
          durationLabel: "55 min",
          periodLabel: pDef.label,
        };
      }
    }
  });

  // Pre-calculate Days-as-Rows layout (Days as Rows, Periods as Columns)
  // Maps: dayRowMatrix[day] = Array of cell objects corresponding to PERIODS_DEF
  const dayRowMatrix = {};
  DAYS.forEach((day) => {
    const daySlots = scheduleByDay[day] || [];
    const slotByPeriod = {};
    daySlots.forEach((s) => {
      if (!slotByPeriod[s.periodNumber]) {
        slotByPeriod[s.periodNumber] = s;
      }
    });

    const coveredPeriods = new Set();
    const rowCells = [];

    PERIODS_DEF.forEach((col) => {
      if (col.isBreak) {
        rowCells.push({
          type: "break",
          col,
          colSpan: 1,
        });
        return;
      }

      const p = col.num;
      if (coveredPeriods.has(p)) {
        rowCells.push({
          type: "covered",
          periodNumber: p,
        });
        return;
      }

      const currentSlot = slotByPeriod[p];
      const pDef = PERIODS_SCHEDULE[p - 1];

      if (!currentSlot) {
        rowCells.push({
          type: "empty",
          periodNumber: p,
          day,
          colSpan: 1,
          timeRange: col.time,
          durationLabel: "55 min",
          periodLabel: `Period ${col.shortLabel}`,
        });
        return;
      }

      const canPairWithNext = p !== 2 && p !== 4 && p < 7;
      const nextSlot = canPairWithNext ? slotByPeriod[p + 1] : null;

      const isConsecutivePair =
        canPairWithNext &&
        ((nextSlot && isSameSession(currentSlot, nextSlot)) ||
          (currentSlot.duration === 2 && (!nextSlot || isSameSession(currentSlot, nextSlot))) ||
          (currentSlot.isLab && nextSlot && isSameSession(currentSlot, nextSlot)));

      if (isConsecutivePair) {
        const nextPDef = PERIODS_SCHEDULE[p];
        const combinedTimeRange = `${pDef.startTime}–${nextPDef.endTime}`;
        const nextShortLabel = p === 1 ? "II" : p === 3 ? "IV" : p === 5 ? "VI" : "VII";
        const combinedPeriodLabel = `Period ${col.shortLabel} & ${nextShortLabel}`;

        rowCells.push({
          type: "slot",
          slot: currentSlot,
          secondSlot: nextSlot,
          periodNumber: p,
          day,
          colSpan: 2,
          isCombined: true,
          timeRange: combinedTimeRange,
          durationMin: 110,
          durationLabel: "110 min",
          periodLabel: combinedPeriodLabel,
        });

        coveredPeriods.add(p + 1);
      } else {
        rowCells.push({
          type: "slot",
          slot: currentSlot,
          periodNumber: p,
          day,
          colSpan: 1,
          isCombined: false,
          timeRange: currentSlot.startTime && currentSlot.endTime ? `${currentSlot.startTime}–${currentSlot.endTime}` : col.time,
          durationMin: 55,
          durationLabel: "55 min",
          periodLabel: `Period ${col.shortLabel}`,
        });
      }
    });

    dayRowMatrix[day] = rowCells;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* View Switcher & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        {/* Left: Metadata summary */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60 flex-shrink-0">
            <Icon name="calendar" className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {timetableInfo?.name || "Weekly Academic Schedule"}
              </h4>
              {timetableInfo?.status && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    timetableInfo.status === "published"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {timetableInfo.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{totalSlots} total sessions</span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {theorySlots} Theory (55m)
              </span>
              <span>•</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {labSlots} Practical Lab (110m)
              </span>
            </div>
          </div>
        </div>

        {/* Right: View Toggle (Weekly Grid / Vertical Grid / Day-by-Day) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === "weekly"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Weekly Timetable Grid: Days as Rows, Periods as Columns"
          >
            <Icon name="layoutGrid" className="w-3.5 h-3.5" />
            <span>Weekly Grid (Days as Rows)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("columns")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === "columns"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Vertical Timetable Grid: Days as Columns, Time Slots as Rows"
          >
            <Icon name="columns" className="w-3.5 h-3.5" />
            <span>Vertical Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === "daily"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Day-by-Day Timeline View"
          >
            <Icon name="layers" className="w-3.5 h-3.5" />
            <span>Day-by-Day</span>
          </button>
        </div>
      </div>

      {/* Visual Classification Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500">
          Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-500" />
          <span className="font-medium">Theory Lecture (55m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500" />
          <span className="font-medium">Practical Lab (110m Combined)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span className="font-medium">Major Project (110m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400" />
          <span className="font-medium">Tea Break (20m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-500" />
          <span className="font-medium">Lunch Break (55m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-100 dark:bg-slate-800" />
          <span className="font-medium">Free Period</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRIMARY VIEW: WEEKLY GRID (DAYS AS ROWS, PERIODS AS COLUMNS)           */}
      {/* ========================================================================= */}
      {viewMode === "weekly" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1050px]">
              {/* Header: Day column + Periods I-VII and Breaks columns */}
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/90 dark:border-slate-700">
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 w-32 border-r border-slate-200/70 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Icon name="calendar" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Day</span>
                    </div>
                  </th>
                  {PERIODS_DEF.map((col, cIdx) => {
                    if (col.isBreak) {
                      return (
                        <th
                          key={cIdx}
                          className="p-2.5 text-center bg-amber-500/10 dark:bg-amber-500/15 border-r border-amber-200/80 dark:border-amber-800/60 select-none min-w-[110px]"
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                              <Icon
                                name={col.breakType === "tea" ? "coffee" : "utensils"}
                                className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
                              />
                              <span>{col.shortLabel}: {col.time}</span>
                            </div>
                            <span className="text-[9.5px] font-semibold text-amber-700/80 dark:text-amber-300/80">
                              {col.duration}
                            </span>
                          </div>
                        </th>
                      );
                    }

                    return (
                      <th
                        key={cIdx}
                        className="p-2.5 text-center border-r border-slate-200/70 dark:border-slate-700 last:border-r-0 min-w-[130px]"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="inline-block text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            {col.shortLabel}: {col.time}
                          </span>
                          <span className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            55 min
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {DAYS.map((dayName) => {
                  const isToday = highlightToday && dayName === todayName;
                  const daySlots = scheduleByDay[dayName] || [];
                  const cells = dayRowMatrix[dayName] || [];

                  return (
                    <tr
                      key={dayName}
                      className={`transition-colors ${
                        isToday
                          ? "bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "hover:bg-slate-50/40 dark:hover:bg-slate-700/20"
                      }`}
                    >
                      {/* Day Header Cell */}
                      <td
                        className={`p-3 align-middle border-r border-slate-200/70 dark:border-slate-700 font-bold ${
                          isToday
                            ? "bg-indigo-50/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs uppercase tracking-wide">
                              {dayName}
                            </span>
                            {isToday && (
                              <span
                                className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"
                                title="Today"
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {daySlots.length} scheduled
                          </span>
                        </div>
                      </td>

                      {/* Period Cells */}
                      {cells.map((cell, idx) => {
                        // Skip covered cells (from continuous 110-min lab colSpan={2})
                        if (cell.type === "covered") {
                          return null;
                        }

                        // Break column
                        if (cell.type === "break") {
                          const isTea = cell.col.breakType === "tea";
                          return (
                            <td
                              key={idx}
                              colSpan={cell.colSpan}
                              className="p-1 text-center align-middle bg-amber-500/5 dark:bg-amber-500/10 border-r border-amber-200/60 dark:border-amber-800/40 select-none"
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center py-2 text-amber-700/70 dark:text-amber-400/70">
                                <Icon
                                  name={isTea ? "coffee" : "utensils"}
                                  className="w-3.5 h-3.5 opacity-60 mb-0.5"
                                />
                                <span className="text-[8.5px] font-bold uppercase tracking-wider">
                                  {isTea ? "Tea" : "Lunch"}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        // Free period
                        if (cell.type === "empty") {
                          return (
                            <td
                              key={idx}
                              colSpan={cell.colSpan}
                              className="p-1.5 align-middle border-r border-slate-200/60 dark:border-slate-700 last:border-r-0"
                            >
                              {editable ? (
                                <button
                                  type="button"
                                  onClick={() => handleSlotCardClick(null, dayName, cell.periodNumber, cell.timeRange, 55)}
                                  className="w-full h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition group"
                                >
                                  <Icon
                                    name="plus"
                                    className="w-3.5 h-3.5 mb-0.5 group-hover:scale-110 transition-transform"
                                  />
                                  <span className="text-[9px] font-semibold">Assign</span>
                                </button>
                              ) : (
                                <div className="h-20 rounded-xl border border-dashed border-slate-200/70 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 select-none p-1">
                                  <span className="text-[10px] font-semibold tracking-wider">Free Period</span>
                                  <span className="text-[8.5px] text-slate-400/80 mt-0.5 font-mono">
                                    {cell.timeRange}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // Class or Combined Lab Session
                        const slot = cell.slot;
                        const isCombined = cell.isCombined;

                        return (
                          <td
                            key={idx}
                            colSpan={cell.colSpan}
                            className="p-1.5 align-top border-r border-slate-200/60 dark:border-slate-700 last:border-r-0"
                          >
                            <div
                              onClick={() =>
                                handleSlotCardClick(
                                  slot,
                                  dayName,
                                  cell.periodNumber,
                                  cell.timeRange,
                                  cell.durationMin
                                )
                              }
                              className={`group p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] min-h-[90px] flex flex-col justify-between ${
                                slot.isProject
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100 hover:border-emerald-400"
                                  : slot.isLab || isCombined
                                  ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/70 text-purple-950 dark:text-purple-100 hover:border-purple-400"
                                  : "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-100 hover:border-indigo-400"
                              }`}
                            >
                              {/* Top Bar: Subject Code + Duration Pill */}
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-tight font-mono ${
                                      slot.isProject
                                        ? "bg-emerald-600 text-white"
                                        : slot.isLab || isCombined
                                        ? "bg-purple-600 text-white"
                                        : "bg-indigo-600 text-white"
                                    }`}
                                  >
                                    {slot.subjectCode}
                                  </span>

                                  {/* Duration Badge */}
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-tight ${
                                      isCombined
                                        ? "bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100"
                                        : "bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200"
                                    }`}
                                  >
                                    {cell.durationLabel}
                                  </span>
                                </div>

                                {/* Subject Name */}
                                <h5
                                  className="font-bold text-[11px] leading-tight text-slate-900 dark:text-white line-clamp-2"
                                  title={slot.subjectName}
                                >
                                  {slot.subjectName}
                                </h5>

                                {/* Period Number & Exact Timings */}
                                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                                  <Icon name="clock" className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                  <span className="truncate">{cell.periodLabel} • {cell.timeRange}</span>
                                </div>
                              </div>

                              {/* Bottom Section: Faculty & Room */}
                              <div className="pt-1.5 mt-1.5 border-t border-black/5 dark:border-white/10 space-y-1 text-[9.5px]">
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate">
                                  <Icon
                                    name="user"
                                    className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0"
                                  />
                                  <span className="truncate font-medium">{slot.facultyName}</span>
                                </div>

                                <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 truncate font-medium">
                                    <Icon name="building" className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{slot.roomName}</span>
                                  </span>
                                  {slot.batch && slot.batch !== "All" && (
                                    <span className="px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 font-bold text-[8px] text-slate-700 dark:text-slate-200">
                                      {slot.batch}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SECONDARY VIEW: VERTICAL GRID (DAYS AS COLUMNS, TIME SLOTS AS ROWS)    */}
      {/* ========================================================================= */}
      {viewMode === "columns" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[980px]">
              {/* Header: Time Slot Column + Monday to Saturday Days Columns */}
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/90 dark:border-slate-700">
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 w-36 border-r border-slate-200/70 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Icon name="clock" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Time & Period</span>
                    </div>
                  </th>
                  {DAYS.map((dayName) => {
                    const isToday = highlightToday && dayName === todayName;
                    const daySlots = scheduleByDay[dayName] || [];
                    return (
                      <th
                        key={dayName}
                        className={`p-2.5 text-center border-r border-slate-200/60 dark:border-slate-700 last:border-r-0 min-w-[135px] ${
                          isToday ? "bg-indigo-50/60 dark:bg-indigo-950/40" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                              {dayName}
                            </span>
                            {isToday && (
                              <span
                                className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"
                                title="Today"
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {daySlots.length} scheduled
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {/* Render Chronological Rows: Periods 1-2, Tea Break, Periods 3-4, Lunch Break, Periods 5-7 */}
                {[1, 2, "break-tea", 3, 4, "break-lunch", 5, 6, 7].map((item) => {
                  // TEA BREAK ROW
                  if (item === "break-tea") {
                    const tea = BREAKS[0];
                    return (
                      <tr
                        key="break-tea"
                        className="bg-amber-500/10 dark:bg-amber-500/15 border-y-2 border-amber-300/70 dark:border-amber-700/60"
                      >
                        <td className="p-2.5 font-bold text-xs text-amber-900 dark:text-amber-200 border-r border-amber-200 dark:border-amber-800/50">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                              <Icon name="coffee" className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-[11px] leading-tight">Tea Break</div>
                              <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                                {tea.time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td colSpan={DAYS.length} className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            <Icon name="coffee" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Morning Refreshment Break • 10:20 – 10:40 (20 min)</span>
                            <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-300/80 lowercase">
                              — no class scheduling allowed
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // LUNCH BREAK ROW
                  if (item === "break-lunch") {
                    const lunch = BREAKS[1];
                    return (
                      <tr
                        key="break-lunch"
                        className="bg-orange-500/10 dark:bg-orange-500/15 border-y-2 border-orange-300/70 dark:border-orange-700/60"
                      >
                        <td className="p-2.5 font-bold text-xs text-orange-900 dark:text-orange-200 border-r border-orange-200 dark:border-orange-800/50">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 flex items-center justify-center flex-shrink-0">
                              <Icon name="utensils" className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-[11px] leading-tight">Lunch Break</div>
                              <div className="text-[10px] text-orange-700/80 dark:text-orange-300/80">
                                {lunch.time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td colSpan={DAYS.length} className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-900 dark:text-orange-200">
                            <Icon name="utensils" className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span>Institutional Lunch Recess • 12:30 – 13:25 (55 min)</span>
                            <span className="text-[10px] font-normal text-orange-700/80 dark:text-orange-300/80 lowercase">
                              — afternoon sessions resume at 13:25
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // INSTRUCTIONAL PERIOD ROW (1, 2, 3, 4, 5, 6, 7)
                  const pNum = item;
                  const pDef = PERIODS_SCHEDULE[pNum - 1];

                  return (
                    <tr
                      key={`period-row-${pNum}`}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      {/* Period Label & Time Row Header */}
                      <td className="p-2.5 align-middle border-r border-slate-200/60 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex flex-col">
                          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            {pDef.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {pDef.time}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            Duration: {pDef.durationMin}m
                          </span>
                        </div>
                      </td>

                      {/* Day Columns Cells */}
                      {DAYS.map((dayName) => {
                        const cell = cellMatrix[pNum][dayName];

                        // Skip rendering cell if it was spanned over by rowSpan={2} in the previous period!
                        if (cell.type === "covered") {
                          return null;
                        }

                        // FREE PERIOD CELL
                        if (cell.type === "empty") {
                          return (
                            <td
                              key={dayName}
                              rowSpan={cell.rowSpan || 1}
                              className="p-1.5 align-middle border-r border-slate-200/60 dark:border-slate-700 last:border-r-0"
                            >
                              {editable ? (
                                <button
                                  type="button"
                                  onClick={() => handleSlotCardClick(null, dayName, pNum, pDef.time, 55)}
                                  className="w-full h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition group"
                                >
                                  <Icon
                                    name="plus"
                                    className="w-3.5 h-3.5 mb-0.5 group-hover:scale-110 transition-transform"
                                  />
                                  <span className="text-[9px] font-semibold">Assign</span>
                                </button>
                              ) : (
                                <div className="h-20 rounded-xl border border-dashed border-slate-200/70 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 select-none p-1">
                                  <span className="text-[10px] font-semibold tracking-wider">Free Period</span>
                                  <span className="text-[8.5px] text-slate-400/80 mt-0.5 font-mono">
                                    {pDef.time}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // CLASS / LAB SESSION CELL
                        const slot = cell.slot;
                        const isCombined = cell.isCombined;

                        return (
                          <td
                            key={dayName}
                            rowSpan={cell.rowSpan || 1}
                            className="p-1.5 align-top border-r border-slate-200/60 dark:border-slate-700 last:border-r-0"
                          >
                            <div
                              onClick={() =>
                                handleSlotCardClick(
                                  slot,
                                  dayName,
                                  pNum,
                                  cell.timeRange,
                                  cell.durationMin
                                )
                              }
                              className={`group p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] ${
                                isCombined ? "min-h-[175px]" : "min-h-[85px]"
                              } flex flex-col justify-between ${
                                slot.isProject
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100 hover:border-emerald-400"
                                  : slot.isLab || isCombined
                                  ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/70 text-purple-950 dark:text-purple-100 hover:border-purple-400"
                                  : "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-100 hover:border-indigo-400"
                              }`}
                            >
                              {/* Top Bar: Subject Code + Duration Pill + Type Tag */}
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-tight font-mono ${
                                      slot.isProject
                                        ? "bg-emerald-600 text-white"
                                        : slot.isLab || isCombined
                                        ? "bg-purple-600 text-white"
                                        : "bg-indigo-600 text-white"
                                    }`}
                                  >
                                    {slot.subjectCode}
                                  </span>

                                  {/* Continuous Duration Badge */}
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-tight ${
                                      isCombined
                                        ? "bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100"
                                        : "bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200"
                                    }`}
                                  >
                                    {cell.durationLabel}
                                  </span>
                                </div>

                                {/* Subject Name */}
                                <h5
                                  className="font-bold text-[11px] leading-tight text-slate-900 dark:text-white line-clamp-2"
                                  title={slot.subjectName}
                                >
                                  {slot.subjectName}
                                </h5>

                                {/* Period Number & Exact Timings */}
                                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                                  <Icon name="clock" className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                  <span className="truncate">{cell.periodLabel} • {cell.timeRange}</span>
                                </div>
                              </div>

                              {/* Bottom Section: Faculty & Room */}
                              <div className="pt-1.5 mt-1.5 border-t border-black/5 dark:border-white/10 space-y-1 text-[9.5px]">
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate">
                                  <Icon
                                    name="user"
                                    className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0"
                                  />
                                  <span className="truncate font-medium">{slot.facultyName}</span>
                                </div>

                                <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 truncate font-medium">
                                    <Icon name="building" className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{slot.roomName}</span>
                                  </span>
                                  {slot.batch && slot.batch !== "All" && (
                                    <span className="px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 font-bold text-[8px] text-slate-700 dark:text-slate-200">
                                      {slot.batch}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TERTIARY VIEW: DAY-BY-DAY TIMELINE VIEW                                */}
      {/* ========================================================================= */}
      {viewMode === "daily" && (
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const count = (scheduleByDay[day] || []).length;
              const isSelected = activeDay === day;
              const isToday = highlightToday && day === todayName;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 shadow-xs ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-indigo-500/20"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{day}</span>
                    {isToday && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-indigo-600"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Slots List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon name="calendar" className="w-4 h-4 text-indigo-600" />
                  <span>{activeDay}&rsquo;s Class Schedule</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sequential timetable periods and designated faculty assignments
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">
                {(scheduleByDay[activeDay] || []).length} Scheduled Sessions
              </span>
            </div>

            {!scheduleByDay[activeDay] || scheduleByDay[activeDay].length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700">
                <Icon name="coffee" className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No classes scheduled on {activeDay}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enjoy your free time or schedule academic revisions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {scheduleByDay[activeDay]
                  .sort((a, b) => a.periodNumber - b.periodNumber)
                  .map((slot) => {
                    const pDef = PERIODS_SCHEDULE.find((p) => p.num === slot.periodNumber);
                    return (
                      <div
                        key={slot.id || `${slot.day}-${slot.periodNumber}`}
                        onClick={() =>
                          handleSlotCardClick(
                            slot,
                            activeDay,
                            slot.periodNumber,
                            slot.startTime ? `${slot.startTime} – ${slot.endTime}` : pDef?.time,
                            slot.isLab ? 110 : 55
                          )
                        }
                        className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] ${
                          slot.isProject
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400"
                            : slot.isLab
                            ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:border-purple-400"
                            : "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400"
                        }`}
                      >
                        {/* Header: Period & Time Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs flex items-center gap-1.5">
                            <Icon name="clock" className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {pDef?.label || `Period ${slot.periodNumber}`} •{" "}
                              {slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : pDef?.time || ""}
                            </span>
                          </span>

                          {slot.isLab ? (
                            <span className="px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-[10px] font-bold uppercase flex items-center gap-1">
                              <Icon name="beaker" className="w-3 h-3" />
                              <span>Practical Lab (110m)</span>
                            </span>
                          ) : slot.isProject ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold uppercase">
                              Major Project
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono">
                              {slot.subjectCode}
                            </span>
                          )}
                        </div>

                        {/* Subject Title */}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {slot.subjectName}
                        </h4>

                        {/* Faculty & Room details */}
                        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Icon name="user" className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="truncate">{slot.facultyName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 truncate">
                              <Icon name="building" className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              <span className="truncate">{slot.roomName}</span>
                            </span>
                            {slot.batch && slot.batch !== "All" && (
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold">
                                {slot.batch}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popover / Modal for Slot Details */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    selectedSlot.isLab
                      ? "bg-purple-600 text-white"
                      : selectedSlot.isProject
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {selectedSlot.subjectCode}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedSlot.day} • {selectedSlot.periodLabel || `Period ${selectedSlot.periodNumber}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedSlot.subjectName}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                {selectedSlot.isLab
                  ? "Practical Laboratory Session (110 min Continuous Block)"
                  : selectedSlot.isProject
                  ? "Major Academic Project Phase (110 min Continuous Block)"
                  : "Core Theory Lecture (55 min)"}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 space-y-2 text-xs border border-slate-200/60 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Faculty Instructor:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedSlot.facultyName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Room / Lab Facility:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedSlot.roomName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Exact Timings:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedSlot.displayTimeRange || selectedSlot.startTime ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : "08:30 – 09:25"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Continuous Duration:</span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedSlot.displayDuration || (selectedSlot.isLab ? "110 min" : "55 min")}
                </strong>
              </div>
              {selectedSlot.batch && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Batch:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedSlot.batch}
                  </strong>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
