import { Routes, Route } from "react-router-dom";

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

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import ManageStudents from "./pages/ManageStudents";
import ManageHolidays from "./pages/ManageHolidays";
import Reports from "./pages/Reports";
import ApproveLeave from "./pages/ApproveLeave"; // Added

function App() {
  return (
    <Routes>

      {/* Authentication */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Student */}
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/apply-leave" element={<ApplyLeave />} />
      <Route path="/leave-history" element={<LeaveHistory />} />
      <Route path="/attendance" element={<AttendanceCalendar />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/approve-leave" element={<ApproveLeave />} /> {/* Added */}
      <Route path="/attendance-calendar" element={<AttendanceCalendar />} /> {/* Added */}
      <Route path="/manage-students" element={<ManageStudents />} />
      <Route path="/manage-holidays" element={<ManageHolidays />} />
      <Route path="/reports" element={<Reports />} />

    </Routes>
  );
}

export default App;
