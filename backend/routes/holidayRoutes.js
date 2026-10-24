const router = require("express").Router();
const controller = require("../controllers/holidayController");
const auth = require("../middleware/authMiddleware");

// All authenticated users can view holidays
router.get("/all", auth, controller.getAllHolidays);

// Only admins can create, update, or delete holidays
router.post("/add", auth, auth.authorize("admin"), controller.addHoliday);
router.put("/update/:id", auth, auth.authorize("admin"), controller.updateHoliday);
router.delete("/delete/:id", auth, auth.authorize("admin"), controller.deleteHoliday);

module.exports = router;
