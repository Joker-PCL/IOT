import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import CardHeader from '@mui/material/CardHeader';
import { Box, Card } from '@mui/material';

import { useTheme, alpha as hexAlpha } from '@mui/material/styles';
import { Chart, useChart } from 'src/components/chart';
import { TogglePeriodTime, TogglePeriodTimeProps } from './togle-period-time';

// ----------------------------------------------------------------------

type Props = CardProps & TogglePeriodTimeProps & {
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

export function AnalyticsVisits({ title, subheader, height, type, unit, chart, dateRange, onPeriodTimeChange, ...other }: Props) {
  const theme = useTheme();

  // const chartColors = chart.colors ?? [theme.palette.primary.dark, hexAlpha(theme.palette.primary.light, 0.64)];
  const chartColors = chart.colors;

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
        formatter: (value: number) => value?.toLocaleString() || '', // กำหนดทศนิยม 2 ตำแหน่งสำหรับแกน Y
      },
    },
    plotOptions: {
      bar: {
        dataLabels: {
          position: 'top', // ข้อความค่าข้อมูลแสดงด้านบน
          orientation: 'vertical', // ตั้งค่าให้ label แสดงแนวตั้ง
        },
      },
    },
    dataLabels: {
      enabled: true, // เปิดใช้งาน Data Labels
      formatter: (value: number) => (value ? `${value?.toLocaleString()} ${unit}` : ''),
      offsetY: 5, // ปรับตำแหน่งแนวตั้ง (ให้สูงขึ้น)
      offsetX: 2,
      style: {
        fontSize: '10px', // ขนาดตัวอักษร
        colors: ['#999'], // สีของตัวอักษร,
      },
    },
    legend: {
      show: true,
      position: 'bottom', // ตั้งค่าให้ legend อยู่ด้านล่าง
      horizontalAlign: 'center', // จัดตำแหน่ง center, left หรือ right
      floating: false,
      offsetY: 10, // ปรับระยะห่างจากกราฟ
      offsetX: 0,
      itemMargin: {
        horizontal: 5, // ระยะห่างระหว่าง legend items
        vertical: 5,
      },
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
      <Box
        display="flex"
        sx={{
          flexWrap: { xs: 'wrap', md: 'nowrap' }, // จัด wrap เมื่อพื้นที่ไม่พอ
        }}
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        py={2}
      >
        <CardHeader title={title} subheader={subheader} sx={{ pt: 0 }} />
        <TogglePeriodTime dateRange={dateRange} onPeriodTimeChange={onPeriodTimeChange}/>
      </Box>
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
