# Advanced Leave & Timetable Management System

> A production-grade, full-stack Academic ERP for higher education institutions featuring **User-Controlled Timetable Scheduling**, **Minimal-Change Conflict Resolution**, **Continuous Multi-Period Lab Blocks**, **Subject-Wise Attendance Analytics**, **Smart Leave Planning**, and **Role-Based Access Control (RBAC)**.

---

## 📋 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features & Business Logic](#-key-features--business-logic)
- [Repository Structure](#-repository-structure)
- [Prerequisites & Requirements](#-prerequisites--requirements)
- [Environment Configuration](#-environment-configuration)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Test Suites & Quality Verification](#-test-suites--quality-verification)
- [API Reference Summary](#-api-reference-summary)
- [Security & Compliance](#-security--compliance)

---

## 🏛 Overview & Architecture

The **Advanced Leave & Timetable Management System** is built on a clean decoupled client-server architecture:

```
┌────────────────────────────────────────────────────────┐
│                   React 19 SPA (Vite)                  │
│  - TailwindCSS Modern Dark/Light Theme                 │
│  - User-Controlled Timetable Matrix & Grid             │
│  - Interactive Stepper, Conflict Modals & Analytics    │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT Auth)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js / Node.js                  │
│  - RBAC & IDOR Route Protection Middleware             │
│  - User-Controlled Timetable Scheduling Engine         │
│  - Minimal-Change Conflict Resolver                    │
│  - Backtracking Constraint Optimization Solver         │
│  - Smart Leave & Attendance Projection Services        │
└───────────────────────────┬────────────────────────────┘
                            │ Sequelize ORM 6
┌───────────────────────────▼────────────────────────────┐
│                    MySQL Database                      │
│  - Users, Students, Faculty, Rooms, Subjects           │
│  - Timetables, TimetableSlots, Attendance, Holidays    │
│  - LeaveRequests, LeaveBalances, Notifications         │
└────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 7, TailwindCSS 3.4, React Router 7, Axios, Lucide Icons |
| **Backend** | Node.js 18+, Express.js 4, Sequelize ORM 6, MySQL2, JWT (`jsonwebtoken`), Bcrypt |
| **Testing** | Puppeteer-core, Native Node Test Runners, Jest-compatible assertions |
| **File Storage** | Multer local storage for medical/leave certificates (`backend/uploads/certificates/`) |

---

## ⚡ Key Features & Business Logic

### 1. User-Controlled Timetable Generator
- **Admin Preference First**: The administrator defines preferred days and periods for each subject, faculty, and room.
- **100% Preservation**: When configured assignments are conflict-free, they are preserved with zero unwanted rearrangements.
- **Minimal Conflict Resolution**: If conflicts exist (faculty clash, room clash, section clash), the engine locks all non-conflicting assignments and moves only the conflicting classes to the closest available valid slots.
- **Honest Infeasibility**: If a requested schedule violates capacity or constraints, it returns detailed diagnostic explanations rather than silently dropping classes or faking clash-free results.

### 2. Standard Collegiate Period Schedule & Grid Orientation
- **Days as Rows, Periods as Columns**: Monday to Saturday rows with periods I through VII as columns.
- **Institutional Period Timings**:
  - **Period I**: 08:30 – 09:25
  - **Period II**: 09:25 – 10:20
  - *Tea Break*: 10:20 – 10:40
  - **Period III**: 10:40 – 11:35
  - **Period IV**: 11:35 – 12:30
  - *Lunch Break*: 12:30 – 13:25
  - **Period V**: 13:25 – 14:20
  - **Period VI**: 14:20 – 15:15
  - **Period VII**: 15:15 – 16:10
- **110-Minute Continuous Lab Blocks**: Consecutive 2-period lab requirements reserve both slots continuously without intervening breaks or split periods across lunch/tea boundaries.

### 3. Subject-Wise Attendance Analytics
- Dynamic mapping from published semester timetables.
- Real-time calculation of conducted, present, absent, and excused leave periods.
- Color-coded status thresholds: **SAFE** (≥ 75%), **WARNING** (65%–74%), and **DANGER** (< 65%).
- Mathematically precise recovery recommendations: "Attend the next N consecutive classes to reach 75%".

### 4. Smart Leave Planner
- **Duration Recommendation**: Finds the optimal dates across the upcoming 30 days to take leave with minimum attendance impact.
- **Date Range Impact Simulation**: Computes projected post-leave percentages per subject prior to applying for leave.
- **Official Holiday Handling**: Automatically detects gazetted institutional holidays and marks them as zero missed classes.

### 5. Multi-Period Leave & Daily Attendance Sync
- Approved student leaves automatically mark the student's daily attendance records as `on_leave`.
- 1-Click bulk class attendance register for faculty and administrators.

---

## 📁 Repository Structure

```
Advanced_Leave_M_S/
├── backend/
│   ├── config/
│   │   └── db.js                        # Database connection & Sequelize instance
│   ├── controllers/
│   │   ├── analyticsController.js       # Subject attendance & smart leave endpoints
│   │   ├── attendanceController.js      # Class registers & daily attendance marking
│   │   ├── authController.js            # Login, signup, password management
│   │   ├── holidayController.js         # Academic holiday CRUD
│   │   ├── leaveController.js           # Leave application & approval workflows
│   │   ├── reportController.js          # Export reports & leave statistics
│   │   ├── studentController.js         # Student profiles & student management
│   │   └── timetableController.js       # Timetable generator, save, publish & seed
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification & RBAC authorization
│   │   └── uploadMiddleware.js          # Multer storage configuration for certificates
│   ├── models/
│   │   ├── Attendance.js                # Daily student attendance records
│   │   ├── Faculty.js                   # Faculty members & department assignments
│   │   ├── Holiday.js                   # Official institutional holidays
│   │   ├── LeaveBalance.js              # Student annual leave balance quotas
│   │   ├── LeaveRequest.js              # Leave applications & approval statuses
│   │   ├── Notification.js              # In-app notifications
│   │   ├── Room.js                      # Classrooms, lecture halls, and laboratories
│   │   ├── Student.js                   # Student academic profiles
│   │   ├── Subject.js                   # Course catalog, credits & lab flags
│   │   ├── Timetable.js                 # Timetable metadata (draft / published)
│   │   ├── TimetableSlot.js             # Individual class schedule matrix slots
│   │   └── index.js                     # Sequelize model associations & foreign keys
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   ├── holidayRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── studentRoutes.js
│   │   └── timetableRoutes.js
│   ├── services/
│   │   ├── attendanceAnalyticsService.js# Subject attendance percentages & recovery math
│   │   ├── emailService.js              # Email notification stub
│   │   ├── smartLeaveService.js         # Smart leave planner impact engine
│   │   └── timetableGeneratorService.js # User-controlled scheduler, resolver & optimizer
│   ├── tests/
│   │   ├── unit/                        # Pure algorithmic & unit test suites
│   │   │   ├── attendanceAnalytics.test.js
│   │   │   ├── loginSecurity.test.js
│   │   │   ├── timetableOptimization.test.js
│   │   │   └── userControlledTimetable.test.js
│   │   ├── integration/                 # Full API & database integration suites
│   │   │   ├── apiRegression.test.js
│   │   │   ├── authComprehensive.test.js
│   │   │   ├── featuresAndWorkflows.test.js
│   │   │   ├── qaAdversarial.test.js
│   │   │   ├── seederIntegrity.test.js
│   │   │   └── workflowAudit.test.js
│   │   └── e2e/                         # Headless browser Puppeteer tests
│   │       ├── e2eAuthAudit.test.js
│   │       ├── e2eBackLogout.test.js
│   │       ├── e2eBrowserComplete.test.js
│   │       ├── e2eTimetableGrid.test.js
│   │       └── e2eUserControlled.test.js
│   ├── uploads/
│   │   └── certificates/                # User uploaded medical and leave certificates
│   ├── .env                             # Local environment variables (DO NOT COMMIT)
│   ├── .env.example                     # Sanitized environment template
│   ├── package.json                     # Backend dependencies & test scripts
│   └── server.js                        # Express app entry point
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js                 # Axios instance with auth interceptor
│   │   ├── components/
│   │   │   ├── EmptyState.jsx           # Clean fallback visual for empty tables
│   │   │   ├── Icons.jsx                # Centralized Lucide SVG icons
│   │   │   ├── Layout.jsx               # App layout with Sidebar and Navbar
│   │   │   ├── Navbar.jsx               # Top navigation bar with theme toggle & logout
│   │   │   ├── PageHeader.jsx           # Consistent breadcrumbs and action buttons
│   │   │   ├── Sidebar.jsx              # Responsive navigation drawer
│   │   │   ├── Skeleton.jsx             # Shimmer skeleton loaders
│   │   │   ├── ThemeToggle.jsx          # Dark / Light mode toggle
│   │   │   ├── TimetableGrid.jsx        # Matrix grid with Days as rows, Periods as cols
│   │   │   ├── TimetablePrintModal.jsx  # Collegiate PDF / Print dialog
│   │   │   └── Toast.jsx                # Global toast notifications
│   │   ├── context/
│   │   │   ├── AuthContext.jsx          # JWT authentication state & session restoration
│   │   │   └── ThemeContext.jsx         # Dark / Light theme provider
│   │   ├── pages/                       # Route pages (Admin & Student portals)
│   │   ├── App.jsx                      # Route definitions & guards
│   │   ├── main.jsx                     # Vite React DOM entry point
│   │   └── index.css                    # Tailwind CSS imports & global styles
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## ⚙ Prerequisites & Requirements

- **Node.js**: Version `18.0.0` or higher (Node 20+ recommended)
- **npm**: Version `9.0.0` or higher
- **MySQL Server**: Version `8.0` or higher (running locally or remotely)
- **Web Browser**: Chrome, Edge, or Chromium (for UI access and Puppeteer test execution)

---

## 🔐 Environment Configuration

Create a `.env` file in the `backend/` directory using the provided `backend/.env.example` as a template:

```env
# Database Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=leave_management
DB_PORT=3306

# Authentication & Security
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters

# Server Settings
PORT=5000
CLIENT_URL=http://localhost:5173
```

> [!IMPORTANT]
> Never commit real database credentials or `JWT_SECRET` keys to version control. The `.env` file is included in `.gitignore`.

---

## 🚀 Installation & Setup

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/Advanced_Leave_M_S.git
cd Advanced_Leave_M_S

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Initialization

1. Ensure MySQL is running on your machine:
   ```sql
   CREATE DATABASE IF NOT EXISTS leave_management;
   ```
2. Start the backend once to allow Sequelize to synchronize database schemas automatically:
   ```bash
   cd backend
   npm start
   ```
3. *(Optional)* Seed standard BMSIT 27-period 7th Semester curriculum by logging in as Admin and triggering the one-click seeder or running:
   ```bash
   npm run test:seeder
   ```

---

## 💻 Running the Application

### Running the Backend

```bash
cd backend

# Development mode (with auto-restart via nodemon)
npm run dev

# Production mode
npm start
```
The backend API starts on `http://localhost:5000` (API root: `http://localhost:5000/api`).

### Running the Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```
The frontend SPA opens on `http://localhost:5173`.

### Default Demo Credentials

| Role | Username | Password | Notes |
|---|---|---|---|
| **Admin** | `Admin` | `Admin@123` | Full access to Timetable Generator, Approval Queue, Reports |
| **Student** | `1BY23CS125` | `password123` | Access to My Timetable, Attendance Analytics, Smart Leave Planner |

---

## 🧪 Test Suites & Quality Verification

All test suites are organized under `backend/tests/` and can be executed with standard npm scripts:

| Command | Suite | Assertions | Description |
|---|---|---|---|
| `npm test` | Unit | **48 / 48** (100%) | Validates all 5 user-controlled timetable scenarios (Exact match, Faculty clash resolution, Room clash resolution, Section clash resolution, Impossible schedule). |
| `npm run test:optimization` | Unit | **53 / 53** (100%) | Constraint solver, contiguity optimization, break integrity, multi-period lab blocks. |
| `npm run test:attendance` | Unit | **31 / 31** (100%) | Attendance percentage math, threshold alerts, role checks, leave synchronization. |
| `npm run test:security` | Unit | **26 / 26** (100%) | Strict role validation on login, portal mismatch rejection, credential sanity. |
| `npm run test:auth` | Integration | **33 / 33** (100%) | JWT lifecycle, case-insensitive usernames, whitespace trimming, self-healing student profiles. |
| `npm run test:features` | Integration | **40 / 40** (100%) | Full feature workflow: Timetable draft/publish, student visibility, analytics, holiday handling, IDOR protection. |
| `npm run test:seeder` | Integration | **29 / 29** (100%) | BMSIT seeder execution, idempotence, resource deduplication, student timetable view. |
| `npm run test:regression` | Integration | **13 / 13** (100%) | Legacy REST API backward-compatibility regression suite. |
| `npm run test:workflow` | Integration | **63 / 63** (100%) | Comprehensive end-to-end backend workflow audit. |
| `npm run test:all` | Core Suites | **101 / 101** (100%) | Runs the complete core Timetable Scheduling and Optimization suites together. |
| `npm run test:e2e` | Browser E2E | Pass | Real Chromium browser automation for login, navigation, generator, matrix grid, and print export. |

---

## 📡 API Reference Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Authenticate user with role verification
- `POST /api/auth/signup` - Register student account
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/change-password` - Authenticated password update

### Timetable Management (`/api/timetable`)
- `GET /api/timetable/my-timetable` - Student personal published timetable
- `GET /api/timetable/admin/list` - Admin list all saved timetables
- `GET /api/timetable/admin/resources` - Subjects, faculty, and room lists
- `POST /api/timetable/admin/generate` - Generate clash-free timetable
- `POST /api/timetable/admin/save` - Save timetable as draft or published
- `PUT /api/timetable/admin/publish/:id` - Publish timetable with replacement checks
- `PUT /api/timetable/admin/unpublish/:id` - Revert published timetable to draft
- `DELETE /api/timetable/admin/:id` - Delete draft timetable
- `POST /api/timetable/admin/seed-bmsit` - One-click collegiate curriculum seeder

### Attendance & Analytics (`/api/attendance`, `/api/analytics`)
- `GET /api/attendance/:studentId/:year/:month` - Monthly student attendance calendar
- `POST /api/attendance/mark` - Admin record single attendance
- `POST /api/attendance/batch-mark` - Admin bulk attendance for class roster
- `GET /api/attendance/class-sheet` - Daily class attendance roster
- `GET /api/analytics/subject-attendance` - Subject-wise attendance calculation
- `POST /api/analytics/smart-leave-plan` - Smart leave simulation & recommendations

### Leave Workflows (`/api/leave`)
- `POST /api/leave/apply` - Apply for leave (supports certificate upload)
- `GET /api/leave/my-leaves` - Student leave history
- `GET /api/leave/all` - Admin leave approval queue
- `POST /api/leave/approve/:id` - Admin approve leave (syncs attendance)
- `POST /api/leave/reject/:id` - Admin reject/revert leave

---

## 🔒 Security & Compliance

- **Role-Based Access Control**: Strict middleware guards (`authenticate`, `authorize("admin")`) enforce endpoint boundaries.
- **IDOR Protection**: Students cannot access or modify records belonging to other students via URL manipulation.
- **Password Security**: Bcrypt salted hashing (`SALT_ROUNDS = 10`) ensures zero plaintext credentials in the database.
- **Session Security**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.

---

## 📄 License

This project is licensed under the MIT License.
