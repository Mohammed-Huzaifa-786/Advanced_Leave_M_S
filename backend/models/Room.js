const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
  },
  type: {
    type: DataTypes.ENUM("classroom", "lab"),
    defaultValue: "classroom",
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: "rooms",
  timestamps: true,
});

module.exports = Room;
