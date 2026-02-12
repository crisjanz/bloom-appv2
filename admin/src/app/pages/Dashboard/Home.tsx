import PageMeta from "@shared/ui/common/PageMeta";
import { useDashboardMetrics, useRevenueTrend } from "@shared/hooks/useDashboard";
import MetricCard from "@app/components/dashboard/MetricCard";
import RevenueTrendChart from "@app/components/dashboard/RevenueTrendChart";
import RecentPrintsWidget from "@app/components/dashboard/RecentPrintsWidget";
import { formatCurrency } from "@shared/utils/currency";
import { GridIcon } from "@shared/assets/icons";

export default function DashboardHome() {
  const { metrics, loading, error } = useDashboardMetrics();
  const { data: revenueTrend, loading: trendLoading } = useRevenueTrend(7);

  if (loading) {
    return (
      <>
        <PageMeta
          title="Bloom Admin Dashboard"
          description="Real-time operational metrics for Bloom"
        />
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (error || !metrics) {
    return (
      <>
        <PageMeta
          title="Bloom Admin Dashboard"
          description="Real-time operational metrics for Bloom"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
          {error || "Failed to load dashboard"}
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Bloom Admin Dashboard"
        description="Real-time operational metrics for Bloom"
      />
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <button
            onClick={() => window.open('/pos/fullscreen', '_blank', 'noopener')}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <GridIcon className="h-4 w-4" />
            Open POS Terminal
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Today's Revenue"
            value={formatCurrency(metrics.todayRevenue.amount)}
            change={metrics.todayRevenue.percentChange}
            trend={metrics.todayRevenue.percentChange >= 0 ? "up" : "down"}
            subtitle="vs yesterday"
          />

          <MetricCard
            title="Orders Pending"
            value={metrics.ordersPending.count}
            subtitle={
              metrics.ordersPending.overdue > 0
                ? `${metrics.ordersPending.overdue} overdue`
                : "On track"
            }
          />

          <MetricCard
            title="Deliveries Today"
            value={metrics.deliveriesToday.total}
            subtitle={`${metrics.deliveriesToday.byStatus.DELIVERED} completed`}
          />

          <MetricCard
            title="New Customers"
            value={metrics.newCustomers.thisWeek}
            change={metrics.newCustomers.percentChange}
            trend={metrics.newCustomers.percentChange >= 0 ? "up" : "down"}
            subtitle="This week"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {!trendLoading && revenueTrend.length > 0 && (
            <div className="lg:col-span-2">
              <RevenueTrendChart data={revenueTrend} />
            </div>
          )}
          <div className="lg:col-span-1">
            <RecentPrintsWidget />
          </div>
        </div>
      </div>
    </>
  );
}
