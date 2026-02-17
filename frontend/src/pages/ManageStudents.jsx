import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const res = await api.get("/students/all");
      setStudents(res.data);
    } catch (err) {
      alert("Cannot load students");
    }
  }

  async function addStudent(e) {
    e.preventDefault();
    try {
      await api.post("/students/add", { name, username });
      alert("Student added");
      setName("");
      setUsername("");
      loadStudents();
    } catch (err) {
      alert("Error adding student");
    }
  }

  async function deleteStudent(id) {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/students/delete/${id}`);
      loadStudents();
    } catch (err) {
      alert("Cannot delete student");
    }
  }

  async function updateStudent(e) {
    e.preventDefault();
    try {
      await api.put(`/students/update/${editing}`, { name, username });
      alert("Updated successfully");
      setName("");
      setUsername("");
      setEditing(null);
      loadStudents();
    } catch (err) {
      alert("Cannot update student");
    }
  }

  function startEdit(s) {
    setEditing(s.id);
    setName(s.name);
    setUsername(s.username);
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Manage Students 👨‍🎓
          </h1>
          <p className="text-gray-600 text-center">Add, edit, and manage student accounts</p>
        </div>

        {/* Add/Edit Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {editing ? (
              <>
                <span className="text-2xl">✏️</span>
                Edit Student
              </>
            ) : (
              <>
                <span className="text-2xl">➕</span>
                Add New Student
              </>
            )}
          </h2>

          <div onSubmit={editing ? updateStudent : addStudent}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={editing ? updateStudent : addStudent}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                {editing ? "💾 Update Student" : "➕ Add Student"}
              </button>

              {editing && (
                <button
                  onClick={() => { setEditing(null); setName(""); setUsername(""); }}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  ✖ Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search students by name or username..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Found {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Student List */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-6xl mb-4">👨‍🎓</div>
              <p className="text-xl text-gray-600">No students found</p>
              <p className="text-gray-500 mt-2">
                {search ? "Try adjusting your search" : "Add your first student to get started"}
              </p>
            </div>
          )}

          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{s.name}</h3>
                        <p className="text-gray-600">@{s.username}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => startEdit(s)}
                      className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => deleteStudent(s.id)}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}