const sequelize = require("../config/db");
const User = require("./User");
const Student = require("./Student");
const Leave = require("./Leave");
const Attendance = require("./Attendance");
const Holiday = require("./Holiday");
const Subject = require("./Subject");
const Faculty = require("./Faculty");
const Room = require("./Room");
const Timetable = require("./Timetable");
const TimetableSlot = require("./TimetableSlot");

// Existing Associations
User.hasOne(Student, { foreignKey: "userId", as: "student", onDelete: "CASCADE" });
Student.belongsTo(User, { foreignKey: "userId", as: "user" });

Student.hasMany(Leave, { foreignKey: "studentId", as: "leaves", onDelete: "CASCADE" });
Leave.belongsTo(Student, { foreignKey: "studentId", as: "student" });

Student.hasMany(Attendance, { foreignKey: "studentId", as: "attendances", onDelete: "CASCADE" });
Attendance.belongsTo(Student, { foreignKey: "studentId", as: "student" });

// Timetable Associations
Timetable.hasMany(TimetableSlot, { foreignKey: "timetableId", as: "slots", onDelete: "CASCADE" });
TimetableSlot.belongsTo(Timetable, { foreignKey: "timetableId", as: "timetable" });

TimetableSlot.belongsTo(Subject, { foreignKey: "subjectId", as: "subject" });
Subject.hasMany(TimetableSlot, { foreignKey: "subjectId", as: "slots" });

TimetableSlot.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });
Faculty.hasMany(TimetableSlot, { foreignKey: "facultyId", as: "slots" });

TimetableSlot.belongsTo(Room, { foreignKey: "roomId", as: "room" });
Room.hasMany(TimetableSlot, { foreignKey: "roomId", as: "slots" });

module.exports = {
  sequelize,
  User,
  Student,
  Leave,
  Attendance,
  Holiday,
  Subject,
  Faculty,
  Room,
  Timetable,
  TimetableSlot,
};
