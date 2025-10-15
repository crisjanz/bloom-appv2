import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { DailySalesPoint } from '@domains/reports/types';

interface SalesTrendChartProps {
  data: DailySalesPoint[];
  loading?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(amount);

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597485]" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No sales data for this period.
      </div>
    );
  }

  const categories = data.map((point) => point.date);
  const salesSeries = data.map((point) => Number((point.amount / 100).toFixed(2)));
  const orderCounts = data.map((point) => point.orders);

  const options: ApexOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif'
    },
    colors: ['#597485', '#8ba3b5'],
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      dashArray: [0, 6]
    },
    fill: {
      type: ['gradient', 'solid'],
      opacity: [0.35, 1],
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
    yaxis: [
      {
        labels: {
          formatter: (val) => formatCurrency(val),
          style: { colors: '#6b7280', fontSize: '12px' }
        },
        title: {
          text: 'Sales (CAD)',
          style: { fontSize: '12px', color: '#6b7280' }
        }
      },
      {
        opposite: true,
        labels: {
          style: { colors: '#6b7280', fontSize: '12px' }
        },
        title: {
          text: 'Orders',
          style: { fontSize: '12px', color: '#6b7280' }
        }
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'yyyy-MM-dd'
      },
      y: [
        {
          formatter: (val) => formatCurrency(val)
        },
        {
          formatter: (val) => `${val} orders`
        }
      ]
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      fontFamily: 'Outfit'
    },
    grid: {
      borderColor: '#f3f4f6'
    }
  };

  const series = [
    {
      name: 'Sales',
      data: salesSeries
    },
    {
      name: 'Orders',
      data: orderCounts,
      type: 'line',
      yAxisIndex: 1
    }
  ];

  return <Chart options={options} series={series} type="area" height={300} />;
};

export default SalesTrendChart;
