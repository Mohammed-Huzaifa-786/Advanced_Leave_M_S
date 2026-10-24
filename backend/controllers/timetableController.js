const { Timetable, TimetableSlot, Subject, Faculty, Room, Student } = require("../models");
const {
  generateClashFreeTimetable,
  generateUserControlledTimetable,
  validateTimetable,
  calculateGapMetrics,
  PERIODS,
  WORKING_DAYS,
} = require("../services/timetableGeneratorService");
const { Op } = require("sequelize");

// ------------------- ADMIN CONTROLLERS -------------------

// GET /api/timetable/admin/list
exports.getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.findAll({
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Subject, as: "subject" },
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.json(timetables);
  } catch (err) {
    console.error("Get timetables error:", err);
    return res.status(500).json({ message: "Failed to load timetables" });
  }
};

// GET /api/timetable/admin/resources
exports.getResources = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ order: [["name", "ASC"]] });
    const faculties = await Faculty.findAll({ order: [["name", "ASC"]] });
    const rooms = await Room.findAll({ order: [["name", "ASC"]] });

    // Fetch existing published slots across other timetables
    const otherTimetables = await Timetable.findAll({
      where: { status: "published" },
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });

    const externalSlots = [];
    otherTimetables.forEach((tt) => {
      (tt.slots || []).forEach((s) => {
        externalSlots.push({
          day: s.day,
          periodNumber: s.periodNumber,
          facultyId: s.facultyId,
          facultyName: s.faculty ? s.faculty.name : "Unknown",
          roomId: s.roomId,
          roomName: s.room ? s.room.name : "Unknown",
          department: tt.department,
          semester: tt.semester,
          section: tt.section,
        });
      });
    });

    return res.json({
      subjects,
      faculties,
      rooms,
      periods: PERIODS,
      workingDays: WORKING_DAYS,
      externalSlots,
    });
  } catch (err) {
    console.error("Get resources error:", err);
    return res.status(500).json({ message: "Failed to load academic resources" });
  }
};

// POST /api/timetable/admin/resources
exports.createResource = async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ message: "Type ('subject', 'faculty', 'room') and data are required" });
    }

    let created;
    if (type === "subject") {
      if (!data.name || !data.code || !data.department || !data.semester) {
        return res.status(400).json({ message: "Subject name, code, department, and semester are required" });
      }
      created = await Subject.create(data);
    } else if (type === "faculty") {
      if (!data.name || !data.department) {
        return res.status(400).json({ message: "Faculty name and department are required" });
      }
      created = await Faculty.create(data);
    } else if (type === "room") {
      if (!data.name) {
        return res.status(400).json({ message: "Room name is required" });
      }
      created = await Room.create(data);
    } else {
      return res.status(400).json({ message: "Invalid resource type" });
    }

    return res.status(201).json({ message: `${type} created successfully`, item: created });
  } catch (err) {
    console.error("Create resource error:", err);
    return res.status(500).json({ message: "Failed to create resource" });
  }
};

// POST /api/timetable/admin/generate
exports.generateTimetable = async (req, res) => {
  try {
    const {
      department,
      semester,
      section,
      subjects,
      academicYear,
      timetableId,
      resolveConflicts,
      configuredSlots,
      mode,
    } = req.body;
    console.log("==> [API] generateTimetable received:", {
      department,
      semester,
      section,
      subjectCount: subjects?.length,
      resolveConflicts: Boolean(resolveConflicts),
      hasConfiguredSlots: Boolean(configuredSlots?.length || subjects?.some((s) => s.slots?.length > 0)),
      mode,
    });

    if (!department || !semester || !section) {
      return res.status(400).json({ message: "Department, semester, and section are required" });
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "At least one subject must be assigned for timetable generation" });
    }

    // Determine if User-Controlled scheduling applies
    const isUserControlled =
      mode === "user-controlled" ||
      Boolean(configuredSlots && configuredSlots.length > 0) ||
      subjects.some((s) => Array.isArray(s.slots) && s.slots.length > 0);

    let result;
    if (isUserControlled) {
      result = await generateUserControlledTimetable({
        department,
        semester: parseInt(semester, 10),
        section,
        subjects,
        academicYear: academicYear || "2026-27",
        timetableId,
        resolveConflicts: Boolean(resolveConflicts),
        configuredSlots,
      });
    } else {
      result = await generateClashFreeTimetable({
        department,
        semester: parseInt(semester, 10),
        section,
        subjects,
        academicYear: academicYear || "2026",
        timetableId,
      });
    }

    console.log("==> [API] generateTimetable returning:", {
      success: result?.success,
      mode: result?.mode,
      totalSlots: result?.totalSlotsScheduled,
      hasConflicts: result?.hasConflicts,
      canResolve: result?.canResolve,
      proposedChangesCount: result?.proposedChanges?.length,
    });
    return res.json(result);
  } catch (err) {
    console.error("Generate timetable error:", err);
    return res.status(500).json({ message: "Error during timetable generation" });
  }
};

