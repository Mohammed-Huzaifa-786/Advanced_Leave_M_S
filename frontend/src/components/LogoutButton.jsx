import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("studentId");
    localStorage.removeItem("role");

    alert("Logged out successfully!");
    navigate("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 font-semibold"
    >
      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Button content */}
      <span className="relative flex items-center gap-2">
        <svg 
          className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
          />
        </svg>
        Logout
      </span>
    </button>
  );
}