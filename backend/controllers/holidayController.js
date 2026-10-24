const { Holiday } = require("../models");

exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      order: [["date", "ASC"]],
    });
    return res.json(holidays);
  } catch (err) {
    console.error("Get holidays error:", err);
    return res.status(500).json({ message: "Failed to load holidays" });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: "Holiday name and date are required" });
    }

    const holiday = await Holiday.create({ name, date });
    return res.status(201).json(holiday);
  } catch (err) {
    console.error("Add holiday error:", err);
    return res.status(500).json({ message: "Failed to add holiday" });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ message: "Holiday name and date are required" });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    holiday.name = name;
    holiday.date = date;
    await holiday.save();

    return res.json({ message: "Holiday updated successfully", holiday });
  } catch (err) {
    console.error("Update holiday error:", err);
    return res.status(500).json({ message: "Failed to update holiday" });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await holiday.destroy();
    return res.json({ message: "Holiday deleted successfully" });
  } catch (err) {
    console.error("Delete holiday error:", err);
    return res.status(500).json({ message: "Failed to delete holiday" });
  }
};
