const express = require('express');
const app = express();
const cors = require('cors');
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

// CORS configuration & Private Network Access support (Chrome PNA)
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

app.use(
  cors({
    origin: true, // Dynamically reflect request origin for full cross-origin & local development support
    credentials: true,
  })
);
app.options('*', cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    },
  })
);

// Health check / Root
app.get('/', (req, res) => {
  res.json({ status: 'healthy', message: 'Advanced Leave Management System API is running' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
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

