import { useState, useEffect, useCallback } from "react";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import { useApiClient } from "@shared/hooks/useApiClient";
import useOrderNumberPrefix from "@shared/hooks/useOrderNumberPrefix";
import { formatOrderNumber } from "@shared/utils/formatOrderNumber";

type PrintJob = {
  id: string;
  type: string;
  status: "PENDING" | "PRINTING" | "COMPLETED" | "FAILED";
  isStuck: boolean;
  createdAt: string;
  printedAt: string | null;
  errorMessage: string | null;
  order: {
    orderNumber: number;
  } | null;
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PrintStatusDropdown() {
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const [isOpen, setIsOpen] = useState(false);
  const [issueCount, setIssueCount] = useState(0);
  const [recentJobs, setRecentJobs] = useState<PrintJob[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/print-jobs/stats");
      if (data?.success) {
        setIssueCount(data.totalIssues || 0);
      }
    } catch (err) {
      console.error("Failed to fetch print stats:", err);
    }
  }, [apiClient]);

  const fetchRecentJobs = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/print-jobs/recent?limit=10");
      if (data?.success) {
        setRecentJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent print jobs:", err);
    }
  }, [apiClient]);

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const { data, status } = await apiClient.post(`/api/print-jobs/${jobId}/retry`);
      if (status < 400 && data?.success) {
        await Promise.all([fetchStats(), fetchRecentJobs()]);
      }
    } catch (err) {
      console.error("Failed to retry print job:", err);
    } finally {
      setRetrying(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    setDeleting(jobId);
    try {
      const { data, status } = await apiClient.delete(`/api/print-jobs/${jobId}`);
      if (status < 400 && data?.success) {
        await Promise.all([fetchStats(), fetchRecentJobs()]);
      }
    } catch (err) {
      console.error("Failed to delete print job:", err);
    } finally {
      setDeleting(null);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchStats();
    // Poll every 15 seconds for stats
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Fetch recent jobs when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchRecentJobs();
    }
  }, [isOpen, fetchRecentJobs]);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const getStatusColor = (job: PrintJob) => {
    if (job.status === "FAILED") return "text-red-500";
    if (job.status === "PENDING" && job.isStuck) return "text-amber-500";
    if (job.status === "PENDING" || job.status === "PRINTING") return "text-amber-400";
    return "text-green-500";
  };

  const getStatusLabel = (job: PrintJob) => {
    if (job.status === "FAILED") return "Failed";
    if (job.status === "PENDING" && job.isStuck) return "Stuck";
    if (job.status === "PENDING") return "Pending";
    if (job.status === "PRINTING") return "Printing";
    return "Completed";
  };

  const needsAttention = (job: PrintJob) => {
    return job.status === "FAILED" || (job.status === "PENDING" && job.isStuck);
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
        title="Print Status"
      >
        {issueCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {issueCount > 99 ? "99+" : issueCount}
          </span>
        )}
        {/* Printer Icon */}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7 3C6.44772 3 6 3.44772 6 4V8H5C3.34315 8 2 9.34315 2 11V16C2 17.6569 3.34315 19 5 19H6V20C6 20.5523 6.44772 21 7 21H17C17.5523 21 18 20.5523 18 20V19H19C20.6569 19 22 17.6569 22 16V11C22 9.34315 20.6569 8 19 8H18V4C18 3.44772 17.5523 3 17 3H7ZM16 8V5H8V8H16ZM6 17H5C4.44772 17 4 16.5523 4 16V11C4 10.4477 4.44772 10 5 10H19C19.5523 10 20 10.4477 20 11V16C20 16.5523 19.5523 17 19 17H18V14C18 13.4477 17.5523 13 17 13H7C6.44772 13 6 13.4477 6 14V17ZM8 15V19H16V15H8ZM18 12C18 12.5523 18.4477 13 19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[200px] mt-[17px] flex h-auto max-h-[480px] w-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[340px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Print Status
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {recentJobs.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No recent print jobs
            </div>
          ) : (
            <div className="space-y-1">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center gap-3 rounded-lg p-2.5 ${
                    needsAttention(job)
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {/* Status indicator */}
                  <span className={`text-xl ${getStatusColor(job)}`}>●</span>

                  {/* Job info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-800 dark:text-white">
                        {job.order ? `#${formatOrderNumber(job.order.orderNumber, orderNumberPrefix)}` : "Unknown"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(job.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {job.type.replace("_", " ")}
                      </span>
                      <span className={`text-xs font-medium ${getStatusColor(job)}`}>
                        {getStatusLabel(job)}
                      </span>
                    </div>
                    {job.errorMessage && (
                      <div className="text-xs text-red-500 truncate mt-0.5">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {needsAttention(job) && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={retrying === job.id}
                        className="px-2 py-1 text-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:opacity-50"
                      >
                        {retrying === job.id ? "..." : "Retry"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === job.id ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {issueCount > 0 && (
          <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center text-sm text-amber-600 dark:text-amber-400">
              {issueCount} job{issueCount !== 1 ? "s" : ""} need{issueCount === 1 ? "s" : ""} attention
            </div>
          </div>
        )}
      </Dropdown>
    </div>
  );
}
