import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";

export default function ManageHolidays() {
  const { toast } = useToast();
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/holidays/all");
      setHolidays(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Cannot load holidays");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  async function addHoliday(e) {
    e.preventDefault();
    try {
      await api.post("/holidays/add", { name, date });
      toast.success("Holiday registered successfully.");
      setName("");
      setDate("");
      loadHolidays();
    } catch (err) {
      console.error(err);
      toast.error("Error adding holiday");
    }
  }

  async function updateHoliday(e) {
    e.preventDefault();
    try {
      await api.put(`/holidays/update/${editing}`, { name, date });
      toast.success("Holiday updated successfully.");
      setName("");
      setDate("");
      setEditing(null);
      loadHolidays();
    } catch (err) {
      console.error(err);
      toast.error("Cannot update holiday");
    }
  }

  async function deleteHoliday(id) {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await api.delete(`/holidays/delete/${id}`);
      toast.success("Holiday deleted successfully.");
      loadHolidays();
    } catch (err) {
      console.error(err);
      toast.error("Cannot delete holiday");
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

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr.includes("T")) return new Date(dateStr);
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const sortedFiltered = [...filtered].sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Institutional Holiday Calendar"
          subtitle="Declare and manage college holidays and academic closures factored into attendance formulas."
          icon="calendar"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Holidays" },
          ]}
          actions={
            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
              {holidays.length} Registered
            </span>
          }
        />

        {/* Add/Edit Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name={editing ? "refresh" : "plus"} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{editing ? "Edit Holiday" : "Declare New Holiday"}</span>
          </h2>

          <form onSubmit={editing ? updateHoliday : addHoliday}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Holiday Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
              >
                <Icon name="checkCircle" className="w-4 h-4 text-indigo-200" />
                <span>{editing ? "Save Holiday" : "Add Holiday"}</span>
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(null); setName(""); setDate(""); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 border border-slate-200/80 dark:border-slate-700">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Icon name="search" className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search holidays by name..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Holidays List */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : sortedFiltered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No Holidays Found"
            description={search ? "No holidays match your search" : "No institutional holidays declared yet"}
          />
        ) : (
          <div className="space-y-3">
            {sortedFiltered.map((h) => {
              const holidayDate = parseLocalDate(h.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = holidayDate < today;

              return (
                <div
                  key={h.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs hover:shadow-md transition p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-center flex-shrink-0">
                      <div>
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {holidayDate.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                          {holidayDate.getDate()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{h.name}</h3>
                        {isPast && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-medium rounded-full">
                            Past
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {holidayDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(h)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium transition border border-indigo-200 dark:border-indigo-800/60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteHoliday(h.id)}
                      className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium transition border border-rose-200 dark:border-rose-800/60"
                      title="Delete Holiday"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}