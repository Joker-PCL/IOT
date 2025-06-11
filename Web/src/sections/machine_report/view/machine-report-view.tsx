import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Tabs, Tab } from '@mui/material';

import Swal from 'sweetalert2';
import { Loading } from '../../../components/loading/loading';
import { AnalyticsVisits } from '../analytics-visits';
import { MachinesApi } from '../../../api/production';
import { MachineReportApi, MachineReportType, MachineReportProps } from '../../../api/machine-report';

import { MachineReportItem } from '../report-item';
import { convertSeconds } from '../utils';
import { MachineReportUsageView } from '../table-view';

// กราฟข้อมูล
interface DataChartProps {
  title: string;
  subheader: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

export function MachineReportView() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadData, setIsLoadData] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [reportData, setReportData] = useState<MachineReportProps[]>([]);
  const [dataChart, setDataChart] = useState<DataChartProps>();
  const [dateRange, setDateRange] = useState<MachineReportType>('weekly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const machineLists = await MachinesApi();
        const getMachineReportData = await Promise.all(
          machineLists?.map(async (machine) => {
            const result = await MachineReportApi({ reportType: dateRange, machineSn: machine.machine_sn });
            return result;
          }) ?? []
        );

        const chartData: DataChartProps = {
          title: '📋 รายงานเครื่องจักร (Running time)',
          subheader: getMachineReportData[0]?.dateRange?.display || '',
          categories: getMachineReportData[0]?.data.map((item) => item.month_name || item.day_name_short || item.day_name) ?? [],
          series: getMachineReportData.map((machine) => ({
            name: machine?.machineNameEn || '',
            data: machine?.data.map((item) => convertSeconds(item.total_start_time)) ?? [],
          })),
        };

        console.log(getMachineReportData);
        setReportData(getMachineReportData);
        setDataChart(chartData);
        setIsLoadData(false);
        setIsLoading(false);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          navigate('/login');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด...',
            text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้!',
            showConfirmButton: false,
          });
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData();
  }, [dateRange, navigate, tabIndex]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setIsLoadData(true);
    setTabIndex(newValue);
  };

  if (isLoading) {
    return <Loading isShowing={isLoading} />;
  }

  return (
    <Box sx={{ p: 3, pt: 1 }}>
      {/* Tabs Menu */}
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable" // ทำให้แท็บเลื่อนได้
        scrollButtons="auto" // แสดงปุ่มเลื่อนเมื่อจำเป็น
        sx={{
          mb: 3,
        }}
      >
        <Tab label="รายงานเครื่องจักร 📋" />
        <Tab label="ตารางรายงานเครื่องจักร 📈" />
      </Tabs>

      {/* Tab Panel: รายงานเครื่องจักร */}
      {tabIndex === 0 && (
        <Box>
          {/* Group 1: แนวโน้ม Running time */}
          <Grid container spacing={3} sx={{ mb: 4, minHeight: 350 }}>
            <Grid item xs={12}>
              <AnalyticsVisits
                type="area"
                title={dataChart?.title}
                subheader={dataChart?.subheader || 'ไม่มีข้อมูลในช่วงนี้'}
                unit="ชั่วโมง"
                dateRange={dateRange}
                onPeriodTimeChange={setDateRange}
                chart={{
                  categories: dataChart?.categories || [],
                  series: dataChart?.series || [],
                }}
                sx={{ px: 0.5, py: 1 }}
                height={325}
              />
            </Grid>
          </Grid>
          {/* Group 1: รายการเครื่องจักร */}
          {isLoadData ? (
            <></>
          ) : (
            <Grid container spacing={4} sx={{ mb: 4, minHeight: 135 }}>
              {reportData.map((report, index) => (
                <Grid key={report.machineSn + index} item xs={12} md={6} xl={6}>
                  <MachineReportItem
                    post={{
                      title: report.machineNameEn,
                      timestamp: report.dateRange.display || '--/--/----, --:--:--',
                      uptime: convertSeconds(report.data.reduce((sum, d) => sum + (d.total_start_time || 0), 0)).toFixed(2) || '----',
                      downtime: convertSeconds(report.data.reduce((sum, d) => sum + (d.total_stop_time || 0), 0)).toFixed(2) || '----',
                      runtime: convertSeconds(report.data.reduce((sum, d) => sum + (d.total_run_time || 0), 0)).toFixed(2) || '----',
                    }}
                    type="electricity"
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab Panel: ตารางการใช้พลังงาน */}
      {tabIndex === 1 && <MachineReportUsageView posts={reportData} toggle={{ dateRange, onPeriodTimeChange: setDateRange }} />}
    </Box>
  );
}
