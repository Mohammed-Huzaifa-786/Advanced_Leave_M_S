const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const User = sequelize.define("User", {
id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
username: { type: DataTypes.STRING, allowNull: false, unique: true },
password: { type: DataTypes.STRING, allowNull: false },
role: { type: DataTypes.ENUM("student", "admin"), defaultValue: "student" }
});


module.exports = User;