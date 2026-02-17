const Student = require("../models/Student");
const bcrypt = require("bcrypt");

// Get all students
exports.getAllStudents = async (req, res) => {
  const data = await Student.findAll();
  res.json(data);
};

// Add student
exports.addStudent = async (req, res) => {
  const { name, username, department, password } = req.body;

  const hashed = await bcrypt.hash(password || "123456", 10);

  const s = await Student.create({
    name,
    username,
    department,
    password: hashed,
  });

  res.json(s);
};

// Update student
exports.updateStudent = async (req, res) => {
  const { name, username, department } = req.body;

  await Student.update(
    { name, username, department },
    { where: { id: req.params.id } }
  );

  res.json({ message: "Updated" });
};

// Delete student
exports.deleteStudent = async (req, res) => {
  await Student.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
};

// Get single student
exports.getStudentById = async (req, res) => {
  const s = await Student.findByPk(req.params.id);
  res.json(s);
};

// Change password
exports.changePassword = async (req, res) => {
  const { password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  await Student.update(
    { password: hashed },
    { where: { id: req.params.id } }
  );

  res.json({ message: "Password updated" });
};
