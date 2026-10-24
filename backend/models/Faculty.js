const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Faculty = sequelize.define("Faculty", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Assistant Professor",
  },
}, {
  tableName: "faculties",
  timestamps: true,
});

module.exports = Faculty;
