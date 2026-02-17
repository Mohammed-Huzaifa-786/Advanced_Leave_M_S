import React from "react";

export default function Navbar() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="w-full bg-white shadow px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* logo - using uploaded file path */}
        <img src="/mnt/data/70cec97e-9091-4530-b55d-82228d2cde3c.png" alt="logo" className="h-10 w-10 rounded-md" />
        <h1 className="text-lg font-semibold">Leave Management</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
