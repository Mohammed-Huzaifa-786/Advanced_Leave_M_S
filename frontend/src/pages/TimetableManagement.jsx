import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";
import TimetablePrintModal from "../components/TimetablePrintModal";
import TimetableGrid from "../components/TimetableGrid";

export default function TimetableManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [printModalTimetable, setPrintModalTimetable] = useState(null);
  const [inspectedTimetable, setInspectedTimetable] = useState(null);
  const [resources, setResources] = useState({ subjects: [], faculties: [], rooms: [] });
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceType, setResourceType] = useState("subject");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [semFilter, setSemFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [resourceForm, setResourceForm] = useState({
    name: "",
    code: "",
    department: "CSE",
    semester: 7,
    weeklyPeriods: 4,
    isLab: false,
    consecutivePeriods: 1,
    email: "",
    designation: "Assistant Professor",
    capacity: 60,
    type: "classroom",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ttRes, resRes] = await Promise.all([
        api.get("/timetable/admin/list"),
        api.get("/timetable/admin/resources"),
      ]);
      setTimetables(ttRes.data || []);
      setResources(resRes.data || { subjects: [], faculties: [], rooms: [] });

      // If an inspected timetable is open, refresh its data reference
      setInspectedTimetable((prev) => {
        if (!prev) return null;
        return (ttRes.data || []).find((t) => t.id === prev.id) || prev;
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load academic timetables");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePublish(id, isPublished, confirmReplace = false) {
    try {
      const endpoint = isPublished
        ? `/timetable/admin/unpublish/${id}`
        : `/timetable/admin/publish/${id}`;
      await api.put(endpoint, { confirmReplace });
      toast.success(isPublished ? "Timetable switched to draft." : "Timetable published for students!");
      loadData();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresConfirmation) {
        const replaceConfirmed = window.confirm(
          `${err.response.data.message}\n\nClick OK to replace the active published timetable, or Cancel to keep current schedules unchanged.`
        );
        if (replaceConfirmed) {
          handlePublish(id, isPublished, true);
        }
        return;
      }
      toast.error(err.response?.data?.message || "Failed to update timetable status");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to permanently delete timetable "${name}"?`)) return;
    try {
      await api.delete(`/timetable/admin/${id}`);
      toast.success(`Deleted timetable "${name}"`);
      if (inspectedTimetable?.id === id) {
        setInspectedTimetable(null);
      }
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete timetable");
    }
  }

  async function handleSeedBmsit() {
    try {
      setSeeding(true);
      const initialRes = await api.post("/timetable/admin/seed-bmsit");
      if (initialRes.data.exists) {
        const confirmOverwrite = window.confirm(
          `${initialRes.data.message}\n\nClick OK to update its slots with the BMSIT demo schedule, or Cancel to keep existing data unchanged.`
        );
        if (!confirmOverwrite) {
          setSeeding(false);
          return;
        }
        const overwriteRes = await api.post("/timetable/admin/seed-bmsit", { overwrite: true });
        toast.success(overwriteRes.data.message);
        loadData();
        return;
      }
      toast.success(initialRes.data.message);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to seed BMSIT timetable");
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreateResource(e) {
    e.preventDefault();
    try {
      await api.post("/timetable/admin/resources", {
        type: resourceType,
        data: resourceForm,
      });
      toast.success(`${resourceType.toUpperCase()} registered successfully`);
      setShowResourceModal(false);
      setResourceForm({
        name: "",
        code: "",
        department: "CSE",
        semester: 7,
        weeklyPeriods: 4,
        isLab: false,
        consecutivePeriods: 1,
        email: "",
        designation: "Assistant Professor",
        capacity: 60,
        type: "classroom",
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create resource");
    }
  }

  // Filtered Timetables
  const filteredTimetables = useMemo(() => {
    return timetables.filter((tt) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        tt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tt.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tt.section && tt.section.toLowerCase().includes(searchQuery.toLowerCase()));

      // Dept Filter
      const matchesDept = deptFilter === "ALL" || tt.department === deptFilter;

      // Sem Filter
      const matchesSem = semFilter === "ALL" || String(tt.semester) === String(semFilter);

      // Status Filter
      const matchesStatus = statusFilter === "ALL" || tt.status === statusFilter;

      return matchesSearch && matchesDept && matchesSem && matchesStatus;
    });
  }, [timetables, searchQuery, deptFilter, semFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Timetable Management"
          subtitle="Configure resources, inspect clash-free schedules, resolve constraints, and publish departmental timetables."
          icon="calendar"
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin" },
            { label: "Timetable Management" },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSeedBmsit}
                disabled={seeding}
                className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                title="Load 7th Sem CSE reference schedule as demo data"
              >
                <Icon name="sparkles" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{seeding ? "Loading..." : "Load BMSIT Demo"}</span>
              </button>
              <button
                onClick={() => setShowResourceModal(true)}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
              >
                <Icon name="plus" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Add Resource</span>
              </button>
              <Link
                to="/timetable-generator"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs flex items-center gap-1.5 transition"
              >
                <Icon name="sparkles" className="w-4 h-4 text-indigo-200" />
                <span>Generate Timetable</span>
              </Link>
            </div>
          }
        />

        {/* Resource Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/80 flex-shrink-0">
              <Icon name="bookOpen" className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {resources.subjects.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Subjects & Labs</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/80 flex-shrink-0">
              <Icon name="users" className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {resources.faculties.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Faculty Members</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/80 flex-shrink-0">
              <Icon name="building" className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {resources.rooms.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Classrooms & Labs</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800/80 flex-shrink-0">
              <Icon name="calendar" className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{timetables.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Timetables</p>
            </div>
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <div className="relative w-full max-w-sm">
              <Icon
                name="search"
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search by name, dept, section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ISE">ISE</option>
              <option value="ECE">ECE</option>
              <option value="AIML">AIML</option>
            </select>

            {/* Semester Filter */}
            <select
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* IN-PAGE SCHEDULE INSPECTOR */}
        {inspectedTimetable && (
          <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-900/80 rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xl space-y-4 transition-all">
            {/* Inspector Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Icon name="eye" className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {inspectedTimetable.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inspectedTimetable.status === "published"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {inspectedTimetable.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {inspectedTimetable.department} • Semester {inspectedTimetable.semester} • Section{" "}
                    {inspectedTimetable.section} • AY {inspectedTimetable.academicYear}
                  </p>
                </div>
              </div>

              {/* Inspector Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalTimetable(inspectedTimetable)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Icon name="printer" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePublish(
                      inspectedTimetable.id,
                      inspectedTimetable.status === "published"
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                    inspectedTimetable.status === "published"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <Icon
                    name={
                      inspectedTimetable.status === "published" ? "xCircle" : "checkCircle"
                    }
                    className="w-3.5 h-3.5"
                  />
                  <span>
                    {inspectedTimetable.status === "published" ? "Unpublish" : "Publish"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/timetable-generator?edit=${inspectedTimetable.id}`)
                  }
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold transition border border-indigo-200 dark:border-indigo-800"
                >
                  Edit in Generator
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedTimetable(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Close Inspector"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Timetable Grid */}
            <TimetableGrid
              slots={inspectedTimetable.slots || []}
              timetableInfo={inspectedTimetable}
              defaultViewMode="weekly"
            />
          </div>
        )}

        {/* Timetables Cards List */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : filteredTimetables.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={
              timetables.length === 0
                ? "No Timetables Generated Yet"
                : "No Timetables Matching Filters"
            }
            description={
              timetables.length === 0
                ? "Create clash-free academic schedules for each department and semester with automatic constraint satisfaction."
                : "Try clearing your search query or selecting 'All' for department, semester, and status."
            }
            actionText={timetables.length === 0 ? "Launch Generator" : "Reset Filters"}
            onAction={() => {
              if (timetables.length === 0) {
                navigate("/timetable-generator");
              } else {
                setSearchQuery("");
                setDeptFilter("ALL");
                setSemFilter("ALL");
                setStatusFilter("ALL");
              }
            }}
          />
        ) : (
          <div className="space-y-3.5">
            {filteredTimetables.map((tt) => {
              const isInspecting = inspectedTimetable?.id === tt.id;
              const slotsCount = tt.slots?.length || 0;
              const labCount = (tt.slots || []).filter((s) => s.isLab).length;
              const theoryCount = slotsCount - labCount;

              return (
                <div
                  key={tt.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xs hover:shadow-md transition p-5 border ${
                    isInspecting
                      ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20"
                      : "border-slate-200/80 dark:border-slate-700"
                  } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {tt.name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          tt.status === "published"
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {tt.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {tt.department}
                      </span>
                      <span>•</span>
                      <span>Semester {tt.semester}</span>
                      <span>•</span>
                      <span>Section {tt.section}</span>
                      <span>•</span>
                      <span>Academic Year {tt.academicYear}</span>
                      <span>•</span>
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium border border-transparent dark:border-slate-600">
                        {slotsCount} slots/week ({theoryCount} Theory, {labCount} Lab)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setInspectedTimetable(isInspecting ? null : tt)
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                        isInspecting
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      <Icon name="eye" className="w-3.5 h-3.5" />
                      <span>{isInspecting ? "Hide Schedule" : "View Schedule"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintModalTimetable(tt)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 shadow-xs"
                      title="Export formatted PDF"
                    >
                      <Icon
                        name="printer"
                        className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"
                      />
                      <span>Print / PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePublish(tt.id, tt.status === "published")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                        tt.status === "published"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <Icon
                        name={tt.status === "published" ? "xCircle" : "checkCircle"}
                        className="w-3.5 h-3.5"
                      />
                      <span>{tt.status === "published" ? "Unpublish" : "Publish"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/timetable-generator?edit=${tt.id}`)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition border border-slate-200 dark:border-slate-600"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(tt.id, tt.name)}
                      className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-medium transition border border-rose-200 dark:border-rose-800"
                      title="Delete Timetable"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Academic Resources */}
        {showResourceModal && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Academic Resource
                </h3>
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              {/* Type selector */}
              <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl mb-5">
                {["subject", "faculty", "room"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setResourceType(t)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition ${
                      resourceType === t
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCreateResource} className="space-y-3.5">
                {resourceType === "subject" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Subject Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Distributed Operating Systems"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        value={resourceForm.name}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Subject Code *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 21CS71"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.code}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, code: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Department *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.department}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, department: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Semester
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.semester}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, semester: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Weekly Periods
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.weeklyPeriods}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, weeklyPeriods: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={resourceForm.isLab}
                          onChange={(e) =>
                            setResourceForm({
                              ...resourceForm,
                              isLab: e.target.checked,
                              consecutivePeriods: e.target.checked ? 2 : 1,
                            })
                          }
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600"
                        />
                        <span>Practical Laboratory Session (2 Consecutive Periods)</span>
                      </label>
                    </div>
                  </>
                )}

                {resourceType === "faculty" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Faculty Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Alan Turing"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        value={resourceForm.name}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Department *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CSE"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        value={resourceForm.department}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, department: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="faculty@college.edu"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        value={resourceForm.email}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, email: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {resourceType === "room" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Room / Lab Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LH-101 or Computer Lab 3"
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        value={resourceForm.name}
                        onChange={(e) =>
                          setResourceForm({ ...resourceForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Room Type
                        </label>
                        <select
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.type}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, type: e.target.value })
                          }
                        >
                          <option value="classroom">Classroom</option>
                          <option value="lab">Computer / Hardware Lab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Capacity
                        </label>
                        <input
                          type="number"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          value={resourceForm.capacity}
                          onChange={(e) =>
                            setResourceForm({ ...resourceForm, capacity: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-3 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm transition shadow-xs"
                  >
                    Save Resource
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResourceModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs sm:text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Timetable Print & Export PDF Modal */}
        {printModalTimetable && (
          <TimetablePrintModal
            timetable={printModalTimetable}
            onClose={() => setPrintModalTimetable(null)}
          />
        )}
      </div>
    </div>
  );
}
