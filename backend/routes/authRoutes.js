const router = require("express").Router();
const controller = require("../controllers/authController");
const User = require("../models/User");
const bcrypt = require("bcrypt");

router.post("/login", controller.login);
router.post("/signup", controller.signup);
router.post("/forgot-password", controller.forgotPassword);

// ✨ NEW: Change Password
router.post("/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
