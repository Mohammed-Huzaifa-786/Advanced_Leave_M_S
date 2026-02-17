const router = require("express").Router();
const controller = require("../controllers/studentController");

router.get("/all", controller.getAllStudents);
router.get("/:id", controller.getStudentById);

router.post("/add", controller.addStudent);

router.put("/update/:id", controller.updateStudent);
router.put("/change-password/:id", controller.changePassword);

router.delete("/delete/:id", controller.deleteStudent);

module.exports = router;
