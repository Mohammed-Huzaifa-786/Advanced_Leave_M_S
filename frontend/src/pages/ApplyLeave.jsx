import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/Toast";

export default function ApplyLeave() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState(location.state?.fromDate || "");
  const [toDate, setToDate] = useState(location.state?.toDate || "");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Login session expired. Please log in first.");
      setTimeout(() => navigate("/"), 1500);
      return;
    }

    if (!fromDate || !toDate) {
      toast.warning("Please select both start and end dates.");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.warning("From date cannot be after To date.");
      return;
    }

    if (!reason.trim()) {
      toast.warning("Please provide a reason for the leave application.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("leaveType", leaveType);
      formData.append("fromDate", fromDate);
      formData.append("toDate", toDate);
      formData.append("reason", reason);
      if (file) {
        formData.append("file", file);
      }

      await api.post("/leave/apply", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Leave application submitted successfully!");
      setTimeout(() => {
        navigate("/leave-history");
      }, 1000);
    } catch (err) {
      console.error("Error =>", err);
      toast.error(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Apply for Leave"
          subtitle="Submit formal leave requests with classification, date range, and optional medical certificates."
          icon="fileText"
          breadcrumbs={[
            { label: "Student Portal", to: "/student" },
            { label: "Leave Application" },
          ]}
          actions={
            <Link
              to="/leave-history"
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs flex items-center gap-1.5"
            >
              <Icon name="clock" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Leave History</span>
            </Link>
          }
        />

        <form
          onSubmit={submit}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-700 space-y-5"
        >
          {/* Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Leave Classification
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition cursor-pointer"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Emergency Leave</option>
              <option>Earned Leave</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                From Date *
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                To Date *
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reason for Leave *
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none"
              placeholder="State the purpose and circumstances requiring absence..."
              rows="4"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            ></textarea>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Supporting Document / Certificate <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/80 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
                  <Icon name="checkCircle" className="w-3.5 h-3.5" />
                  <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Accepted formats: PDF, DOCX, JPG, PNG (Max 5MB)</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <Link
              to="/student"
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="checkCircle" className="w-4 h-4 text-indigo-200" />
              <span>{submitting ? "Submitting Application..." : "Submit Application"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}