const router = require("express").Router();
const controller = require("../controllers/studentController");
const auth = require("../middleware/authMiddleware");

// Admin only: list all students
router.get("/all", auth, auth.authorize("admin"), controller.getAllStudents);

// Admin or the student themselves: view profile
router.get("/:id", auth, controller.getStudentById);
router.get("/profile/:id", auth, controller.getStudentById);

// Admin only: add new student
router.post("/add", auth, auth.authorize("admin"), controller.addStudent);

// Admin or the student themselves: update profile
router.put("/update/:id", auth, controller.updateStudent);

// Admin only: reset student password
router.put("/change-password/:id", auth, auth.authorize("admin"), controller.changePassword);
router.post("/reset-password/:id", auth, auth.authorize("admin"), controller.changePassword);

// Admin only: delete student
router.delete("/delete/:id", auth, auth.authorize("admin"), controller.deleteStudent);

module.exports = router;