// POST /api/timetable/admin/save
exports.saveTimetable = async (req, res) => {
  try {
    const { id, name, department, semester, section, academicYear, status, slots, confirmReplace, subjects } = req.body;

    if (!name || !department || !semester || !section) {
      return res.status(400).json({ message: "Timetable name, department, semester, and section are required" });
    }

    const semNum = parseInt(semester, 10);
    const yr = academicYear || "2026-27";
    const targetStatus = status || "draft";

    // If saving as "published", validate hard constraints and guard against unintended overwrites
    if (targetStatus === "published") {
      const otherTimetableFilter = {
        status: "published",
        ...(id ? { id: { [Op.ne]: id } } : {}),
        [Op.not]: {
          department,
          semester: semNum,
          section,
        },
      };
      const otherTimetables = await Timetable.findAll({
        where: otherTimetableFilter,
        include: [
          {
            model: TimetableSlot,
            as: "slots",
            include: [
              { model: Faculty, as: "faculty" },
              { model: Room, as: "room" },
            ],
          },
        ],
      });

      const externalSlots = [];
      otherTimetables.forEach((tt) => {
        (tt.slots || []).forEach((s) => {
          externalSlots.push({
            day: s.day,
            periodNumber: s.periodNumber,
            facultyId: s.facultyId,
            facultyName: s.faculty ? s.faculty.name : "Unknown",
            roomId: s.roomId,
            roomName: s.room ? s.room.name : "Unknown",
            department: tt.department,
            semester: tt.semester,
            section: tt.section,
          });
        });
      });

      const validation = validateTimetable(slots || [], { externalSlots, subjects });
      if (!validation.isValid) {
        return res.status(400).json({
          message: `Cannot publish timetable: ${validation.hardConstraintViolations.length} hard-constraint violation(s) found.`,
          validation,
        });
      }

      // Check if another timetable for the exact same (department, semester, section, academicYear) is already published
      const existingPublished = await Timetable.findOne({
        where: {
          department,
          semester: semNum,
          section,
          academicYear: yr,
          status: "published",
          ...(id ? { id: { [Op.ne]: id } } : {}),
        },
      });

      if (existingPublished && !confirmReplace) {
        return res.status(409).json({
          requiresConfirmation: true,
          existingTimetable: {
            id: existingPublished.id,
            name: existingPublished.name,
            department: existingPublished.department,
            semester: existingPublished.semester,
            section: existingPublished.section,
            academicYear: existingPublished.academicYear,
          },
          message: `A published timetable ("${existingPublished.name}") already exists for ${department} Semester ${semester} Section ${section} (${yr}). Confirm to replace it as the active published schedule.`,
        });
      }

      if (existingPublished && confirmReplace) {
        await existingPublished.update({ status: "draft" });
      }
    }

    let timetable;
    if (id) {
      timetable = await Timetable.findByPk(id);
      if (!timetable) return res.status(404).json({ message: "Timetable not found" });
      await timetable.update({
        name,
        department,
        semester: semNum,
        section,
        academicYear: yr,
        status: targetStatus,
      });
      // Delete existing slots before inserting updated ones
      await TimetableSlot.destroy({ where: { timetableId: timetable.id } });
    } else {
      timetable = await Timetable.create({
        name,
        department,
        semester: semNum,
        section,
        academicYear: yr,
        status: targetStatus,
      });
    }

    // Insert slots
    if (slots && Array.isArray(slots)) {
      const slotsToCreate = slots.map((s) => ({
        timetableId: timetable.id,
        subjectId: s.subjectId,
        facultyId: s.facultyId || null,
        roomId: s.roomId || null,
        day: s.day,
        periodNumber: s.periodNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        isLab: !!s.isLab,
        duration: s.duration || 1,
        batch: s.batch || "All",
      }));
      await TimetableSlot.bulkCreate(slotsToCreate);
    }

    // Fetch complete timetable with associations
    const saved = await Timetable.findByPk(timetable.id, {
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Subject, as: "subject" },
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });

    return res.json({ message: "Timetable saved successfully", timetable: saved });
  } catch (err) {
    console.error("Save timetable error:", err);
    return res.status(500).json({ message: "Failed to save timetable" });
  }
};

