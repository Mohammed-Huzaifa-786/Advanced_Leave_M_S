const Leave = require("../models/Leave");

exports.applyLeave = async (req, res) => {
  try {
    const { studentId, leaveType, fromDate, toDate, reason } = req.body;

    if (!studentId || !leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const leave = await Leave.create({
      studentId,
      leaveType,
      fromDate,
      toDate,
      reason,
      status: "pending"
    });

    return res.json({ success: true, message: "Leave Applied Successfully", leave });
  } catch (error) {
    console.error("Leave Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.findAll();
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const id = req.params.id;
    await Leave.update({ status: "approved" }, { where: { id } });
    res.json({ message: "Leave Approved" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const id = req.params.id;
    await Leave.update({ status: "rejected" }, { where: { id } });
    res.json({ message: "Leave Rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
