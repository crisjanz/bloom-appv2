import { useState, useEffect, useCallback } from "react";
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

export default function RecentPrintsWidget() {
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/print-jobs/recent?limit=8");
      if (data?.success) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch print jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const { data, status } = await apiClient.post(`/api/print-jobs/${jobId}/retry`);
      if (status < 400 && data?.success) {
        await fetchJobs();
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
        await fetchJobs();
      }
    } catch (err) {
      console.error("Failed to delete print job:", err);
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

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

  const issuesCount = jobs.filter(needsAttention).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Prints
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Prints
          </h3>
          {issuesCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {issuesCount}
            </span>
          )}
        </div>
        <button
          onClick={fetchJobs}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No print jobs yet
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center gap-3 rounded-lg p-2.5 ${
                needsAttention(job)
                  ? "bg-red-50 dark:bg-red-900/20"
                  : "bg-gray-50 dark:bg-gray-800"
              }`}
            >
              {/* Status dot */}
              <span className={`text-lg ${getStatusColor(job)}`}>●</span>

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {job.order ? `Order #${formatOrderNumber(job.order.orderNumber, orderNumberPrefix)}` : "Unknown"}
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
  );
}