// POST /api/timetable/admin/validate
exports.validateTimetableSlots = async (req, res) => {
  try {
    const { slots, timetableId, subjects, department, semester, section } = req.body;
    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ message: "Slots array is required for validation" });
    }

    const sampleSlot = slots[0] || {};
    const dept = department || sampleSlot.department;
    const sem = semester ? parseInt(semester, 10) : (sampleSlot.semester ? parseInt(sampleSlot.semester, 10) : null);
    const sec = section || sampleSlot.section;

    const otherTimetableFilter = {
      status: "published",
      ...(timetableId ? { id: { [Op.ne]: timetableId } } : {}),
      ...(dept && sem && sec
        ? {
            [Op.not]: {
              department: dept,
              semester: sem,
              section: sec,
            },
          }
        : {}),
    };
    const otherTimetables = await Timetable.findAll({
      where: otherTimetableFilter,
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });

    const externalSlots = [];
    otherTimetables.forEach((tt) => {
      (tt.slots || []).forEach((s) => {
        externalSlots.push({
          day: s.day,
          periodNumber: s.periodNumber,
          facultyId: s.facultyId,
          facultyName: s.faculty ? s.faculty.name : "Unknown",
          roomId: s.roomId,
          roomName: s.room ? s.room.name : "Unknown",
          department: tt.department,
          semester: tt.semester,
          section: tt.section,
        });
      });
    });

    const validation = validateTimetable(slots, { externalSlots, subjects });
    return res.json(validation);
  } catch (err) {
    console.error("Validate slots error:", err);
    return res.status(500).json({ message: "Failed to validate timetable slots" });
  }
};

// PUT /api/timetable/admin/publish/:id
exports.publishTimetable = async (req, res) => {
  try {
    const { confirmReplace } = req.body || {};
    const timetable = await Timetable.findByPk(req.params.id, {
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Subject, as: "subject" },
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });

    // Fetch external slots from other published timetables (excluding this section's previous timetable being replaced)
    const otherTimetables = await Timetable.findAll({
      where: {
        id: { [Op.ne]: timetable.id },
        status: "published",
        [Op.not]: {
          department: timetable.department,
          semester: timetable.semester,
          section: timetable.section,
        },
      },
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });

    const externalSlots = [];
    otherTimetables.forEach((tt) => {
      (tt.slots || []).forEach((s) => {
        externalSlots.push({
          day: s.day,
          periodNumber: s.periodNumber,
          facultyId: s.facultyId,
          facultyName: s.faculty ? s.faculty.name : "Unknown",
          roomId: s.roomId,
          roomName: s.room ? s.room.name : "Unknown",
          department: tt.department,
          semester: tt.semester,
          section: tt.section,
        });
      });
    });

    const formattedSlots = (timetable.slots || []).map((s) => ({
      ...s.toJSON(),
      subjectName: s.subject ? s.subject.name : "Academic Session",
      subjectCode: s.subject ? s.subject.code : "",
      facultyName: s.faculty ? s.faculty.name : "Faculty TBD",
      roomName: s.room ? s.room.name : "Classroom TBD",
    }));

    const validation = validateTimetable(formattedSlots, { externalSlots });
    if (!validation.isValid) {
      return res.status(400).json({
        message: `Cannot publish timetable: ${validation.hardConstraintViolations.length} hard-constraint violation(s) detected.`,
        validation,
      });
    }

    // Check if another published timetable exists for the exact same section
    const existingPublished = await Timetable.findOne({
      where: {
        department: timetable.department,
        semester: timetable.semester,
        section: timetable.section,
        academicYear: timetable.academicYear,
        status: "published",
        id: { [Op.ne]: timetable.id },
      },
    });

    if (existingPublished && !confirmReplace) {
      return res.status(409).json({
        requiresConfirmation: true,
        existingTimetable: {
          id: existingPublished.id,
          name: existingPublished.name,
          department: existingPublished.department,
          semester: existingPublished.semester,
          section: existingPublished.section,
        },
        message: `A published timetable ("${existingPublished.name}") already exists for ${timetable.department} Semester ${timetable.semester} Section ${timetable.section}. Confirm replacement.`,
      });
    }

    if (existingPublished && confirmReplace) {
      await existingPublished.update({ status: "draft" });
    }

    timetable.status = "published";
    await timetable.save();

    return res.json({
      message: `Timetable "${timetable.name}" published successfully!`,
      timetable,
      validation,
    });
  } catch (err) {
    console.error("Publish timetable error:", err);
    return res.status(500).json({ message: "Failed to publish timetable" });
  }
};

