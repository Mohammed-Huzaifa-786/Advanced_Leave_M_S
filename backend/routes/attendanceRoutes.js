const router = require("express").Router();
const controller = require("../controllers/attendanceController");

router.get("/:studentId/:year/:month", controller.getAttendance);
router.get("/student/:id", controller.getAttendanceForStudent);
router.post("/mark", controller.markAttendance);

module.exports = router;
