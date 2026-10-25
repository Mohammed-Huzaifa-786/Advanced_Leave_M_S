const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// DB connection & models with associations
const { sequelize } = require('./models');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads', 'certificates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Hardened CORS configuration & Private Network Access support
const { corsMiddleware, corsPreflight, privateNetworkAccess } = require('./config/cors');
app.use(privateNetworkAccess);
app.use(corsMiddleware);
app.options('*', corsPreflight);

app.use(express.json());

// Explicitly deny unrestricted public static access to private upload assets.
// Private leave certificates must be accessed exclusively via the authenticated download endpoint.
// Public static file serving of the /uploads directory is completely disabled.
app.use('/uploads', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Health check / Root
app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'Advanced Leave Management System API is running' });
});

// Routes
const leaveRoutes = require('./routes/leaveRoutes');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/leave', leaveRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log('Server running on port', PORT));
}).catch(err => {
  console.error('Database connection error:', err);
});
