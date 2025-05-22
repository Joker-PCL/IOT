import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';

import { useTheme, alpha as hexAlpha } from '@mui/material/styles';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  unit?: string;
  height: number;
  type: 'bar' | 'line' | 'area';
  chart: {
    colors?: string[];
    categories?: string[];
    series: {
      name: string;
      data: number[];
    }[];
    options?: ChartOptions;
  };
};

export function AnalyticsVisits({ title, subheader, height, type, unit, chart, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.dark, hexAlpha(theme.palette.primary.light, 0.64)];

  const lineChartOptions = useChart({
    colors: chartColors,
    xaxis: {
      categories: chart.categories,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => value.toFixed(2), // กำหนดทศนิยม 2 ตำแหน่งสำหรับแกน Y
      },
    },
    legend: {
      show: true,
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy HH:mm',
      },
      y: {
        formatter: (value: number) => `${value.toFixed(2)} ${unit}`,
      },
    },
    ...chart.options,
  });

  const barChartOptions = useChart({
    colors: chartColors,
    xaxis: {
      categories: chart.categories,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => value.toFixed(2), // กำหนดทศนิยม 2 ตำแหน่งสำหรับแกน Y
      },
    },
    legend: {
      show: true,
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy HH:mm',
      },
      y: {
        formatter: (value: number) => `${value.toFixed(2)} ${unit}`,
      },
    },
    ...chart.options,
  });

  const areaChartOptions = useChart({
    colors: chartColors,
    xaxis: {
      categories: chart.categories,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => value.toFixed(2), // กำหนดทศนิยม 2 ตำแหน่งสำหรับแกน Y
      },
    },
    legend: {
      show: true,
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy HH:mm',
      },
      y: {
        formatter: (value: number) => `${value.toFixed(2)} ${unit}`,
      },
    },

    chart: {
      animations: {
        enabled: false,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />
      <Chart
        type={type}
        series={chart.series}
        options={type === 'line' ? lineChartOptions : type === 'bar' ? barChartOptions : type === 'area' ? areaChartOptions : {}}
        {...other}
        height={height}
      />
    </Card>
  );
}
