const router = require("express").Router();
const controller = require("../controllers/holidayController");

router.get("/all", controller.getAllHolidays);
router.post("/add", controller.addHoliday);
router.put("/update/:id", controller.updateHoliday);
router.delete("/delete/:id", controller.deleteHoliday);

module.exports = router;
