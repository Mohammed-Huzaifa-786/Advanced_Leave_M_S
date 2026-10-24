import React from "react";
import Icon from "./Icons";

export function EmptyState({
  icon = "fileText",
  title = "No records found",
  description = "There are currently no entries or items to display.",
  actionLabel,
  onAction,
  actionLink,
  className = "",
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center flex flex-col items-center justify-center transition-colors ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4 shadow-xs">
        <Icon name={icon} className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        actionLink ? (
          <a
            href={actionLink}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm hover:shadow"
          >
            {actionLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm hover:shadow active:scale-95"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

export default EmptyState;
