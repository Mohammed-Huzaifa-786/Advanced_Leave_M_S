const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TimetableSlot = sequelize.define("TimetableSlot", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  timetableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  facultyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  day: {
    type: DataTypes.ENUM(
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ),
    allowNull: false,
  },
  periodNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isLab: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  batch: {
    type: DataTypes.STRING,
    defaultValue: "All",
  },
}, {
  tableName: "timetable_slots",
  timestamps: true,
  indexes: [
    {
      fields: ["timetableId", "day", "periodNumber"],
    },
    {
      fields: ["facultyId", "day", "periodNumber"],
    },
    {
      fields: ["roomId", "day", "periodNumber"],
    },
  ],
});

module.exports = TimetableSlot;
