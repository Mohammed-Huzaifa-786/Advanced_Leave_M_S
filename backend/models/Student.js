const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Student = sequelize.define("Student", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: DataTypes.STRING,
  className: DataTypes.STRING,
  department: DataTypes.STRING,
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 7,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "A",
  },
});

module.exports = Student;
