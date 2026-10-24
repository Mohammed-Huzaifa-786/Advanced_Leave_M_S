const router = require("express").Router();
const controller = require("../controllers/attendanceController");
const auth = require("../middleware/authMiddleware");

// All attendance routes require authentication; controller enforces role/ID permissions
router.get("/class-sheet", auth, controller.getClassAttendanceSheet);
router.post("/batch-mark", auth, controller.batchMarkAttendance);
router.get("/:studentId/:year/:month", auth, controller.getAttendance);
router.get("/student/:id", auth, controller.getAttendanceForStudent);
router.post("/mark", auth, controller.markAttendance);

module.exports = router;
