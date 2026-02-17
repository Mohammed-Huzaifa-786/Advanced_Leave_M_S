const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Leave = sequelize.define("Leave", {
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  leaveType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  toDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "pending"
  }
}, {
  tableName: "leaves",
  timestamps: true
});

module.exports = Leave;
