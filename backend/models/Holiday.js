const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Holiday = sequelize.define("Holiday", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
});

module.exports = Holiday;
