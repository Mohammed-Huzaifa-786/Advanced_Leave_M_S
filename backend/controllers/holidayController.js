const Holiday = require("../models/Holiday");

exports.getAllHolidays = async (req, res) => {
  const x = await Holiday.findAll();
  res.json(x);
};

exports.addHoliday = async (req, res) => {
  const { name, date } = req.body;
  const h = await Holiday.create({ name, date });
  res.json(h);
};

exports.updateHoliday = async (req, res) => {
  const { name, date } = req.body;
  await Holiday.update({ name, date }, { where: { id: req.params.id } });
  res.json({ message: "Updated" });
};

exports.deleteHoliday = async (req, res) => {
  await Holiday.destroy({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
};
