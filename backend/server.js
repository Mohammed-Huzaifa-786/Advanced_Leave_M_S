const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// DB connection
const sequelize = require('./config/db');

// Register models
require('./models/User');
require('./models/Student');
require('./models/Leave');
require('./models/Attendance');
require('./models/Holiday');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  app.listen(PORT, () => console.log('Server running on port', PORT));
});

