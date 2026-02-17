import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar({ role = localStorage.getItem("role") }) {
  return (
    <div className="w-64 bg-gray-100 h-screen shadow-lg p-5 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Menu</h2>

      {role === "admin" ? (
        <>
          <Link className="block hover:text-blue-600" to="/admin">Dashboard</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/approve-leave">Approve Leave</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/manage-students">Manage Students</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/manage-holidays">Manage Holidays</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/reports">Reports</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/attendance-calendar">Attendance</Link>
        </>
      ) : (
        <>
          <Link className="block hover:text-blue-600" to="/student">Dashboard</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/apply-leave">Apply Leave</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/leave-history">Leave History</Link>

          {/* FIXED route */}
          <Link className="block hover:text-blue-600" to="/attendance-calendar">Attendance Calendar</Link>

          <Link className="block hover:text-blue-600" to="/profile">Profile</Link>

        </>
      )}
    </div>
  );
}
