const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authenticate } = require("../middleware/authMiddleware");

// Subject-wise attendance analytics
router.get("/subject-attendance", authenticate, analyticsController.getSubjectAttendance);

// Smart Leave Planner impact and recommendation
router.post("/smart-leave-plan", authenticate, analyticsController.getSmartLeavePlan);

module.exports = router;
