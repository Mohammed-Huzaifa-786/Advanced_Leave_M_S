const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Timetable = sequelize.define("Timetable", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "A",
  },
  academicYear: {
    type: DataTypes.STRING,
    defaultValue: "2026",
  },
  status: {
    type: DataTypes.ENUM("draft", "published"),
    defaultValue: "draft",
  },
}, {
  tableName: "timetables",
  timestamps: true,
  indexes: [
    {
      fields: ["department", "semester", "section", "status"],
    },
  ],
});

module.exports = Timetable;
