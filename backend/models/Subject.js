const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Subject = sequelize.define("Subject", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
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
  weeklyPeriods: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
  },
  isLab: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  consecutivePeriods: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  preferredDay: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  preferredTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "All",
  },
}, {
  tableName: "subjects",
  timestamps: true,
});

module.exports = Subject;
