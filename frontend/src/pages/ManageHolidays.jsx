import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function ManageHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadHolidays();
  }, []);

  async function loadHolidays() {
    try {
      const res = await api.get("/holidays/all");
      setHolidays(res.data);
    } catch (err) {
      alert("Cannot load holidays");
    }
  }

  async function addHoliday(e) {
    e.preventDefault();
    try {
      await api.post("/holidays/add", { name, date });
      alert("Holiday added");
      setName("");
      setDate("");
      loadHolidays();
    } catch (err) {
      alert("Error adding holiday");
    }
  }

  async function updateHoliday(e) {
    e.preventDefault();
    try {
      await api.put(`/holidays/update/${editing}`, { name, date });
      alert("Updated successfully");
      setName("");
      setDate("");
      setEditing(null);
      loadHolidays();
    } catch (err) {
      alert("Cannot update holiday");
    }
  }

  async function deleteHoliday(id) {
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await api.delete(`/holidays/delete/${id}`);
      loadHolidays();
    } catch (err) {
      alert("Cannot delete holiday");
    }
  }

  function startEdit(h) {
    setEditing(h.id);
    setName(h.name);
    setDate(h.date);
  }

  const filtered = holidays.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort holidays by date
  const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-yellow-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium mb-4 transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl text-center font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2">
            Manage Holidays 📅
          </h1>
          <p className="text-gray-600 text-center">Add, edit, and manage institution holidays</p>
        </div>

        {/* Add/Edit Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            {editing ? (
              <>
                <span className="text-2xl">✏️</span>
                Edit Holiday
              </>
            ) : (
              <>
                <span className="text-2xl">🎉</span>
                Add New Holiday
              </>
            )}
          </h2>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Holiday Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Independence Day"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={editing ? updateHoliday : addHoliday}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                {editing ? "💾 Update Holiday" : "➕ Add Holiday"}
              </button>

              {editing && (
                <button
                  onClick={() => { setEditing(null); setName(""); setDate(""); }}
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
              placeholder="Search holidays by name..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Found {filtered.length} holiday{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Holidays List */}
        <div className="space-y-4">
          {sortedFiltered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="text-6xl mb-4">🎊</div>
              <p className="text-xl text-gray-600">No holidays found</p>
              <p className="text-gray-500 mt-2">
                {search ? "Try adjusting your search" : "Add your first holiday to get started"}
              </p>
            </div>
          )}

          {sortedFiltered.map((h) => {
            const holidayDate = new Date(h.date);
            const today = new Date();
            const isPast = holidayDate < today;
            const isUpcoming = !isPast;

            return (
              <div
                key={h.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-sm ${
                          isUpcoming 
                            ? 'bg-gradient-to-br from-orange-500 to-yellow-600' 
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          <div className="text-center">
                            <div className="text-xs">{holidayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                            <div className="text-2xl font-bold">{holidayDate.getDate()}</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{h.name}</h3>
                          <p className="text-gray-600">
                            {holidayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          {isPast && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Past
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEdit(h)}
                        className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => deleteHoliday(h.id)}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}