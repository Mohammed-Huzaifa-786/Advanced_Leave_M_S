import React, { useState } from "react";
import { Icon } from "./Icons";
import {
  DAYS,
  PERIODS_SCHEDULE,
  BREAKS,
  PERIODS_DEF,
} from "../constants/timetable";

export default function TimetablePrintModal({ timetable, onClose }) {
  // Institutional Header Settings
  const [institutionName, setInstitutionName] = useState(
    "B.M.S. INSTITUTE OF TECHNOLOGY & MANAGEMENT"
  );
  const [institutionSub, setInstitutionSub] = useState(
    "Autonomous Institute Affiliated to VTU, Belagavi • Avalahalli, Bengaluru - 560064"
  );
  const [departmentHeader, setDepartmentHeader] = useState(
    `DEPARTMENT OF ${timetable?.department || "COMPUTER SCIENCE & ENGINEERING"}`
  );
  const [roomHeader, setRoomHeader] = useState(timetable?.room || "BSN-CR-104");
  const [wefDate, setWefDate] = useState("01-09-2026");
  const [showConfig, setShowConfig] = useState(false);
  const [layoutFormat, setLayoutFormat] = useState("matrix"); // "matrix" (Days as Rows - Default) | "weekly" (Days as Columns)

  if (!timetable) return null;

  // Group slots by Day
  const scheduleByDay = {};
  DAYS.forEach((d) => {
    scheduleByDay[d] = [];
  });

  const rawSlots =
    timetable.slots && Array.isArray(timetable.slots)
      ? timetable.slots
      : timetable.days
      ? Object.entries(timetable.days).flatMap(([d, sList]) => (sList || []).map((s) => ({ ...s, day: s.day || d })))
      : [];

  rawSlots.forEach((s) => {
    if (scheduleByDay[s.day]) {
      scheduleByDay[s.day].push({
        id: s.id,
        periodNumber: s.periodNumber,
        isLab: Boolean(s.isLab || s.subject?.isLab),
        duration: s.duration || (s.isLab ? 2 : 1),
        subjectCode: s.subject?.code || s.subjectCode || "",
        subjectName: s.subject?.name || s.subjectName || "",
        facultyName: s.faculty?.name || s.facultyName || "",
        roomName: s.room?.name || s.roomName || "",
        batch: s.batch || "All",
        startTime: s.startTime || "",
        endTime: s.endTime || "",
      });
    }
  });

  // Extract unique subjects for Course Directory Legend
  const legendMap = new Map();
  DAYS.forEach((d) => {
    (scheduleByDay[d] || []).forEach((s) => {
      const code = s.subjectCode || s.subjectName;
      if (code && !legendMap.has(code)) {
        legendMap.set(code, {
          code: s.subjectCode,
          name: s.subjectName,
          faculty: s.facultyName,
          room: s.roomName,
          isLab: s.isLab,
        });
      }
    });
  });
  const legendList = Array.from(legendMap.values());

  // Pre-calculate weekly grid matrix (Days as Columns, Periods as Rows)
  const cellMatrix = {};
  for (let pNum = 1; pNum <= 7; pNum++) {
    cellMatrix[pNum] = {};
  }
  const coveredMatrix = {};
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
        };
        continue;
      }

      const canPairWithNext = p !== 2 && p !== 4 && p < 7;
      const nextSlot = canPairWithNext ? slotByPeriod[p + 1] : null;

      const isConsecutivePair =
        canPairWithNext &&
        ((nextSlot &&
          (currentSlot.subjectCode === nextSlot.subjectCode ||
            currentSlot.subjectName === nextSlot.subjectName)) ||
          currentSlot.duration === 2 ||
          currentSlot.isLab);

      if (isConsecutivePair) {
        const nextPDef = PERIODS_SCHEDULE[p];
        cellMatrix[p][day] = {
          type: "slot",
          slot: currentSlot,
          periodNumber: p,
          day,
          rowSpan: 2,
          isCombined: true,
          timeRange: `${pDef.startTime} – ${nextPDef.endTime}`,
          durationLabel: "110 min (Continuous)",
          periodLabel: `${pDef.label} & ${nextPDef.label}`,
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
          timeRange: currentSlot.startTime ? `${currentSlot.startTime} – ${currentSlot.endTime}` : pDef.time,
          durationLabel: "55 min",
          periodLabel: pDef.label,
        };
      }
    }
  });

  // Pre-calculate Days-as-Rows layout (Days as Rows, Periods as Columns)
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
        });
        return;
      }

      const canPairWithNext = p !== 2 && p !== 4 && p < 7;
      const nextSlot = canPairWithNext ? slotByPeriod[p + 1] : null;

      const isConsecutivePair =
        canPairWithNext &&
        ((nextSlot &&
          (currentSlot.subjectCode === nextSlot.subjectCode ||
            currentSlot.subjectName === nextSlot.subjectName)) ||
          (currentSlot.duration === 2 && (!nextSlot || currentSlot.subjectCode === nextSlot?.subjectCode)) ||
          (currentSlot.isLab && nextSlot && currentSlot.subjectCode === nextSlot.subjectCode));

      if (isConsecutivePair) {
        const nextPDef = PERIODS_SCHEDULE[p];
        rowCells.push({
          type: "slot",
          slot: currentSlot,
          secondSlot: nextSlot,
          periodNumber: p,
          day,
          colSpan: 2,
          isCombined: true,
          timeRange: `${pDef.startTime}–${nextPDef.endTime}`,
          durationLabel: "110 min",
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
          timeRange: currentSlot.startTime ? `${currentSlot.startTime}–${currentSlot.endTime}` : col.time,
          durationLabel: "55 min",
        });
      }
    });

    dayRowMatrix[day] = rowCells;
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-2 sm:p-4 flex items-start justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-slate-200">
        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Icon name="printer" className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Timetable Print & PDF Export</h3>
              <p className="text-xs text-slate-500">
                A4 Landscape academic format with institutional headers and signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Layout Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLayoutFormat("weekly")}
                className={`px-2.5 py-1 rounded-md transition ${
                  layoutFormat === "weekly"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Days as Columns
              </button>
              <button
                type="button"
                onClick={() => setLayoutFormat("matrix")}
                className={`px-2.5 py-1 rounded-md transition ${
                  layoutFormat === "matrix"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Days as Rows
              </button>
            </div>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Icon name="filter" className="w-3.5 h-3.5 text-slate-400" />
              <span>{showConfig ? "Hide Config" : "Headers"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Icon name="printer" className="w-3.5 h-3.5 text-indigo-200" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Configuration Drawer (hidden during print) */}
        {showConfig && (
          <div className="no-print p-4 bg-indigo-50/40 border-b border-indigo-100 text-xs">
            <p className="font-semibold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">
              Institutional Header Configuration
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Institution Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Affiliation / Address Subtitle</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  value={institutionSub}
                  onChange={(e) => setInstitutionSub(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Department Header</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  value={departmentHeader}
                  onChange={(e) => setDepartmentHeader(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Room No.</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  value={roomHeader}
                  onChange={(e) => setRoomHeader(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">W.E.F Date</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  value={wefDate}
                  onChange={(e) => setWefDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* PRINTABLE TIMETABLE CONTAINER */}
        <div id="printable-timetable-area" className="p-6 md:p-8 bg-white text-black font-sans">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-black pb-3 mb-3">
            <h1 className="text-base md:text-lg font-black tracking-wide uppercase text-gray-900">
              {institutionName}
            </h1>
            <p className="text-[11px] text-gray-700 font-medium">{institutionSub}</p>
            <h2 className="text-xs md:text-sm font-black uppercase text-gray-800 mt-1">
              {departmentHeader}
            </h2>
            <div className="inline-block bg-gray-100 border border-gray-300 px-3 py-0.5 mt-1 rounded text-[10px] font-bold tracking-wider uppercase text-gray-700">
              Academic Timetable Export • Institutional Standard Schedule
            </div>
          </div>

          {/* Academic Metadata Line */}
          <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] font-semibold border-b border-gray-300 pb-2 mb-3 gap-2">
            <div>
              <span className="text-gray-500">Academic Year:</span>{" "}
              <strong className="text-black">{timetable.academicYear || "2026-27"}</strong>
            </div>
            <div>
              <span className="text-gray-500">Class & Section:</span>{" "}
              <strong className="text-black">
                Sem {timetable.semester || 7} &lsquo;{timetable.section || "A"}&rsquo;
              </strong>
            </div>
            <div>
              <span className="text-gray-500">Room No:</span>{" "}
              <strong className="text-black">{roomHeader}</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500">W.E.F.:</span>{" "}
              <strong className="text-black">{wefDate}</strong>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FORMAT 1: DAYS AS COLUMNS, TIME SLOTS AS ROWS                             */}
          {/* ========================================================================= */}
          {layoutFormat === "weekly" ? (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="border border-black p-1.5 font-bold uppercase w-32">
                      Time Slot / Period
                    </th>
                    {DAYS.map((dayName) => (
                      <th key={dayName} className="border border-black p-1.5 font-bold uppercase min-w-[105px]">
                        {dayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, "break-tea", 3, 4, "break-lunch", 5, 6, 7].map((item) => {
                    if (item === "break-tea") {
                      return (
                        <tr key="tea-row" className="bg-gray-200 border-y border-black font-bold text-[9.5px]">
                          <td className="border border-black p-1 bg-gray-200 font-extrabold">
                            10:20 – 10:40
                          </td>
                          <td colSpan={DAYS.length} className="border border-black p-1 text-center tracking-widest uppercase">
                            TEA / REFRESHMENT BREAK (20 min)
                          </td>
                        </tr>
                      );
                    }
                    if (item === "break-lunch") {
                      return (
                        <tr key="lunch-row" className="bg-gray-200 border-y border-black font-bold text-[9.5px]">
                          <td className="border border-black p-1 bg-gray-200 font-extrabold">
                            12:30 – 13:25
                          </td>
                          <td colSpan={DAYS.length} className="border border-black p-1 text-center tracking-widest uppercase">
                            INSTITUTIONAL LUNCH RECESS (55 min)
                          </td>
                        </tr>
                      );
                    }

                    const pNum = item;
                    const pDef = PERIODS_SCHEDULE[pNum - 1];

                    return (
                      <tr key={`row-${pNum}`} className="border-b border-black">
                        <td className="border border-black p-1 bg-gray-50 font-bold text-[10px] align-middle">
                          <div className="font-black text-black">{pDef.label}</div>
                          <div className="text-[9px] text-gray-700">{pDef.time}</div>
                        </td>

                        {DAYS.map((dayName) => {
                          const cell = cellMatrix[pNum][dayName];
                          if (cell.type === "covered") {
                            return null;
                          }

                          if (cell.type === "empty") {
                            return (
                              <td
                                key={dayName}
                                rowSpan={cell.rowSpan || 1}
                                className="border border-black p-1 align-middle text-gray-400 select-none text-[9px]"
                              >
                                —
                              </td>
                            );
                          }

                          const slot = cell.slot;
                          return (
                            <td
                              key={dayName}
                              rowSpan={cell.rowSpan || 1}
                              className={`border border-black p-1 align-middle ${
                                cell.isCombined ? "bg-gray-100 font-bold" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="font-black text-[11px] text-black tracking-tight">
                                  {slot.subjectCode}
                                </span>
                                <span className="text-[9px] text-gray-900 truncate max-w-[110px] font-semibold mt-0.5">
                                  {slot.subjectName}
                                </span>
                                <span className="text-[8.5px] text-gray-700 truncate max-w-[110px] mt-0.5">
                                  {slot.facultyName}
                                </span>
                                <span className="text-[8px] font-medium text-gray-600 truncate max-w-[110px]">
                                  {slot.roomName} {slot.batch && slot.batch !== "All" ? `[${slot.batch}]` : ""}
                                </span>
                                {cell.isCombined && (
                                  <span className="text-[7.5px] font-black uppercase text-gray-800 bg-gray-300 px-1 rounded mt-0.5">
                                    [110m Continuous Lab]
                                  </span>
                                )}
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
          ) : (
            /* ========================================================================= */
            /* FORMAT 2: DAYS AS ROWS, TIME SLOTS AS COLUMNS                             */
            /* ========================================================================= */
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="border border-black p-1.5 font-bold uppercase w-16">Day</th>
                    {PERIODS_DEF.map((col, idx) => (
                      <th
                        key={idx}
                        className={`border border-black p-1 font-bold ${
                          col.isBreak ? "bg-gray-200 w-12 text-[9px]" : ""
                        }`}
                      >
                        {col.isBreak ? (
                          <>
                            <div className="font-extrabold">{col.shortLabel}: {col.time}</div>
                            <div className="text-[8px] font-normal text-gray-600">{col.duration}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-extrabold">{col.shortLabel}: {col.time}</div>
                            <div className="text-[8.5px] font-normal text-gray-600">55 min</div>
                          </>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((dayName) => {
                    const cells = dayRowMatrix[dayName] || [];
                    return (
                      <tr key={dayName} className="border-b border-black">
                        <td className="border border-black p-1.5 font-black bg-gray-50 uppercase text-[10px]">
                          {dayName.slice(0, 3)}
                        </td>
                        {cells.map((cell, cIdx) => {
                          if (cell.type === "covered") {
                            return null;
                          }

                          if (cell.type === "break") {
                            const isTea = cell.col.breakType === "tea";
                            return (
                              <td
                                key={cIdx}
                                colSpan={cell.colSpan}
                                className="border border-black p-0.5 bg-gray-100 text-[8px] font-black text-gray-600 align-middle select-none"
                              >
                                <div className="flex flex-col items-center justify-center leading-tight">
                                  {isTea ? (
                                    <>
                                      <span>T</span>
                                      <span>E</span>
                                      <span>A</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>L</span>
                                      <span>U</span>
                                      <span>N</span>
                                      <span>C</span>
                                      <span>H</span>
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          if (cell.type === "empty") {
                            return (
                              <td
                                key={cIdx}
                                colSpan={cell.colSpan}
                                className="border border-black p-1 align-middle text-gray-400 select-none text-[9px] h-14"
                              >
                                —
                              </td>
                            );
                          }

                          const slot = cell.slot;
                          return (
                            <td
                              key={cIdx}
                              colSpan={cell.colSpan}
                              className={`border border-black p-1 align-middle h-14 ${
                                cell.isCombined ? "bg-gray-100 font-bold" : slot.isLab ? "bg-gray-50" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="font-black text-[11px] text-black tracking-tight">
                                  {slot.subjectCode}
                                </span>
                                <span className="text-[9px] text-gray-800 truncate max-w-[110px] font-medium mt-0.5">
                                  {slot.facultyName}
                                </span>
                                <span className="text-[8px] font-semibold text-gray-600 truncate max-w-[110px] mt-0.5">
                                  {slot.roomName} {slot.batch && slot.batch !== "All" ? `[${slot.batch}]` : ""}
                                </span>
                                {cell.isCombined && (
                                  <span className="text-[7.5px] font-black uppercase text-gray-800 bg-gray-200 px-1 rounded mt-0.5">
                                    [110m Lab]
                                  </span>
                                )}
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
          )}

          {/* Subject & Faculty Legend Table */}
          {legendList.length > 0 && (
            <div className="border border-black p-2.5 rounded mb-4 text-[10px]">
              <h4 className="font-black uppercase tracking-wider text-[10px] text-gray-800 border-b border-gray-300 pb-1 mb-1.5">
                Course & Faculty Directory
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {legendList.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 leading-tight">
                    <strong className="text-black whitespace-nowrap min-w-[55px]">
                      {item.code}:
                    </strong>
                    <span className="text-gray-800">
                      {item.name} {item.faculty ? `(${item.faculty})` : ""}{" "}
                      {item.isLab ? "[Practical Lab]" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Neutral Signatory Section */}
          <div className="pt-6 mt-6 border-t border-gray-300 text-[10px] font-semibold text-center">
            <div className="grid grid-cols-5 gap-2 items-end">
              <div>
                <div className="border-t border-black w-24 mx-auto mb-1"></div>
                <span>Class Coordinator</span>
              </div>
              <div>
                <div className="border-t border-black w-24 mx-auto mb-1"></div>
                <span>Timetable Committee</span>
              </div>
              <div>
                <div className="border-t border-black w-24 mx-auto mb-1"></div>
                <span>HOD</span>
              </div>
              <div>
                <div className="border-t border-black w-24 mx-auto mb-1"></div>
                <span>Dean (Academic)</span>
              </div>
              <div>
                <div className="border-t border-black w-24 mx-auto mb-1"></div>
                <span>Principal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Print Stylesheet */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-timetable-area,
              #printable-timetable-area * {
                visibility: visible !important;
              }
              #printable-timetable-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 4mm !important;
                background: white !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }} />
      </div>
    </div>
  );
}
