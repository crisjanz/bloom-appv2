import PageMeta from "@shared/ui/common/PageMeta";
import { useDashboardMetrics, useRevenueTrend } from "@shared/hooks/useDashboard";
import MetricCard from "@app/components/dashboard/MetricCard";
import RevenueTrendChart from "@app/components/dashboard/RevenueTrendChart";
import { formatCurrency } from "@shared/utils/currency";

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
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>

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

        {!trendLoading && revenueTrend.length > 0 && (
          <div className="mb-6">
            <RevenueTrendChart data={revenueTrend} />
          </div>
        )}
      </div>
    </>
  );
}
