const router = require('express').Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/authMiddleware');
router.get('/attendance', auth, async (req, res) => {
const a = await Attendance.findAll();
res.json(a);
});
router.get('/leaves', auth, async (req, res) => {
const l = await Leave.findAll();
res.json(l);
});
module.exports = router;