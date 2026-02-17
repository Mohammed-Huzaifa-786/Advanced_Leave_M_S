import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function StudentProfile() {
  const [student, setStudent] = useState(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const id = localStorage.getItem("userId");
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
      setName(res.data.name);
      setUsername(res.data.username);
      setDepartment(res.data.department || "");
    } catch (err) {
      alert("Unable to load profile");
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      const id = localStorage.getItem("userId");

      await api.put(`/students/update/${id}`, {
        name,
        username,
        department,
      });

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      alert("Update failed");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      const id = localStorage.getItem("userId");

      await api.put(`/students/change-password/${id}`, {
        password,
      });

      setPassword("");
      alert("Password updated");
    } catch (err) {
      alert("Password update failed");
    }
  }

  if (!student) return <p className="p-10">Loading...</p>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-semibold mb-6">My Profile 👤</h1>

      {success && (
        <p className="bg-green-200 text-green-800 p-2 rounded mb-4">
          {success}
        </p>
      )}

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Profile Update */}
        <form
          onSubmit={updateProfile}
          className="bg-white shadow p-6 rounded"
        >
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

          <label>Name</label>
          <input
            className="border p-2 rounded w-full mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Username</label>
          <input
            className="border p-2 rounded w-full mb-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Department</label>
          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="CSE / ISE / ECE ..."
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save Changes
          </button>
        </form>

        {/* Password Change */}
        <form
          onSubmit={changePassword}
          className="bg-white shadow p-6 rounded"
        >
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>

          <label>New Password</label>
          <input
            type="password"
            className="border p-2 rounded w-full mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="bg-gray-800 text-white px-4 py-2 rounded">
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