// PUT /api/timetable/admin/unpublish/:id
exports.unpublishTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });

    timetable.status = "draft";
    await timetable.save();

    return res.json({ message: `Timetable "${timetable.name}" switched to draft mode.`, timetable });
  } catch (err) {
    console.error("Unpublish timetable error:", err);
    return res.status(500).json({ message: "Failed to unpublish timetable" });
  }
};

// DELETE /api/timetable/admin/:id
exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByPk(req.params.id);
    if (!timetable) return res.status(404).json({ message: "Timetable not found" });

    await timetable.destroy();
    return res.json({ message: "Timetable deleted successfully" });
  } catch (err) {
    console.error("Delete timetable error:", err);
    return res.status(500).json({ message: "Failed to delete timetable" });
  }
};

// POST /api/timetable/admin/seed-bmsit
exports.seedBmsitTimetable = async (req, res) => {
  try {
    const { overwrite } = req.body || {};

    const targetDept = "CSE";
    const targetSemester = 7;
    const targetSection = "B";
    const targetAcademicYear = "2026-27";

    // 1. Check if a timetable for this exact (department, semester, section, academicYear) already exists
    const existingTimetable = await Timetable.findOne({
      where: {
        department: targetDept,
        semester: targetSemester,
        section: targetSection,
        academicYear: targetAcademicYear,
      },
      include: [{ model: TimetableSlot, as: "slots" }],
    });

    if (existingTimetable && !overwrite) {
      return res.json({
        exists: true,
        timetable: {
          id: existingTimetable.id,
          name: existingTimetable.name,
          department: existingTimetable.department,
          semester: existingTimetable.semester,
          section: existingTimetable.section,
          academicYear: existingTimetable.academicYear,
          status: existingTimetable.status,
          slotCount: existingTimetable.slots?.length || 0,
        },
        message: `A timetable for ${targetDept} Semester ${targetSemester} Section ${targetSection} (${targetAcademicYear}) already exists. Please confirm if you want to overwrite its schedule slots with the BMSIT demo schedule.`,
      });
    }

    // 2. Upsert Academic Resources idempotently without duplicating
    // Rooms
    const roomDefs = [
      { name: "BSN-CR-104", type: "classroom", capacity: 70 },
      { name: "BSN-CR-105", type: "classroom", capacity: 70 },
      { name: "BSN-CR-106", type: "classroom", capacity: 70 },
      { name: "PC Lab", type: "lab", capacity: 40 },
      { name: "INS Lab", type: "lab", capacity: 40 },
    ];
    const roomMap = {};
    for (const r of roomDefs) {
      let [room] = await Room.findOrCreate({
        where: { name: r.name },
        defaults: r,
      });
      roomMap[r.name] = room;
    }

    // Faculty members
    const facultyDefs = [
      { name: "Mrs. Renita Blossom Monteiro", department: "CSE", email: "renitablossom@bmsit.in" },
      { name: "Dr. Mohammed Khurram", department: "CSE", email: "mkhurram@bmsit.in" },
      { name: "Mr. Jagadish P", department: "CSE", email: "jagadishp@bmsit.in" },
      { name: "Dr. Vinutha K", department: "CSE", email: "vinuthak@bmsit.in" },
      { name: "Dr. Ashwini N", department: "CSE", email: "ashwinin@bmsit.in" },
      { name: "Dr. Dhanalakshmi B K", department: "CSE", email: "dhanalakshmi@bmsit.in" },
      { name: "Mr. Ranjith V", department: "CSE", email: "ranjithv@bmsit.in" },
    ];
    const facultyMap = {};
    for (const f of facultyDefs) {
      let [fac] = await Faculty.findOrCreate({
        where: { name: f.name },
        defaults: f,
      });
      facultyMap[f.name] = fac;
    }

    // Subjects
    const subjectDefs = [
      {
        name: "Information and Network Security",
        code: "BCS701",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 2,
        isLab: false,
        consecutivePeriods: 1,
      },
      {
        name: "Parallel Computing",
        code: "BCS702",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 2,
        isLab: false,
        consecutivePeriods: 1,
      },
      {
        name: "Natural Language Processing",
        code: "BCS703A",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 3,
        isLab: false,
        consecutivePeriods: 1,
      },
      {
        name: "Information and Network Security Lab",
        code: "BCSL707",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 2,
        isLab: true,
        consecutivePeriods: 2,
      },
      {
        name: "Parallel Computing Laboratory",
        code: "BCSL706",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 2,
        isLab: true,
        consecutivePeriods: 2,
      },
      {
        name: "Major Project Phase II",
        code: "MP708",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 12,
        isLab: false,
        consecutivePeriods: 4,
      },
      {
        name: "Proctoring",
        code: "PROCT",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 1,
        isLab: false,
        consecutivePeriods: 1,
      },
      {
        name: "Departmental Activities",
        code: "DA",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 1,
        isLab: false,
        consecutivePeriods: 1,
      },
      {
        name: "IIC Activities",
        code: "IIC",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 2,
        isLab: false,
        consecutivePeriods: 2,
      },
    ];
    const subjectMap = {};
    for (const s of subjectDefs) {
      let [subj] = await Subject.findOrCreate({
        where: { code: s.code },
        defaults: s,
      });
      subjectMap[s.code] = subj;
    }

    // 3. Create or reuse Timetable
    let timetable = existingTimetable;
    if (timetable) {
      await timetable.update({
        name: "CSE - Semester 7 - Section B (BMSIT Academic Schedule)",
        status: "published",
      });
      // Clear previous slots for this timetable only
      await TimetableSlot.destroy({ where: { timetableId: timetable.id } });
    } else {
      timetable = await Timetable.create({
        name: "CSE - Semester 7 - Section B (BMSIT Academic Schedule)",
        department: targetDept,
        semester: targetSemester,
        section: targetSection,
        academicYear: targetAcademicYear,
        status: "published",
      });
    }

    // 4. Slots mapping from reference
    const slotDefinitions = [
      // Monday: Periods 1-4 MP708
      { day: "Monday", pNum: 1, start: "08:30", end: "09:25", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Monday", pNum: 2, start: "09:25", end: "10:20", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Monday", pNum: 3, start: "10:40", end: "11:35", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Monday", pNum: 4, start: "11:35", end: "12:30", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },

      // Tuesday: Periods 1-4 MP708
      { day: "Tuesday", pNum: 1, start: "08:30", end: "09:25", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Tuesday", pNum: 2, start: "09:25", end: "10:20", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Tuesday", pNum: 3, start: "10:40", end: "11:35", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Tuesday", pNum: 4, start: "11:35", end: "12:30", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },

      // Wednesday: Periods 1-4 MP708
      { day: "Wednesday", pNum: 1, start: "08:30", end: "09:25", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Wednesday", pNum: 2, start: "09:25", end: "10:20", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Wednesday", pNum: 3, start: "10:40", end: "11:35", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Wednesday", pNum: 4, start: "11:35", end: "12:30", code: "MP708", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },

      // Thursday:
      { day: "Thursday", pNum: 1, start: "08:30", end: "09:25", code: "BCS703A", fac: "Mr. Jagadish P", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Thursday", pNum: 3, start: "10:40", end: "11:35", code: "BCS701", fac: "Mrs. Renita Blossom Monteiro", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Thursday", pNum: 4, start: "11:35", end: "12:30", code: "BCS703A", fac: "Mr. Jagadish P", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Thursday", pNum: 5, start: "13:25", end: "14:20", code: "BCS702", fac: "Dr. Mohammed Khurram", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Thursday", pNum: 6, start: "14:20", end: "15:15", code: "BCS701", fac: "Mrs. Renita Blossom Monteiro", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Thursday", pNum: 7, start: "15:15", end: "16:10", code: "PROCT", fac: "Mrs. Renita Blossom Monteiro", room: "BSN-CR-104", isLab: false, dur: 1 },

      // Friday:
      { day: "Friday", pNum: 1, start: "08:30", end: "09:25", code: "BCSL707", fac: "Mrs. Renita Blossom Monteiro", room: "INS Lab", isLab: true, dur: 2, batch: "B1/B2" },
      { day: "Friday", pNum: 2, start: "09:25", end: "10:20", code: "BCSL707", fac: "Mrs. Renita Blossom Monteiro", room: "INS Lab", isLab: true, dur: 2, batch: "B1/B2" },
      { day: "Friday", pNum: 3, start: "10:40", end: "11:35", code: "DA", fac: "Mrs. Renita Blossom Monteiro", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Friday", pNum: 4, start: "11:35", end: "12:30", code: "BCS702", fac: "Dr. Mohammed Khurram", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Friday", pNum: 5, start: "13:25", end: "14:20", code: "BCS703A", fac: "Mr. Jagadish P", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Friday", pNum: 6, start: "14:20", end: "15:15", code: "BCSL706", fac: "Dr. Vinutha K", room: "PC Lab", isLab: true, dur: 2, batch: "B1/B2" },
      { day: "Friday", pNum: 7, start: "15:15", end: "16:10", code: "BCSL706", fac: "Dr. Vinutha K", room: "PC Lab", isLab: true, dur: 2, batch: "B1/B2" },

      // Saturday:
      { day: "Saturday", pNum: 1, start: "08:30", end: "09:25", code: "IIC", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
      { day: "Saturday", pNum: 2, start: "09:25", end: "10:20", code: "IIC", fac: "Dr. Dhanalakshmi B K", room: "BSN-CR-104", isLab: false, dur: 1 },
    ];

    const slotsToInsert = slotDefinitions.map((s) => ({
      timetableId: timetable.id,
      subjectId: subjectMap[s.code]?.id,
      facultyId: facultyMap[s.fac]?.id,
      roomId: roomMap[s.room]?.id,
      day: s.day,
      periodNumber: s.pNum,
      startTime: s.start,
      endTime: s.end,
      isLab: s.isLab,
      duration: s.dur,
      batch: s.batch || "All",
    }));

    await TimetableSlot.bulkCreate(slotsToInsert);

    const fullTimetable = await Timetable.findByPk(timetable.id, {
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Subject, as: "subject" },
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });

    return res.json({
      success: true,
      exists: false,
      message: `BMSIT 7th Semester CSE (Section B) sample timetable successfully seeded (${slotsToInsert.length} slots configured).`,
      timetable: fullTimetable,
      slotCount: slotsToInsert.length,
    });
  } catch (err) {
    console.error("Seed BMSIT timetable error:", err);
    return res.status(500).json({ message: "Failed to seed sample BMSIT timetable" });
  }
};

// ------------------- STUDENT CONTROLLERS -------------------

// GET /api/timetable/my-timetable
exports.getMyTimetable = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return res.status(403).json({ message: "Only enrolled students can view their timetable" });
    }

    const student = await Student.findByPk(studentId);
    if (!student) return res.status(404).json({ message: "Student profile not found" });

    let semester = student.semester;
    let section = student.section;
    if (!semester || !section) {
      const match = (student.className || "").match(/(\d+)\s*([A-Za-z]+)/);
      if (match) {
        if (!semester) semester = parseInt(match[1], 10);
        if (!section) section = match[2].toUpperCase();
      } else {
        const numMatch = (student.className || "").match(/(\d+)/);
        if (numMatch && !semester) semester = parseInt(numMatch[1], 10);
      }
    }
    semester = semester || 7;
    const rawDepartment = student.department || "CSE";
    
    // Extract keywords for department matching (e.g. 'CSE' from 'BE (CSE)')
    const cleaned = rawDepartment.trim();
    const deptKeywords = [cleaned];
    const match = cleaned.match(/\b(CSE|ISE|ECE|MECH|CIVIL|AIML|AIDS|DS|IT)\b/i);
    if (match) deptKeywords.push(match[1].toUpperCase());
    const stripped = cleaned.replace(/^(B\.?E\.?|B\.?TECH\.?)\s*\(?|\)?$/gi, "").trim();
    if (stripped) deptKeywords.push(stripped);
    const uniqueKeywords = [...new Set(deptKeywords.filter(Boolean))];
    const deptConditions = uniqueKeywords.map((k) => ({
      department: { [Op.like]: `%${k}%` },
    }));

    // Find the published timetable: match section first
    let timetable = null;
    let exactSectionDraft = false;

    if (section) {
      timetable = await Timetable.findOne({
        where: {
          [Op.or]: deptConditions,
          semester,
          section,
          status: "published",
        },
        include: [
          {
            model: TimetableSlot,
            as: "slots",
            include: [
              { model: Subject, as: "subject" },
              { model: Faculty, as: "faculty" },
              { model: Room, as: "room" },
            ],
          },
        ],
        order: [[{ model: TimetableSlot, as: "slots" }, "periodNumber", "ASC"]],
      });

      if (!timetable) {
        // Check if there is an explicit draft timetable for this student's section
        const draftCheck = await Timetable.findOne({
          where: {
            [Op.or]: deptConditions,
            semester,
            section,
            status: "draft",
          },
        });
        if (draftCheck) {
          exactSectionDraft = true;
        }
      }
    }

    // Fallback only if no draft exists for this student's section
    if (!timetable && !exactSectionDraft) {
      timetable = await Timetable.findOne({
        where: {
          [Op.or]: deptConditions,
          semester,
          status: "published",
        },
        include: [
          {
            model: TimetableSlot,
            as: "slots",
            include: [
              { model: Subject, as: "subject" },
              { model: Faculty, as: "faculty" },
              { model: Room, as: "room" },
            ],
          },
        ],
        order: [["updatedAt", "DESC"], [{ model: TimetableSlot, as: "slots" }, "periodNumber", "ASC"]],
      });
    }

    if (!timetable) {
      return res.json({
        hasTimetable: false,
        message: `No published timetable found for ${rawDepartment} Semester ${semester}. Please contact your administrator.`,
        student: { department: rawDepartment, semester, section: section || "A" },
        days: {},
      });
    }

    // Group slots by Day for the student UI
    const daysSchedule = {};
    WORKING_DAYS.forEach((d) => {
      daysSchedule[d] = [];
    });

    (timetable.slots || []).forEach((slot) => {
      if (daysSchedule[slot.day]) {
        daysSchedule[slot.day].push({
          id: slot.id,
          periodNumber: slot.periodNumber,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isLab: slot.isLab,
          duration: slot.duration,
          batch: slot.batch,
          subject: slot.subject ? { id: slot.subject.id, name: slot.subject.name, code: slot.subject.code } : null,
          subjectName: slot.subject ? slot.subject.name : "Academic Session",
          subjectCode: slot.subject ? slot.subject.code : "",
          faculty: slot.faculty ? { id: slot.faculty.id, name: slot.faculty.name } : null,
          facultyName: slot.faculty ? slot.faculty.name : "Faculty TBD",
          room: slot.room ? { id: slot.room.id, name: slot.room.name } : null,
          roomName: slot.room ? slot.room.name : "Classroom TBD",
        });
      }
    });

    return res.json({
      hasTimetable: true,
      timetable: {
        id: timetable.id,
        name: timetable.name,
        department: timetable.department,
        semester: timetable.semester,
        section: timetable.section,
        academicYear: timetable.academicYear,
        status: timetable.status,
        slots: timetable.slots || [],
      },
      periods: PERIODS,
      days: daysSchedule,
    });
  } catch (err) {
    console.error("Get my timetable error:", err);
    return res.status(500).json({ message: "Failed to load student timetable" });
  }
};
