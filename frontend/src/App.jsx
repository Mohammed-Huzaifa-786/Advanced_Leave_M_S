import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./context/ThemeContext";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";

// Student pages
import StudentDashboard from "./pages/StudentDashboard";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveHistory from "./pages/LeaveHistory";
import AttendanceCalendar from "./pages/AttendanceCalendar";
import StudentProfile from "./pages/StudentProfile";
import MyTimetable from "./pages/MyTimetable";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";
import SmartLeavePlanner from "./pages/SmartLeavePlanner";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import ManageStudents from "./pages/ManageStudents";
import ManageHolidays from "./pages/ManageHolidays";
import Reports from "./pages/Reports";
import ApproveLeave from "./pages/ApproveLeave";
import TimetableManagement from "./pages/TimetableManagement";
import TimetableGenerator from "./pages/TimetableGenerator";
import ClassAttendance from "./pages/ClassAttendance";

// 404 Not Found page
import NotFound from "./pages/NotFound";

// Layout
import Layout from "./components/Layout";

import { AuthProvider, useAuth } from "./context/AuthContext";

// Route guard for public-only pages (Login, Signup, Forgot Password)
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && role) {
    return <Navigate to={role === "admin" ? "/admin" : "/student"} replace />;
  }

  return children;
}

// Role guard for protected routes
function RequireRole({ allowedRoles, children }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/student"} replace />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

            {/* Protected Authenticated Routes with Navbar & Sidebar */}
            <Route element={<Layout />}>
              {/* Student-Only Routes */}
              <Route path="/student" element={<RequireRole allowedRoles={["student"]}><StudentDashboard /></RequireRole>} />
              <Route path="/apply-leave" element={<RequireRole allowedRoles={["student"]}><ApplyLeave /></RequireRole>} />
              <Route path="/leave-history" element={<RequireRole allowedRoles={["student"]}><LeaveHistory /></RequireRole>} />
              <Route path="/profile" element={<RequireRole allowedRoles={["student"]}><StudentProfile /></RequireRole>} />
              <Route path="/my-timetable" element={<RequireRole allowedRoles={["student"]}><MyTimetable /></RequireRole>} />
              <Route path="/attendance-analytics" element={<RequireRole allowedRoles={["student"]}><AttendanceAnalytics /></RequireRole>} />
              <Route path="/smart-leave-planner" element={<RequireRole allowedRoles={["student"]}><SmartLeavePlanner /></RequireRole>} />

              {/* Shared Authenticated Routes */}
              <Route path="/change-password" element={<RequireRole allowedRoles={["student", "admin"]}><ChangePassword /></RequireRole>} />
              <Route path="/attendance" element={<RequireRole allowedRoles={["student", "admin"]}><AttendanceCalendar /></RequireRole>} />
              <Route path="/attendance-calendar" element={<RequireRole allowedRoles={["student", "admin"]}><AttendanceCalendar /></RequireRole>} />

              {/* Admin-Only Routes */}
              <Route path="/admin" element={<RequireRole allowedRoles={["admin"]}><AdminDashboard /></RequireRole>} />
              <Route path="/approve-leave" element={<RequireRole allowedRoles={["admin"]}><ApproveLeave /></RequireRole>} />
              <Route path="/manage-students" element={<RequireRole allowedRoles={["admin"]}><ManageStudents /></RequireRole>} />
              <Route path="/manage-holidays" element={<RequireRole allowedRoles={["admin"]}><ManageHolidays /></RequireRole>} />
              <Route path="/reports" element={<RequireRole allowedRoles={["admin"]}><Reports /></RequireRole>} />
              <Route path="/timetable-management" element={<RequireRole allowedRoles={["admin"]}><TimetableManagement /></RequireRole>} />
              <Route path="/timetable-generator" element={<RequireRole allowedRoles={["admin"]}><TimetableGenerator /></RequireRole>} />
              <Route path="/class-attendance" element={<RequireRole allowedRoles={["admin"]}><ClassAttendance /></RequireRole>} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
