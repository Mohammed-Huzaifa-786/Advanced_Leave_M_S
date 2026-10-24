const express = require("express");
const router = express.Router();
const timetableController = require("../controllers/timetableController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// ------------------- ADMIN TIMETABLE MANAGEMENT -------------------
router.get(
  "/admin/list",
  authenticate,
  authorize("admin"),
  timetableController.getAllTimetables
);

router.get(
  "/admin/resources",
  authenticate,
  authorize("admin"),
  timetableController.getResources
);

router.post(
  "/admin/resources",
  authenticate,
  authorize("admin"),
  timetableController.createResource
);

router.post(
  "/admin/generate",
  authenticate,
  authorize("admin"),
  timetableController.generateTimetable
);

router.post(
  "/admin/save",
  authenticate,
  authorize("admin"),
  timetableController.saveTimetable
);

router.post(
  "/admin/validate",
  authenticate,
  authorize("admin"),
  timetableController.validateTimetableSlots
);

router.put(
  "/admin/publish/:id",
  authenticate,
  authorize("admin"),
  timetableController.publishTimetable
);

router.put(
  "/admin/unpublish/:id",
  authenticate,
  authorize("admin"),
  timetableController.unpublishTimetable
);

router.delete(
  "/admin/:id",
  authenticate,
  authorize("admin"),
  timetableController.deleteTimetable
);

router.post(
  "/admin/seed-bmsit",
  authenticate,
  authorize("admin"),
  timetableController.seedBmsitTimetable
);

// ------------------- STUDENT TIMETABLE VIEW -------------------
router.get(
  "/my-timetable",
  authenticate,
  timetableController.getMyTimetable
);

module.exports = router;
