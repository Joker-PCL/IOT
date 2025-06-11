import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Tabs, Tab } from '@mui/material';

import Swal from 'sweetalert2';
import { Loading } from '../../../components/loading/loading';
import { AnalyticsVisits } from '../analytics-visits';
import { MetersListsApi, MeterDataApi, EnergyDataProps, MeterDateRangeType } from '../../../api/energy';

import { EnergyMeterItem } from '../meter-item';
import { convertEnergyUnit } from '../utils';
import { EnergyUsageView } from '../energy-table-view';

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

export function EnergyView() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadData, setIsLoadData] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [energyData, setEnergyData] = useState<EnergyDataProps[]>([]);
  const [dataChart, setDataChart] = useState<DataChartProps>();
  const [dateRange, setDateRange] = useState<MeterDateRangeType>('week');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const type = tabIndex === 0 ? 'electricity' : tabIndex === 1 ? 'water' : 'electricity';
        const meterLists = await MetersListsApi(type);
        const getMeterData = await Promise.all(
          meterLists?.map(async (meter) => {
            const meterData = await MeterDataApi({
              bucket: meter.bucket,
              sensorId: type === 'electricity' ? meter.active_energy_delivered_total : meter.water_usage_unit,
              period: dateRange === "year" ? "monthly" :'daily',
              range: dateRange,
            });

            return {
              ...meter,
              meter_data: meterData,
            };
          }) ?? []
        );

        console.log('Meter Data:', getMeterData);
        const startDate = getMeterData[0].meter_data?.meta.startDate ?? ''
        const endDate = getMeterData[0].meter_data?.meta.endDate ?? ''

        const chartData: DataChartProps = {
          title: type === 'electricity' ? '⚡ข้อมูลการใช้ไฟฟ้า' :  type === 'water' ? '💧ข้อมูลการใช้น้ำประปา' : '',
          subheader: `${startDate} - ${endDate}`, // Use date from first item
          categories: getMeterData[0].meter_data?.data.map((item) => item.day) ?? [], // Days from first meter
          series: getMeterData.map((meter) => ({
            name: meter.meter_position, // Include unit in name
            data:
              meter.meter_data?.data.map(
                (item) => (meter.meter_type === 'electricity' ? convertEnergyUnit(item.difference, meter.meter_unit, 'kwh') : item.difference) ?? 0
              ) ?? [], // Handle null values
          })),
        };

        console.log('Chart Data:', chartData);

        setEnergyData(getMeterData);
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
        <Tab label="มิเตอร์ไฟฟ้า ⚡" />
        <Tab label="มิเตอร์น้ำประปา 💧" />
        <Tab label="ตารางข้อมูลการใช้พลังงาน 📈" />
      </Tabs>

      {/* Tab Panel: มิเตอร์ไฟฟ้า */}
      {tabIndex === 0 && (
        <Box>
          {/* Group 1: แนวโน้มการใช้ไฟฟ้า */}
          <Grid container spacing={3} sx={{ mb: 4, minHeight: 350 }}>
            <Grid item xs={12}>
              <AnalyticsVisits
                type="bar"
                title={dataChart?.title}
                subheader={dataChart?.subheader || "ไม่มีข้อมูลในช่วงนี้"}
                unit="kWh"
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
          {/* Group 1: รายการมิเตอร์ไฟฟ้า */}
          {isLoadData ? (
            <></>
          ) : (
            <Grid container spacing={3} sx={{ mb: 4, minHeight: 135 }}>
              {energyData.map((data, index) => (
                <Grid key={data.energy_meter_id + index} item xs={12} md={6} xl={4}>
                  <EnergyMeterItem
                    post={{
                      title: data.meter_position,
                      timestamp: data.meter_data?.meta.lastDataDate || '--/--/----, --:--:--',
                      value: convertEnergyUnit(data.meter_data?.meta.lastData, data.meter_unit, 'kwh')?.toLocaleString() || '----',
                    }}
                    type="electricity"
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab Panel: มิเตอร์น้ำประปา */}
      {tabIndex === 1 && (
        <Box>
          {/* Group 2: แนวโน้มการใช้น้ำประปา */}
          <Grid container spacing={3} sx={{ mb: 4, minHeight: 350 }}>
            <Grid item xs={12}>
              <AnalyticsVisits
                type="bar"
                title={dataChart?.title}
                subheader={dataChart?.subheader || "ไม่มีข้อมูลในช่วงนี้"}
                unit="m³"
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
          {isLoadData ? (
            <></>
          ) : (
            <Grid container spacing={3} sx={{ mb: 4, minHeight: 135 }}>
              {energyData.map((data, index) => (
                <Grid key={data.energy_meter_id + index} item xs={12} md={6} xl={4}>
                  <EnergyMeterItem
                    post={{
                      title: data.meter_position,
                      timestamp: data.meter_data?.meta.lastDataDate || '--/--/----, --:--:--',
                      value: data.meter_data?.meta.lastData ? data.meter_data?.meta.lastData?.toLocaleString() : '----',
                    }}
                    type="water"
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab Panel: ตารางการใช้พลังงาน */}
      {tabIndex === 2 && <EnergyUsageView post={energyData} toggle={{dateRange, onPeriodTimeChange: setDateRange}} />}
    </Box>
  );
}
