const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Attendance = sequelize.define("Attendance", {
  studentId: DataTypes.INTEGER,
  year: DataTypes.INTEGER,
  month: DataTypes.INTEGER,
  day: DataTypes.INTEGER,
  status: DataTypes.STRING, // present / absent
});

module.exports = Attendance;
