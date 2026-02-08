import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { formatCurrency } from '@shared/utils/currency';

interface RevenueTrendChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          7-Day Revenue Trend
        </h3>
        <div className="flex h-60 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          No revenue data available.
        </div>
      </div>
    );
  }

  const categories = data.map((point) =>
    new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const revenueSeries = data.map((point) => point.revenue);

  const options: ApexOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif'
    },
    colors: ['#597485'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.6,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatCurrency(val),
        style: { colors: '#6b7280', fontSize: '12px' }
      }
    },
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(val)
      }
    },
    grid: {
      borderColor: '#f3f4f6'
    },
    markers: {
      size: 4,
      colors: ['#597485'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 6
      }
    }
  };

  const series = [
    {
      name: 'Revenue',
      data: revenueSeries
    }
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        7-Day Revenue Trend
      </h3>
      <Chart options={options} series={series} type="area" height={300} />
    </div>
  );
}
