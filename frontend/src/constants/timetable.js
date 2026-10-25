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
