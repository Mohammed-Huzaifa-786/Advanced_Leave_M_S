import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useToast } from "../context/ToastContext";
import TimetablePrintModal from "../components/TimetablePrintModal";
import TimetableGrid from "../components/TimetableGrid";

const MAX_WEEKLY_CAPACITY = 42; // 6 working days * 7 periods

const WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const THEORY_PERIODS = [
  { num: 1, label: "Period I (08:30–09:25)" },
  { num: 2, label: "Period II (09:25–10:20)" },
  { num: 3, label: "Period III (10:40–11:35)" },
  { num: 4, label: "Period IV (11:35–12:30)" },
  { num: 5, label: "Period V (13:25–14:20)" },
  { num: 6, label: "Period VI (14:20–15:15)" },
  { num: 7, label: "Period VII (15:15–16:10)" },
];

const LAB_PERIOD_BLOCKS = [
  { num: 1, label: "Period I–II (08:30–10:20, 110m)" },
  { num: 3, label: "Period III–IV (10:40–12:30, 110m)" },
  { num: 5, label: "Period V–VI (13:25–15:15, 110m)" },
  { num: 6, label: "Period VI–VII (14:20–16:10, 110m)" },
];

function allocateDefaultSlots(subs, externalSlots = [], cohort = { department: "CSE", semester: 7, section: "A" }) {
  const occupiedSectionSlots = new Set();
  const occupiedFacultySlots = new Set();
  const occupiedRoomSlots = new Set();
  const VALID_LAB_STARTS = [1, 3, 5, 6];

  (externalSlots || []).forEach((ext) => {
    const isSameCohort =
      ext.department === cohort.department &&
      Number(ext.semester) === Number(cohort.semester) &&
      ext.section === cohort.section;
    if (!isSameCohort) {
      if (ext.facultyId) occupiedFacultySlots.add(`${ext.facultyId}_${ext.day}_${ext.periodNumber}`);
      if (ext.roomId) occupiedRoomSlots.add(`${ext.roomId}_${ext.day}_${ext.periodNumber}`);
    }
  });

  const sortedSubs = [...subs].sort((a, b) => {
    if (a.isLab && !b.isLab) return -1;
    if (!a.isLab && b.isLab) return 1;
    return 0;
  });

  const resultMap = new Map();

  sortedSubs.forEach((s, sIdx) => {
    const isLab = Boolean(s.isLab);
    const duration = isLab ? (parseInt(s.consecutivePeriods, 10) || 2) : 1;
    const weekly = parseInt(s.weeklyPeriods, 10) || (isLab ? 2 : 4);
    const sessionCount = duration > 1 ? Math.ceil(weekly / duration) : weekly;
    const slots = [];

    for (let i = 0; i < sessionCount; i++) {
      let placed = false;

      for (let dayOffset = 0; dayOffset < WORKING_DAYS.length && !placed; dayOffset++) {
        const dayIdx = (sIdx + i + dayOffset) % WORKING_DAYS.length;
        const day = WORKING_DAYS[dayIdx];
        const allowedStarts = isLab ? VALID_LAB_STARTS : [1, 2, 3, 4, 5, 6, 7];

        for (const p of allowedStarts) {
          let clash = false;
          for (let offset = 0; offset < duration; offset++) {
            const pNum = p + offset;
            const secKey = `${day}_${pNum}`;
            const facKey = s.facultyId ? `${s.facultyId}_${day}_${pNum}` : null;
            const rmKey = s.roomId ? `${s.roomId}_${day}_${pNum}` : null;

            if (
              occupiedSectionSlots.has(secKey) ||
              (facKey && occupiedFacultySlots.has(facKey)) ||
              (rmKey && occupiedRoomSlots.has(rmKey))
            ) {
              clash = true;
              break;
            }
          }

          if (!clash) {
            for (let offset = 0; offset < duration; offset++) {
              const pNum = p + offset;
              occupiedSectionSlots.add(`${day}_${pNum}`);
              if (s.facultyId) occupiedFacultySlots.add(`${s.facultyId}_${day}_${pNum}`);
              if (s.roomId) occupiedRoomSlots.add(`${s.roomId}_${day}_${pNum}`);
            }

            slots.push({
              id: `slot_${s.id || sIdx}_${i}_${Date.now()}`,
              day,
              periodNumber: p,
              duration,
            });
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        slots.push({
          id: `slot_${s.id || sIdx}_${i}_fb`,
          day: WORKING_DAYS[(sIdx + i) % WORKING_DAYS.length],
          periodNumber: isLab ? 5 : (((sIdx + i) % 7) + 1),
          duration,
        });
      }
    }

    resultMap.set(s.id, {
      ...s,
      slots,
      weeklyPeriods: slots.reduce((acc, sl) => acc + (sl.duration || 1), 0),
    });
  });

  return subs.map((s) => resultMap.get(s.id) || s);
}

function buildTemplateSubjects(resData, targetDept = "CSE", targetSem = 7, targetSec = "A") {
  const dept = typeof targetDept === "string" ? targetDept : "CSE";
  const sem = targetSem !== undefined && typeof targetSem !== "object" ? Number(targetSem) : 7;
  const sec = typeof targetSec === "string" ? targetSec : "A";

  const deptSubs = (resData?.subjects || []).filter(
    (s) => s.department === dept && Number(s.semester) === Number(sem)
  );

  if (deptSubs.length === 0) return [];

  const classrooms = (resData?.rooms || []).filter((r) => r.type !== "lab");
  const labs = (resData?.rooms || []).filter((r) => r.type === "lab");

  let sectionClassroom = classrooms[0] || resData?.rooms?.[0];
  if (sec === "A") {
    sectionClassroom = classrooms.find((r) => r.name.includes("105")) || classrooms[1] || classrooms[0];
  } else if (sec === "B") {
    sectionClassroom = classrooms.find((r) => r.name.includes("104")) || classrooms[0];
  } else if (sec === "C") {
    sectionClassroom = classrooms.find((r) => r.name.includes("106")) || classrooms[2] || classrooms[0];
  } else {
    const secIdx = typeof sec === "string" && sec.length > 0 ? sec.charCodeAt(0) - 65 : 0;
    sectionClassroom = classrooms[Math.max(0, secIdx) % (classrooms.length || 1)] || classrooms[0];
  }

  const secOffset = sec === "A" ? 3 : sec === "B" ? 0 : 5;
  const facCount = resData?.faculties?.length || 1;

  const baseMapped = deptSubs.map((s, idx) => {
    const fac = resData?.faculties?.[(idx + secOffset) % facCount];
    let assignedRoom = sectionClassroom;

    if (s.isLab) {
      if (
        s.code?.includes("707") ||
        s.name?.toLowerCase().includes("security") ||
        s.name?.toLowerCase().includes("network")
      ) {
        assignedRoom = labs.find((r) => r.name.toLowerCase().includes("ins")) || labs[0] || sectionClassroom;
      } else {
        assignedRoom = labs.find((r) => r.name.toLowerCase().includes("pc")) || labs[1] || labs[0] || sectionClassroom;
      }
    }

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      weeklyPeriods: s.weeklyPeriods || 4,
      isLab: s.isLab || false,
      consecutivePeriods: s.consecutivePeriods || (s.isLab ? 2 : 1),
      facultyId: fac?.id || "",
      facultyName: fac?.name || "",
      roomId: assignedRoom?.id || "",
      roomName: assignedRoom?.name || "",
      preferredDay: "",
      batch: s.isLab ? "B1/B2" : "All",
    };
  });

  return allocateDefaultSlots(baseMapped, resData?.externalSlots || [], { department: dept, semester: sem, section: sec });
}

export default function TimetableGenerator() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  // Step 1: Basic Details
  const [name, setName] = useState("CSE - Semester 7 - Section A");
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState(7);
  const [section, setSection] = useState("A");
  const [academicYear, setAcademicYear] = useState("2026-27");

  // Step 2: Academic Resources
  const [resources, setResources] = useState({ subjects: [], faculties: [], rooms: [] });
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [conflictModalData, setConflictModalData] = useState(null);

  // Step 3 & 4: Generation Results
  const [generationReport, setGenerationReport] = useState(null);
  const [previewSlots, setPreviewSlots] = useState([]);
  const [activeStep, setActiveStep] = useState(1);
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        const res = await api.get("/timetable/admin/resources");
        const resData = res.data || { subjects: [], faculties: [], rooms: [] };
        setResources(resData);

        if (editId) {
          const ttRes = await api.get("/timetable/admin/list");
          const existing = (ttRes.data || []).find((t) => String(t.id) === String(editId));
          if (existing) {
            setName(existing.name);
            setDepartment(existing.department);
            setSemester(existing.semester);
            setSection(existing.section);
            setAcademicYear(existing.academicYear || "2026-27");
            setPreviewSlots(existing.slots || []);

            // Reconstruct assignedSubjects so the admin can review or re-run generator
            const subMap = new Map();
            (existing.slots || []).forEach((slot) => {
              const key = slot.subjectId || slot.subject?.id || slot.subjectCode || slot.subject?.code;
              if (!key) return;
              if (!subMap.has(key)) {
                subMap.set(key, {
                  id: slot.subjectId || slot.subject?.id || Date.now(),
                  name: slot.subject?.name || slot.subjectName || "Subject",
                  code: slot.subject?.code || slot.subjectCode || "SUB",
                  facultyId: slot.facultyId || slot.faculty?.id || "",
                  facultyName: slot.faculty?.name || slot.facultyName || "",
                  roomId: slot.roomId || slot.room?.id || "",
                  roomName: slot.room?.name || slot.roomName || "",
                  weeklyPeriods: 0,
                  isLab: Boolean(slot.isLab || slot.subject?.isLab),
                  consecutivePeriods: slot.duration || (slot.isLab ? 2 : 1),
                  preferredDay: "",
                  batch: slot.batch || (slot.isLab ? "B1/B2" : "All"),
                  slots: [],
                });
              }
              const item = subMap.get(key);
              item.weeklyPeriods += (slot.duration || 1);
              const isDuplicate = item.slots.some(
                (s) => s.day === slot.day && Math.abs(s.periodNumber - slot.periodNumber) < (s.duration || 1)
              );
              if (!isDuplicate) {
                item.slots.push({
                  id: slot.id || `slot_${slot.day}_${slot.periodNumber}`,
                  day: slot.day,
                  periodNumber: slot.periodNumber,
                  duration: slot.duration || (item.isLab ? 2 : 1),
                });
              }
            });
            if (subMap.size > 0) {
              setAssignedSubjects(Array.from(subMap.values()));
            }

            setActiveStep(4);
          }
        } else {
          // Automatically populate initial cohort subjects for immediate generation
          const initialSubs = buildTemplateSubjects(resData, "CSE", 7, "A");
          if (initialSubs.length > 0) {
            setAssignedSubjects(initialSubs);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load timetable resources");
      }
    }

    loadResources();
  }, [editId, toast]);

  function addSubjectRow() {
    const defaultSub = resources.subjects[0];
    const defaultFac = resources.faculties[0];
    const defaultRoom = resources.rooms[0];

    setAssignedSubjects((prev) => [
      ...prev,
      {
        id: defaultSub?.id || Date.now(),
        name: defaultSub?.name || "New Subject",
        code: defaultSub?.code || "SUB101",
        facultyId: defaultFac?.id || "",
        facultyName: defaultFac?.name || "",
        roomId: defaultRoom?.id || "",
        roomName: defaultRoom?.name || "",
        weeklyPeriods: 3,
        isLab: false,
        consecutivePeriods: 1,
        preferredDay: "",
        batch: "All",
        slots: [
          { id: `slot_${Date.now()}_1`, day: "Monday", periodNumber: 1, duration: 1 },
          { id: `slot_${Date.now()}_2`, day: "Wednesday", periodNumber: 2, duration: 1 },
          { id: `slot_${Date.now()}_3`, day: "Friday", periodNumber: 1, duration: 1 },
        ],
      },
    ]);
  }

  function handleAddSlot(subIdx) {
    const updated = [...assignedSubjects];
    const sub = updated[subIdx];
    const dur = sub.isLab ? 2 : 1;
    const currentSlots = sub.slots || [];

    const existingDays = currentSlots.map((s) => s.day);
    const nextDay = WORKING_DAYS.find((d) => !existingDays.includes(d)) || WORKING_DAYS[currentSlots.length % WORKING_DAYS.length];
    const nextP = sub.isLab ? 5 : ((currentSlots.length % 7) + 1);

    const newSlots = [
      ...currentSlots,
      {
        id: `slot_${sub.id}_${Date.now()}`,
        day: nextDay,
        periodNumber: nextP,
        duration: dur,
      },
    ];

    sub.slots = newSlots;
    sub.weeklyPeriods = newSlots.reduce((sum, s) => sum + (s.duration || 1), 0);
    setAssignedSubjects(updated);
  }

  function handleRemoveSlot(subIdx, slotIdx) {
    const updated = [...assignedSubjects];
    const sub = updated[subIdx];
    const newSlots = (sub.slots || []).filter((_, i) => i !== slotIdx);
    sub.slots = newSlots;
    sub.weeklyPeriods = newSlots.reduce((sum, s) => sum + (s.duration || 1), 0);
    setAssignedSubjects(updated);
  }

  function handleUpdateSlot(subIdx, slotIdx, field, value) {
    const updated = [...assignedSubjects];
    const sub = updated[subIdx];
    const slots = [...(sub.slots || [])];
    slots[slotIdx] = {
      ...slots[slotIdx],
      [field]: value,
    };
    sub.slots = slots;
    setAssignedSubjects(updated);
  }

  function findSlotClash(currentSub, currentSlot, currentSubIdx, currentSlotIdx) {
    if (!currentSlot || !currentSlot.day || !currentSlot.periodNumber) return null;
    const dur = currentSlot.duration || (currentSub.isLab ? 2 : 1);

    if (dur === 2) {
      if (currentSlot.periodNumber === 2) {
        return "Crosses Tea Break (Period II to III)";
      }
      if (currentSlot.periodNumber === 4) {
        return "Crosses Lunch Break (Period IV to V)";
      }
      if (currentSlot.periodNumber > 6) {
        return "Exceeds daily boundary (Period 8 does not exist)";
      }
    }

    for (let offset = 0; offset < dur; offset++) {
      const p = currentSlot.periodNumber + offset;

      for (let sIdx = 0; sIdx < assignedSubjects.length; sIdx++) {
        const otherSub = assignedSubjects[sIdx];
        const otherSlots = otherSub.slots || [];

        for (let osIdx = 0; osIdx < otherSlots.length; osIdx++) {
          if (sIdx === currentSubIdx && osIdx === currentSlotIdx) continue;
          const otherSlot = otherSlots[osIdx];
          if (otherSlot.day !== currentSlot.day) continue;

          const otherDur = otherSlot.duration || (otherSub.isLab ? 2 : 1);
          const otherStart = otherSlot.periodNumber;
          const otherEnd = otherStart + otherDur - 1;

          if (p >= otherStart && p <= otherEnd) {
            return `Section clash with ${otherSub.name || "another class"} on ${currentSlot.day} Period ${p}`;
          }

          if (
            currentSub.facultyId &&
            otherSub.facultyId &&
            String(currentSub.facultyId) === String(otherSub.facultyId) &&
            p >= otherStart &&
            p <= otherEnd
          ) {
            return `Faculty clash: ${currentSub.facultyName || "Faculty"} is also assigned to ${otherSub.name}`;
          }

          if (
            currentSub.roomId &&
            otherSub.roomId &&
            String(currentSub.roomId) === String(otherSub.roomId) &&
            p >= otherStart &&
            p <= otherEnd
          ) {
            return `Room clash: ${currentSub.roomName || "Room"} is also assigned to ${otherSub.name}`;
          }
        }
      }
    }

    return null;
  }

  function handleSelectPredefinedSubject(subId, index) {
    const found = resources.subjects.find((s) => String(s.id) === String(subId));
    if (!found) return;

    const updated = [...assignedSubjects];
    updated[index] = {
      ...updated[index],
      id: found.id,
      name: found.name,
      code: found.code,
      weeklyPeriods: found.weeklyPeriods || 4,
      isLab: found.isLab || false,
      consecutivePeriods: found.consecutivePeriods || (found.isLab ? 2 : 1),
    };
    setAssignedSubjects(updated);
  }

  function handleUpdateSubject(index, field, value) {
    const updated = [...assignedSubjects];
    updated[index][field] = value;

    if (field === "facultyId") {
      const fac = resources.faculties.find((f) => String(f.id) === String(value));
      updated[index].facultyName = fac ? fac.name : "";
    }
    if (field === "roomId") {
      const rm = resources.rooms.find((r) => String(r.id) === String(value));
      updated[index].roomName = rm ? rm.name : "";
    }
    if (field === "isLab") {
      updated[index].consecutivePeriods = value ? 2 : 1;
      const newDur = value ? 2 : 1;
      const currentSlots = updated[index].slots || [];
      updated[index].slots = currentSlots.map((s) => ({
        ...s,
        duration: newDur,
        periodNumber: value ? 5 : s.periodNumber,
      }));
      if (value) {
        const labRoom = resources.rooms.find((r) => r.type === "lab");
        if (labRoom) {
          updated[index].roomId = labRoom.id;
          updated[index].roomName = labRoom.name;
        }
      }
    }
    if (field === "weeklyPeriods") {
      const newCount = Math.max(1, parseInt(value, 10) || 1);
      updated[index].weeklyPeriods = newCount;
      const dur = updated[index].isLab ? 2 : 1;
      const targetSessions = dur > 1 ? Math.ceil(newCount / dur) : newCount;
      let currentSlots = [...(updated[index].slots || [])];
      while (currentSlots.length < targetSessions) {
        const day = WORKING_DAYS[currentSlots.length % WORKING_DAYS.length];
        currentSlots.push({
          id: `slot_${updated[index].id}_${Date.now()}_${currentSlots.length}`,
          day,
          periodNumber: dur > 1 ? 5 : ((currentSlots.length % 7) + 1),
          duration: dur,
        });
      }
      if (currentSlots.length > targetSessions) {
        currentSlots = currentSlots.slice(0, targetSessions);
      }
      updated[index].slots = currentSlots;
    }

    setAssignedSubjects(updated);
  }

  function removeSubject(index) {
    setAssignedSubjects((prev) => prev.filter((_, i) => i !== index));
  }

  function loadDepartmentTemplate(targetSec = section, targetDept = department, targetSem = semester) {
    const safeSec = typeof targetSec === "string" ? targetSec : section;
    const safeDept = typeof targetDept === "string" ? targetDept : department;
    const safeSem = targetSem !== undefined && typeof targetSem !== "object" ? Number(targetSem) : Number(semester);

    const mapped = buildTemplateSubjects(resources, safeDept, safeSem, safeSec);
    if (mapped.length > 0) {
      setAssignedSubjects(mapped);
      toast.info(`Loaded ${mapped.length} subjects with user-defined slots for ${safeDept} Sem ${safeSem} Sec ${safeSec}`);
      setActiveStep(2);
    } else {
      addSubjectRow();
      setActiveStep(2);
    }
  }

  function syncAssignedSubjectsFromSlots(resolvedSlots = []) {
    setAssignedSubjects((prev) =>
      prev.map((sub) => {
        const subSlots = resolvedSlots.filter(
          (s) => String(s.subjectId) === String(sub.id) || (s.subjectCode && s.subjectCode === sub.code)
        );
        if (subSlots.length === 0) return sub;

        const mergedSlots = [];
        const isLab = Boolean(sub.isLab);
        const expectedDur = isLab ? (parseInt(sub.consecutivePeriods, 10) || 2) : 1;

        const sorted = [...subSlots].sort((a, b) => {
          if (a.day !== b.day) return a.day.localeCompare(b.day);
          return a.periodNumber - b.periodNumber;
        });

        for (let i = 0; i < sorted.length; i++) {
          const slot = sorted[i];
          if (expectedDur > 1) {
            const isPartOfPrevious = mergedSlots.some(
              (ms) => ms.day === slot.day && slot.periodNumber > ms.periodNumber && slot.periodNumber < ms.periodNumber + ms.duration
            );
            if (!isPartOfPrevious) {
              mergedSlots.push({
                id: slot.id || `slot_${slot.day}_${slot.periodNumber}`,
                day: slot.day,
                periodNumber: slot.periodNumber,
                duration: slot.duration || expectedDur,
              });
            }
          } else {
            mergedSlots.push({
              id: slot.id || `slot_${slot.day}_${slot.periodNumber}`,
              day: slot.day,
              periodNumber: slot.periodNumber,
              duration: 1,
            });
          }
        }

        return {
          ...sub,
          slots: mergedSlots,
          weeklyPeriods: sorted.length,
        };
      })
    );
  }

  async function handleGenerate(resolveConflicts = false) {
    const isResolving = typeof resolveConflicts === "boolean" ? resolveConflicts : false;
    if (assignedSubjects.length === 0) {
      toast.warning("Please add at least one subject before running the generator.");
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post("/timetable/admin/generate", {
        department,
        semester: parseInt(semester, 10),
        section,
        academicYear,
        subjects: assignedSubjects,
        timetableId: editId || null,
        resolveConflicts: Boolean(isResolving),
        mode: "user-controlled",
      });

      setGenerationReport(res.data);
      setGenerating(false);

      if (res.data.success) {
        setPreviewSlots(res.data.slots || []);
        if (res.data.mode === "minimal-resolved" && res.data.proposedChanges?.length > 0) {
          syncAssignedSubjectsFromSlots(res.data.slots);
        }
        setConflictModalData(null);
        setValidationResult({
          isValid: res.data.isPublishable ?? true,
          isPublishable: res.data.isPublishable ?? true,
          hardConstraintViolations: res.data.hardConstraintViolations || [],
          totalGaps: res.data.totalGaps || 0,
          compactnessPercentage: res.data.compactnessPercentage || 100,
        });
        setActiveStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.success(
          res.data.message || `Clash-free timetable computed successfully! (${res.data.totalSlotsScheduled} slots)`
        );
      } else {
        if (res.data.hasConflicts) {
          setConflictModalData({
            isOpen: true,
            conflicts: res.data.conflicts || [],
            proposedChanges: res.data.proposedChanges || [],
            canResolve: Boolean(res.data.canResolve),
            unresolvableReasons: res.data.unresolvableReasons || [],
            preservedCount: res.data.preservedCount || 0,
            totalSlots: res.data.totalSlotsScheduled || 0,
          });
        }
        setValidationResult({
          isValid: false,
          isPublishable: false,
          hardConstraintViolations: res.data.conflicts || res.data.unresolvedConflicts || [{ description: "Infeasible schedule constraints" }],
        });
        toast.warning(
          res.data.message || `Conflicts detected in user schedule.`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Generation error occurred");
    } finally {
      setGenerating(false);
    }
  }

  async function handleValidateSchedule() {
    if (previewSlots.length === 0) {
      toast.warning("Please generate a schedule preview before running validation.");
      return;
    }

    try {
      setValidating(true);
      const res = await api.post("/timetable/admin/validate", {
        slots: previewSlots,
        timetableId: editId || null,
        subjects: assignedSubjects,
        department,
        semester: parseInt(semester, 10),
        section,
      });

      setValidationResult(res.data);
      if (res.data.isValid) {
        toast.success(
          `Schedule validation PASSED: Zero clashes, continuous 110m multi-period blocks, and all ${totalAllocatedPeriods} required periods verified.`
        );
      } else {
        toast.error(
          `Validation failed: ${res.data.hardConstraintViolations?.length || 1} constraint violation(s) detected.`
        );
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast.error(err.response?.data?.message || "Failed to validate schedule");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave(status = "draft", confirmReplace = false) {
    if (previewSlots.length === 0) {
      toast.warning("Please generate a schedule preview before saving.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/timetable/admin/save", {
        id: editId || null,
        name,
        department,
        semester: parseInt(semester, 10),
        section,
        academicYear,
        status,
        slots: previewSlots,
        confirmReplace,
        subjects: assignedSubjects,
      });

      toast.success(
        status === "published"
          ? "Timetable saved and published for students!"
          : "Timetable saved as draft."
      );
      navigate("/timetable-management");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409 && err.response?.data?.requiresConfirmation) {
        const replaceConfirmed = window.confirm(
          `${err.response.data.message}\n\nClick OK to replace the active published timetable, or Cancel to keep the existing schedule active and save this as a draft.`
        );
        if (replaceConfirmed) {
          handleSave("published", true);
        } else {
          handleSave("draft", false);
        }
        return;
      }
      toast.error(err.response?.data?.message || "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  }

  // Capacity calculations
  const totalAllocatedPeriods = assignedSubjects.reduce(
    (sum, s) => sum + (parseInt(s.weeklyPeriods, 10) || 0),
    0
  );
  const capacityPercent = Math.min(
    100,
    Math.round((totalAllocatedPeriods / MAX_WEEKLY_CAPACITY) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Intelligent Timetable Generator"
          subtitle="Constraint-satisfaction backtracking engine with automatic clash detection and room/faculty allocation."
          icon="sparkles"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Timetable Management", to: "/timetable-management" },
            { label: "Generator" },
          ]}
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadDepartmentTemplate()}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs flex items-center gap-1.5"
              >
                <Icon name="refresh" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Load Template</span>
              </button>
            </div>
          }
        />

        {/* MODERN 4-STEP WORKFLOW STEPPER */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { num: 1, title: "Cohort Parameters", desc: "Dept, Semester & Section" },
              { num: 2, title: "Subject & Faculty Mapping", desc: "Weekly Periods & Labs" },
              { num: 3, title: "Conflict Intelligence", desc: "Clashes & Backtracking" },
              { num: 4, title: "Schedule Matrix Preview", desc: "Verify, Publish & Print" },
            ].map((s) => {
              const isCurrent = activeStep === s.num;
              const isPast = activeStep > s.num || (s.num < 4 && previewSlots.length > 0);

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    setActiveStep(s.num);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    isCurrent
                      ? "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20"
                      : isPast
                      ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/60"
                      : "bg-transparent border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? "bg-indigo-600 text-white"
                          : isPast
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {isPast ? "✓" : s.num}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {s.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pl-8">
                    {s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: Timetable Header Settings */}
        {activeStep === 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Academic Cohort Parameters
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Specify targeted department, semester, section, and academic calendar year.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Department *
                </label>
                <select
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  value={department}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setDepartment(newDept);
                    setName(`${newDept} - Semester ${semester} - Section ${section}`);
                    const subs = buildTemplateSubjects(resources, newDept, semester, section);
                    if (subs.length > 0) setAssignedSubjects(subs);
                  }}
                >
                  <option value="CSE">CSE</option>
                  <option value="ISE">ISE</option>
                  <option value="ECE">ECE</option>
                  <option value="AIML">AIML</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Semester *
                </label>
                <select
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  value={semester}
                  onChange={(e) => {
                    const newSem = Number(e.target.value);
                    setSemester(newSem);
                    setName(`${department} - Semester ${newSem} - Section ${section}`);
                    const subs = buildTemplateSubjects(resources, department, newSem, section);
                    if (subs.length > 0) setAssignedSubjects(subs);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Section *
                </label>
                <select
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  value={section}
                  onChange={(e) => {
                    const newSec = e.target.value;
                    setSection(newSec);
                    setName(`${department} - Semester ${semester} - Section ${newSec}`);
                    const subs = buildTemplateSubjects(resources, department, semester, newSec);
                    if (subs.length > 0) setAssignedSubjects(subs);
                  }}
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
              >
                <span>Proceed to Subject & Faculty Mapping</span>
                <Icon name="arrowRight" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Subject & Resource Assignments with Capacity Tracker */}
        {activeStep === 2 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-xs">
                  2
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Subject, Faculty & Facility Mapping
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {department} • Sem {semester} • Sec {section}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign weekly periods, designated instructors, and specialized laboratory rooms.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => loadDepartmentTemplate()}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Auto-Fill {department} Sem {semester}
                </button>
                <button
                  type="button"
                  onClick={addSubjectRow}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            </div>

            {/* Live Weekly Capacity Meter */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Weekly Timetable Capacity:
                  </span>
                  <span
                    className={`text-xs font-extrabold ${
                      totalAllocatedPeriods > MAX_WEEKLY_CAPACITY
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {totalAllocatedPeriods} / {MAX_WEEKLY_CAPACITY} Periods
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    ({MAX_WEEKLY_CAPACITY - totalAllocatedPeriods} free periods remaining)
                  </span>
                </div>
                <div className="w-full sm:w-64 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalAllocatedPeriods > MAX_WEEKLY_CAPACITY
                        ? "bg-rose-500"
                        : totalAllocatedPeriods >= 30
                        ? "bg-emerald-500"
                        : "bg-indigo-600"
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  ← Edit Cohort
                </button>
                <button
                  type="button"
                  disabled={generating || assignedSubjects.length === 0}
                  onClick={() => handleGenerate(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-2 justify-center"
                >
                  <Icon name="sparkles" className={`w-4 h-4 text-indigo-200 ${generating ? "animate-spin" : ""}`} />
                  <span>{generating ? "Solving Constraints..." : "Run Timetable Generator"}</span>
                </button>
              </div>
            </div>

          {/* Subjects Mapping Cards */}
          {assignedSubjects.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
              <Icon name="bookOpen" className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold mb-1">
                No subjects assigned yet
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-4">
                Click below to load the standard department curriculum or add custom subjects.
              </p>
              <div className="flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => loadDepartmentTemplate()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Load Department Template
                </button>
                <button
                  type="button"
                  onClick={addSubjectRow}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs"
                >
                  Add Custom Row
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedSubjects.map((sub, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    sub.isLab
                      ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/70"
                      : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700"
                  } flex flex-col gap-3.5 hover:border-indigo-300 dark:hover:border-indigo-700`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {/* Subject Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Course / Subject
                        </label>
                        {resources.subjects.length > 0 ? (
                          <select
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold"
                            value={sub.id}
                            onChange={(e) => handleSelectPredefinedSubject(e.target.value, idx)}
                          >
                            {resources.subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.code} - {s.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold"
                            value={sub.name}
                            onChange={(e) => handleUpdateSubject(idx, "name", e.target.value)}
                          />
                        )}
                      </div>

                      {/* Faculty Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Instructor / Faculty
                        </label>
                        <select
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold"
                          value={sub.facultyId}
                          onChange={(e) => handleUpdateSubject(idx, "facultyId", e.target.value)}
                        >
                          <option value="">-- Select Faculty Member --</option>
                          {resources.faculties.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.department})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Room Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Classroom / Lab Facility
                        </label>
                        <select
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold"
                          value={sub.roomId}
                          onChange={(e) => handleUpdateSubject(idx, "roomId", e.target.value)}
                        >
                          <option value="">-- Select Room --</option>
                          {resources.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.type === "lab" ? "Lab" : "Classroom"})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Load Controls & Options */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-center">
                          Periods/Wk
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs text-center font-bold"
                          value={sub.weeklyPeriods}
                          onChange={(e) => handleUpdateSubject(idx, "weeklyPeriods", e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={sub.isLab}
                            onChange={(e) => handleUpdateSubject(idx, "isLab", e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                          />
                          <span className={sub.isLab ? "text-purple-700 dark:text-purple-300" : ""}>
                            Lab (2 Periods)
                          </span>
                        </label>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => removeSubject(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Remove Subject"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* USER-CONTROLLED CLASS SLOTS EDITOR */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Configured Time Slots ({sub.slots?.length || 0} Sessions • {sub.slots?.reduce((sum, s) => sum + (s.duration || 1), 0) || 0} Periods)
                        </span>
                        {sub.isLab && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            Continuous 110m Lab Blocks
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSlot(idx)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                      >
                        <Icon name="plus" className="w-3 h-3" />
                        <span>Add Slot</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(sub.slots || []).map((slot, slotIdx) => {
                        const clash = findSlotClash(sub, slot, idx, slotIdx);
                        return (
                          <div
                            key={slot.id || slotIdx}
                            className={`p-2.5 rounded-xl border transition ${
                              clash
                                ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700"
                                : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                              <span>Slot {slotIdx + 1} ({slot.duration > 1 ? `${slot.duration * 55}m Lab` : "55m"})</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(idx, slotIdx)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Remove Slot"
                              >
                                <Icon name="trash" className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Day</label>
                                <select
                                  value={slot.day}
                                  onChange={(e) => handleUpdateSlot(idx, slotIdx, "day", e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded text-xs font-medium"
                                >
                                  {WORKING_DAYS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Period</label>
                                <select
                                  value={slot.periodNumber}
                                  onChange={(e) => handleUpdateSlot(idx, slotIdx, "periodNumber", Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded text-xs font-medium"
                                >
                                  {sub.isLab || slot.duration > 1 ? (
                                    LAB_PERIOD_BLOCKS.map((pb) => (
                                      <option key={pb.num} value={pb.num}>{pb.label}</option>
                                    ))
                                  ) : (
                                    THEORY_PERIODS.map((tp) => (
                                      <option key={tp.num} value={tp.num}>{tp.label}</option>
                                    ))
                                  )}
                                </select>
                              </div>
                            </div>
                            {clash && (
                              <div className="mt-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <Icon name="alertTriangle" className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate" title={clash}>{clash}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {assignedSubjects.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
              >
                ← Edit Cohort Parameters
              </button>
              <button
                type="button"
                disabled={generating || assignedSubjects.length === 0}
                onClick={() => handleGenerate(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-2 justify-center"
              >
                <Icon name="sparkles" className={`w-4 h-4 text-indigo-200 ${generating ? "animate-spin" : ""}`} />
                <span>{generating ? "Solving Constraints..." : "Run Timetable Generator"}</span>
              </button>
            </div>
          )}
        </div>
      )}

        {/* STEP 3: Quality, Zero-Gap Optimization & Constraint Audit Panel */}
        {activeStep === 3 && (
          <div className="space-y-4">
            {generationReport ? (
              <div
                className={`rounded-2xl p-5 sm:p-6 shadow-sm border transition-all ${
                  generationReport.success && (generationReport.totalGaps || 0) === 0
                    ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                    : generationReport.success
                    ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100"
                    : "bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100"
                }`}
              >
                {/* Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                        generationReport.success && (generationReport.totalGaps || 0) === 0
                          ? "bg-emerald-600 text-white shadow-emerald-600/20"
                          : generationReport.success
                          ? "bg-indigo-600 text-white shadow-indigo-600/20"
                          : "bg-rose-600 text-white shadow-rose-600/20"
                      }`}
                    >
                      <Icon
                        name={generationReport.success ? "checkCircle" : "alertTriangle"}
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold">
                          {generationReport.success && (generationReport.totalGaps || 0) === 0
                            ? "100% Conflict-Free & Fully Consecutive Schedule"
                            : generationReport.success
                            ? "100% Conflict-Free Schedule (Optimized)"
                            : "Constraint Infeasibility Detected"}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            generationReport.isPublishable
                              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              : "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                          }`}
                        >
                          {generationReport.isPublishable ? "Publishable" : "Draft Only"}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">
                        {generationReport.success
                          ? `Successfully scheduled ${generationReport.totalSlotsScheduled} periods with zero hard clashes and minimum free periods.`
                          : "Could not schedule all required classes due to resource or capacity limits."}
                      </p>
                    </div>
                  </div>

                  {/* Quick Publish / Draft Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave("draft")}
                      disabled={saving}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave("published")}
                      disabled={saving || !generationReport.isPublishable}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <Icon name="checkCircle" className="w-4 h-4" />
                      <span>Publish Schedule</span>
                    </button>
                  </div>
                </div>

                {/* Quality & Gap Optimization Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
                  {/* Hard Clashes */}
                  {(() => {
                    const clashCount = Array.isArray(generationReport.finalClashes)
                      ? generationReport.finalClashes.length
                      : typeof generationReport.finalClashes === "number"
                      ? generationReport.finalClashes
                      : 0;
                    return (
                      <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-black/5 dark:border-white/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Hard Clashes</span>
                        <p
                          className={`text-lg font-black mt-0.5 flex items-center gap-1 ${
                            clashCount === 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <span>{clashCount}</span>
                          <span
                            className={`text-xs font-semibold ${
                              clashCount === 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            ({clashCount} Violations)
                          </span>
                        </p>
                      </div>
                    );
                  })()}

                  {/* Free Periods / Gaps */}
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-black/5 dark:border-white/10">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Free Periods (Gaps)</span>
                    <p className={`text-lg font-black mt-0.5 ${(generationReport.totalGaps || 0) === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {generationReport.totalGaps || 0}
                      <span className="text-xs font-semibold ml-1.5 opacity-80">
                        {(generationReport.totalGaps || 0) === 0 ? "Zero Gaps" : "Unavoidable"}
                      </span>
                    </p>
                  </div>

                  {/* Avoidable Gaps Eliminated */}
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-black/5 dark:border-white/10">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Gaps Eliminated</span>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {generationReport.avoidableGapsEliminated || 0}
                    </p>
                  </div>

                  {/* Compactness Percentage */}
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-black/5 dark:border-white/10">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Daily Compactness</span>
                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {generationReport.compactnessPercentage || 100}%
                    </p>
                  </div>

                  {/* Total Scheduled */}
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-black/5 dark:border-white/10">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Classes Scheduled</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {generationReport.totalSlotsScheduled} / {totalAllocatedPeriods}
                    </p>
                  </div>
                </div>

                {/* Daily Contiguity & Workload Breakdown */}
                {generationReport.dailyMetrics && Object.keys(generationReport.dailyMetrics).length > 0 && (
                  <div className="mt-3 p-3.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 mb-2.5">
                      <Icon name="calendar" className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Daily Contiguity & Gap Analysis</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {Object.entries(generationReport.dailyMetrics).map(([day, m]) => (
                        <div
                          key={day}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            m.classCount === 0
                              ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400"
                              : m.isConsecutive
                              ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                              : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                          }`}
                        >
                          <span className="text-xs font-bold block">{day}</span>
                          <span className="text-[11px] font-semibold block mt-0.5">
                            {m.classCount > 0 ? `${m.classCount} Classes` : "Free Day"}
                          </span>
                          {m.classCount > 0 && (
                            <span className="text-[10px] opacity-75 block font-mono">
                              P{m.firstPeriod} - P{m.lastPeriod}
                            </span>
                          )}
                          <span
                            className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              m.classCount === 0
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                : m.isConsecutive
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {m.classCount === 0
                              ? "Off"
                              : m.isConsecutive
                              ? "Consecutive (0 Gaps)"
                              : `${m.gapCount} Gap(s)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unavoidable Gaps Diagnostic Explanations */}
                {generationReport.unavoidableGaps?.length > 0 && (
                  <div className="mt-3 p-3.5 bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300 mb-1">
                      <Icon name="info" className="w-3.5 h-3.5 text-amber-600" />
                      <span>Unavoidable Free Periods Diagnostic Rationale</span>
                    </div>
                    <div className="space-y-1">
                      {generationReport.unavoidableGaps.map((ug, uIdx) => (
                        <div
                          key={uIdx}
                          className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                        >
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {ug.day} • {ug.periodLabel} ({ug.time}):
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">{ug.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backtracking Resolution Log */}
                {generationReport.resolutionLogs?.length > 0 && (
                  <div className="mt-3 p-3.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-black/5 dark:border-white/10 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                      <Icon name="zap" className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Backtracking Constraint Resolution Audit Log</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {generationReport.resolutionLogs.map((log, lIdx) => (
                        <div
                          key={lIdx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                              {log.subject}:
                            </span>
                            <span>{log.conflict}</span>
                          </div>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold self-start sm:self-auto">
                            ↳ {log.resolution}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unresolved Conflicts & Constraint Infeasibility Diagnostics */}
                {generationReport.unresolvedConflicts?.length > 0 && (
                  <div className="mt-3 p-3.5 bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-rose-800 dark:text-rose-300">
                      <Icon name="alertTriangle" className="w-3.5 h-3.5 text-rose-600" />
                      <span>Constraint Infeasibility Diagnostic Breakdown</span>
                    </div>
                    <div className="space-y-2">
                      {generationReport.unresolvedConflicts.map((conf, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-rose-200/60 dark:border-rose-800/40 text-slate-700 dark:text-slate-300 space-y-1.5 text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-700 dark:text-rose-400">
                              {conf.subject}
                            </span>
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold">
                              Unscheduled Class
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">
                            {conf.reason}
                          </p>
                          {conf.suggestedAlternatives?.length > 0 && (
                            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                Recommended Action:
                              </span>
                              <ul className="list-disc list-inside mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                {conf.suggestedAlternatives.map((alt, aIdx) => (
                                  <li key={aIdx}>{alt}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3 Bottom Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    ← Back to Subject & Faculty Mapping
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(4);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                  >
                    <span>View Schedule Matrix Preview (Step 4) →</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                  <Icon name="sparkles" className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    No Quality & Conflict Audit Available Yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Please configure your academic cohort subjects in Step 2 and run the timetable generator to produce an audit report.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(2);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Go to Step 2: Subject & Faculty Mapping →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Interactive Weekly Timetable Matrix Preview */}
        {activeStep === 4 && (
          <div className="space-y-4">
            {previewSlots.length > 0 ? (
              <div className="space-y-4">
                {/* Step 4 Quality & Quick Actions Header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                        generationReport?.success ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-indigo-100 text-indigo-600"
                      }`}>
                        <Icon name={generationReport?.success ? "checkCircle" : "calendar"} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{generationReport?.success ? "Conflict-Free & Gap-Optimized Schedule" : "Generated Schedule Preview Grid"}</span>
                          {generationReport && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              generationReport.isPublishable
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                : "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                            }`}>
                              {generationReport.isPublishable ? "Publishable" : "Draft Only"}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {department} Semester {semester} Section {section} • Academic Year {academicYear} • {previewSlots.length} Classes Assigned
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleValidateSchedule}
                        disabled={validating || previewSlots.length === 0}
                        className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        title="Run independent constraint validation"
                      >
                        <Icon name="shield" className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{validating ? "Validating..." : "Validate Schedule"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStep(3);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                      >
                        <Icon name="search" className="w-3.5 h-3.5" />
                        <span>Quality Audit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave("draft")}
                        disabled={saving}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Icon name="printer" className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave("published")}
                        disabled={
                          saving ||
                          validating ||
                          previewSlots.length === 0 ||
                          (validationResult ? !validationResult.isValid : generationReport && !generationReport.isPublishable)
                        }
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <Icon name="checkCircle" className="w-3.5 h-3.5" />
                        <span>Publish Schedule</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards: Required Periods, Assigned Periods, Free Periods, Clashes, Compactness, Validation Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Required Periods</span>
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">{totalAllocatedPeriods} Periods</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Assigned Periods</span>
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {previewSlots.length} / {totalAllocatedPeriods}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Free Periods</span>
                      <p className="text-base font-black text-emerald-600">
                        {validationResult?.totalGaps ?? generationReport?.totalGaps ?? 0} Gaps
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Hard Clashes</span>
                      <p
                        className={`text-base font-black ${
                          (validationResult?.hardConstraintViolations?.length || 0) === 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {validationResult?.hardConstraintViolations?.length ?? (generationReport?.unresolvedConflicts?.length || 0)} Violations
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Compactness</span>
                      <p className="text-base font-black text-indigo-600">
                        {validationResult?.compactnessPercentage ?? generationReport?.compactnessPercentage ?? 100}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Validation Status</span>
                      <p
                        className={`text-xs font-black uppercase mt-1 ${
                          (validationResult ? validationResult.isValid : generationReport?.isPublishable)
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {(validationResult ? validationResult.isValid : generationReport?.isPublishable)
                          ? "Valid & Publishable"
                          : "Action Required"}
                      </p>
                    </div>
                  </div>

                  {/* Validation Diagnostics / Success Confirmation Banner */}
                  {validationResult && (
                    <div className="mt-3">
                      {validationResult.isValid ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                          <Icon name="checkCircle" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>
                            <strong>Independent Validation Passed:</strong> Zero section, faculty, or room clashes. Multi-period sessions are continuous without crossing tea/lunch breaks, and all {totalAllocatedPeriods} required periods are scheduled.
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-500/10 border border-rose-300 dark:border-rose-800/60 rounded-xl space-y-2 text-xs text-rose-900 dark:text-rose-200">
                          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                            <Icon name="alertTriangle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <span>Cannot Publish: {validationResult.hardConstraintViolations?.length} Validation Violation(s) Found</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 dark:text-rose-300">
                            {(validationResult.hardConstraintViolations || []).map((v, vIdx) => (
                              <li key={vIdx}>{v.description || JSON.stringify(v)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Embedded Timetable Grid */}
                <TimetableGrid
                  slots={previewSlots}
                  timetableInfo={{
                    name,
                    department,
                    semester,
                    section,
                    academicYear,
                    status: "preview",
                  }}
                  defaultViewMode="weekly"
                />

                {/* Step 4 Bottom Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep(2);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      ← Reconfigure Subjects (Step 2)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep(3);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      View Quality Audit (Step 3)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave("published")}
                    disabled={saving || (generationReport && !generationReport.isPublishable)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
                  >
                    <Icon name="checkCircle" className="w-4 h-4" />
                    <span>Publish Schedule to Portal</span>
                  </button>
                </div>
              </div>
            ) : generationReport && previewSlots.length === 0 ? (
              <div className="bg-rose-50/80 dark:bg-rose-950/40 rounded-2xl p-6 border border-rose-200 dark:border-rose-800 text-center space-y-3">
                <Icon name="alertTriangle" className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                  Timetable Cannot Be Generated With Current Hard Constraints
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 max-w-lg mx-auto">
                  {generationReport.unresolvedConflicts?.[0]?.reason ||
                    "Resource saturation or hard conflict prevented slot allocation."}
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      loadDepartmentTemplate();
                      setActiveStep(2);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Auto-Fix & Rebalance Resources
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    No Timetable Generated Yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Select your academic cohort in Step 1, verify subjects in Step 2, and click &quot;Run Timetable Generator&quot;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(2);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Go to Step 2: Subject & Faculty Mapping →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Timetable Print & Export Modal */}
        {showPrintModal && previewSlots.length > 0 && (
          <TimetablePrintModal
            timetable={{
              name,
              department,
              semester,
              section,
              academicYear,
              slots: previewSlots,
            }}
            onClose={() => setShowPrintModal(false)}
          />
        )}

        {/* Conflict Resolution Modal */}
        {conflictModalData && conflictModalData.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                    <Icon name="alertTriangle" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Schedule Clashes Detected ({conflictModalData.conflicts.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hard constraints violated in admin-configured time slots.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictModalData(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              {/* Conflict List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Identified Conflicts
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {conflictModalData.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5"
                    >
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-300 flex-shrink-0 mt-0.5">
                        {c.type || "CLASH"}
                      </span>
                      <span>{c.description || JSON.stringify(c)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Minimal Resolution Proposal */}
              {conflictModalData.canResolve ? (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="sparkles" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                      Proposed Minimal Adjustment ({conflictModalData.proposedChanges.length} class{conflictModalData.proposedChanges.length > 1 ? "es" : ""} moved • {conflictModalData.preservedCount} preserved)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    The solver will strictly lock all {conflictModalData.preservedCount} non-conflicting classes in place and only displace the conflicting class(es) to the nearest available clash-free slot.
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {conflictModalData.proposedChanges.map((p, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between"
                      >
                        <span>{p.description}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-indigo-100 dark:border-indigo-900/60">
                    <button
                      type="button"
                      onClick={() => {
                        setConflictModalData(null);
                        setActiveStep(2);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
                    >
                      Adjust Manually in Step 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Icon name="checkCircle" className="w-4 h-4" />
                      <span>Accept Proposed Changes & Apply</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <Icon name="alertTriangle" className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Cannot Be Automatically Resolved Under Current Hard Constraints</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    {(conflictModalData.unresolvableReasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConflictModalData(null);
                        setActiveStep(2);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                    >
                      Return to Step 2 to Adjust Manually
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
