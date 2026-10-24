const router = require("express").Router();
const controller = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/login", controller.login);
router.post("/signup", controller.signup);
router.post("/forgot-password", controller.forgotPassword);
router.post("/change-password", auth, controller.changePassword);

module.exports = router;
