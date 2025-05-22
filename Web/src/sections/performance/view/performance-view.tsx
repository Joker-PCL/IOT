import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Box, Grid, Typography, Card, CardContent } from '@mui/material';
import { useRouter } from 'src/routes/hooks';
import { fDateTime, fDateTimeToLocal, secToHMS, timeDiff, fTimestamp } from 'src/utils/format-time';

import Swal from 'sweetalert2';

import LoadingButton from '@mui/lab/LoadingButton';
import { SvgColor } from 'src/components/svg-color';
import { Loading } from '../../../components/loading/loading';
import { AnalyticsVisits } from '../analytics-visits';
import { AnalyticsCurrentVisits } from '../analytics-pie-visits';
import { API_URL } from '../../../api/config/link_api';
import { PerformanceApi } from '../../../api/api';

import type { DashboardProps } from '../../dashboard/post-item';

export type MachineStatusType = 'LOADING' | 'OFFLINE' | 'RUNNING' | 'STOP' | 'WARNING';

export const statusColors: Record<MachineStatusType, string> = {
  LOADING: '#A0A0A0',
  OFFLINE: '#A0A0A0',
  RUNNING: '#7DDA58',
  STOP: '#D20103',
  WARNING: '#FE9900',
};

export const statusMachine: Record<MachineStatusType, string> = {
  LOADING: 'Loading...',
  OFFLINE: 'เครื่องไม่ทำงาน',
  RUNNING: 'กำลังทำงาน',
  STOP: 'หยุดทำงาน',
  WARNING: 'เครื่องทำงานผิดปกติ',
};

interface PerformanceDataProps {
  machine_id: string;
  machine_sn: string;
  avg_cycle_time: number;
  avg_cpm: number;
  total_good_path_count: number;
  total_reject_count: number;
  total_start_time: number;
  total_stop_time: number;
  last_connect: string;
}

export type MachineDataProps = {
  machine_sn: string;
  status: MachineStatusType;
  cycle_time: number;
  cpm: number;
  good_path_count: number;
  reject_count: number;
  start_time: number;
  stop_time: number;
  timestamp: string;
};

interface SeriesDataProps {
  name: string;
  data: number[];
}

interface ProductionTrendDataProps {
  categories?: string[];
  series: SeriesDataProps[];
}

interface RpmTrendDataProps {
  categories?: string[];
  data: number[];
}

interface OeeDataProps {
  oee: Number;
  availability: Number;
  performance: Number;
  quality: Number;
}

const socket = io(API_URL.BASE_URL, { transports: ['websocket'] });

export function MachineView() {
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [productionTrendData, setProductionTrendData] = useState<ProductionTrendDataProps | null>(null);
  const [rpmTrendData, setRpmTrendData] = useState<RpmTrendDataProps | null>(null);
  const [liveData, setLiveData] = useState<MachineDataProps | null>(null);
  // const [oee, setOee] = useState<OeeDataProps | null>(null);
  const post: DashboardProps = location.state || ({} as DashboardProps);

  // ดึงข้อมูลจาก Server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const getData: PerformanceDataProps = await PerformanceApi(
          post.machine_sn,
          fDateTimeToLocal(post.start_product) ?? '',
          fDateTimeToLocal(post.finish_product) ?? ''
        ); // Wait for the promise to resolve
        console.log('Get Data: ', getData);
        setIsLoading(false);
        setLiveData({
          machine_sn: '',
          status: 'LOADING',
          cycle_time: Number(getData.avg_cycle_time) || 0,
          cpm: Number(getData.avg_cpm) || 0,
          good_path_count: Number(getData.total_good_path_count) || 0,
          reject_count: Number(getData.total_reject_count) || 0,
          start_time: Number(getData.total_start_time) || 0,
          stop_time: Number(getData.total_stop_time) || 0,
          timestamp: fDateTime(getData.last_connect) || '--/--/----, --:--',
        });
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
  }, [post.machine_sn, post.start_product, post.finish_product, navigate]);

  // MQTT
  useEffect(() => {
    const machine_sn = post.machine_sn; // ระบุ machine_sn ที่ต้องการ subscribe

    // ขอ subscribe หัวข้อ machine_name_en/M02
    socket.emit('subscribe', machine_sn);

    // รับการยืนยันการ subscribe
    socket.on('subscribed', (msg) => {
      console.log('Subscribed to topic:', msg.topic);
    });

    // รับข้อมูล machine_name_en-data
    socket.on('machine-data', (msg: MachineDataProps) => {
      // console.log('Received machine_name_en data:', msg);
      setLiveData((prev) => ({
        machine_sn: msg.machine_sn ?? prev?.machine_sn ?? '',
        status: msg.status ?? prev?.status ?? 'LOADING',
        cycle_time: msg.cycle_time > 0 ? msg.cycle_time : (prev?.cycle_time ?? 0),
        cpm: msg.cpm > 0 ? msg.cpm : (prev?.cpm ?? 0),
        good_path_count: (prev?.good_path_count ?? 0) + msg.good_path_count,
        reject_count: (prev?.reject_count ?? 0) + msg.reject_count,
        start_time: (prev?.start_time ?? 0) + msg.start_time,
        stop_time: (prev?.stop_time ?? 0) + msg.stop_time,
        timestamp: msg.timestamp,
      }));

      setProductionTrendData((prev) => {
        const time = msg.timestamp.split(', ')[1];
        return {
          categories: prev?.categories ? [...prev.categories.slice(-49), time] : [time],
          series: [
            {
              name: 'ชิ้นงานดี',
              data: prev?.series[0]?.data ? [...prev.series[0].data.slice(-49), msg.good_path_count] : [msg.good_path_count],
            },
            {
              name: 'ชิ้นงานเสีย',
              data: prev?.series[1]?.data ? [...prev.series[1].data.slice(-49), msg.reject_count] : [msg.reject_count],
            },
          ],
        };
      });

      setRpmTrendData((prev) => {
        const time = msg.timestamp.split(', ')[1];
        return {
          categories: prev?.categories ? [...prev.categories.slice(-50), time] : [time],
          data: prev?.data ? [...prev.data.slice(-50), msg.cpm] : [msg.cpm],
        };
      });

      if (new Date().getTime() - new Date(post.finish_product).getTime() > 0) {
        socket.emit('unsubscribe', machine_sn); // ยกเลิกการ subscribe
        socket.off('machine_name_en-data'); // ลบ event listener
      }
    });

    // Cleanup: ยกเลิกการ subscribe เมื่อออกจากหน้านี้
    return () => {
      socket.emit('unsubscribe', machine_sn); // ยกเลิกการ subscribe
      socket.off('machine_name_en-data'); // ลบ event listener
    };
  }, [post.machine_sn, post.finish_product]);

  // หากเวลาห่างกันเกิน 5 วินาที ให้ตั้งสถานะเป็น OFFLINE
  useEffect(() => {
    if (!liveData?.timestamp) {
      return undefined; // คืนค่า undefined เพื่อให้ ESLint ไม่แจ้งเตือน
    }

    const timeout = setTimeout(() => {
      console.log('Status: OFFLINE');
      setLiveData((prev) => (prev ? { ...prev, status: 'OFFLINE', cpm: 0 } : null));
    }, 10000);

    return () => clearTimeout(timeout); // clear เมื่อ liveData เปลี่ยน
  }, [liveData?.timestamp]);

  // คำนวน OEE
  const oee = useMemo(() => {
    if (!liveData) return null;
    // คำนวณ Total Time (เป็นวินาที)
    const finish_date = new Date().getTime() < fTimestamp(post.finish_product) ? new Date().getTime() : fTimestamp(post.finish_product);
    const planned_time = (finish_date - fTimestamp(post.start_product)) / 1000;
    const uptime = planned_time ? Number(liveData?.start_time) : 0;
    const downtime = Number(planned_time - uptime);
    const good_path_count = Number(liveData?.good_path_count) * Number(post.pieces_per_cut);
    const total_count = good_path_count + Number(liveData?.reject_count);
    const cycle_time = Number(liveData?.cycle_time) * Number(post.pieces_per_cut);
    // console.log(planned_time)

    // คำนวณ Availability
    const _availability = downtime / planned_time;

    // คำนวณ Performance
    const _performance = (cycle_time * total_count) / downtime;

    // คำนวณ Quality
    const _quality = good_path_count / total_count;

    // คำนวณ OEE
    const _oee = _availability * _performance * _quality;

    // อัปเดตค่า OEE
    return {
      oee: _oee * 100,
      availability: _availability * 100,
      performance: _performance * 100,
      quality: _quality * 100,
      planned_time,
      uptime,
      downtime,
    };
  }, [liveData, post.finish_product, post.start_product, post.pieces_per_cut]);

  if (isLoading) {
    return <Loading isShowing={isLoading} />;
  }

  return (
    <Box sx={{ p: 3, pt: 1 }}>
      {/* Title */}
      <Box display="flex" flexDirection="row" justifyContent="start" alignItems="center" gap={2} mb={5}>
        <LoadingButton
          size="large"
          type="button"
          sx={{ width: 40, height: 40, borderRadius: 1 }}
          color="inherit"
          variant="contained"
          onClick={router.back}
        >
          <SvgColor width={30} height={30} src="/assets/icons/iconify/fluent-emoji-high-contrast--back-arrow.svg" color="white" />
        </LoadingButton>
        <Box display="flex" flexDirection="column" justifyContent="start">
          <Box display="flex" columnGap={1} flexWrap="wrap" flexDirection="row" justifyContent="start">
            <Typography variant="h4">ชื่อเครื่อง: {post.machine_name_en}</Typography>
            <Box gap={0.1} display="flex" alignItems="center" justifyContent="start" mt={0.5}>
              <SvgColor
                width={15}
                height={15}
                src={
                  liveData?.status === 'LOADING' ? '/assets/icons/iconify/line-md--downloading-loop.svg' : '/assets/icons/iconify/ic-round-lens.svg'
                }
                sx={{ mb: 0.1, color: statusColors[liveData?.status ?? 'STOP'] }}
              />
              <Typography variant="body2" component="div" sx={{ color: 'text.disabled' }}>
                {liveData?.status === 'LOADING' ? 'Loading...' : statusMachine[liveData?.status ?? 'STOP']}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" color="textSecondary">
            รหัส: {post.machine_sn ?? 'XXXXX'} • อัพเดทล่าสุด: {liveData?.timestamp ?? '--/--/----, --:--:--'}
          </Typography>
        </Box>
      </Box>

      {/* Group 1: Overall OEE, Current RPM, Production */}
      <Grid container spacing={3} sx={{ mb: 4, minHeight: 135 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" color="textSecondary">
                OEE โดยรวม
              </Typography>
              <Typography variant="h4" color="primary">
                {oee?.oee ? (oee?.oee ?? 0).toFixed(2) : '--'} %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" color="textSecondary">
                ความเร็วปัจจุบัน (CPM)
              </Typography>
              <Typography variant="h4" color="primary">
                {liveData?.status === 'RUNNING' ? liveData?.cpm.toFixed(2) : '--'}/{post.cut_per_minute ?? '--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" color="textSecondary">
                การผลิต ({post.batch_size ?? 'x,xxx'} * {post.pieces_per_box ?? 'x'})
              </Typography>
              <Typography variant="h4" color="primary">
                {((liveData?.good_path_count || 0) * (post.pieces_per_cut || 0)).toLocaleString() || 'X,XXX'}/
                {((post.batch_size || 0) * (post.pieces_per_box || 0)).toLocaleString() ?? 'X,XXX'} {post.product_type}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Group 2: OEE Trend, Production Data */}
      <Grid container spacing={3} sx={{ minHeight: 300 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ height: '100%' }}>
            <AnalyticsCurrentVisits
              title="OEE รวม"
              subheader="Production Data"
              chart={{
                series: [
                  { label: 'ความพร้อมใช้งาน', value: Number(oee?.availability) },
                  { label: 'ประสิทธิภาพ', value: Number(oee?.performance) },
                  { label: 'คุณภาพ', value: Number(oee?.quality) },
                ],
              }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box display="flex" flexDirection="column" justifyContent="start" alignItems="center" gap={2} mb={5}>
            <Card sx={{ width: '100%', p: 3 }}>
              <Typography variant="h5" mb={3}>
                รายละเอียดเครื่อง
              </Typography>
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={6}>
                  <Typography variant="body1" flexGrow={1}>
                    Uptime
                  </Typography>
                  <Typography variant="subtitle1" color="#04B819" flexGrow={1}>
                    {secToHMS(oee?.uptime ?? 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Typography variant="body1" flexGrow={1}>
                    Downtime
                  </Typography>
                  <Typography variant="subtitle1" color="#FE0000" flexGrow={1}>
                    {secToHMS(oee?.downtime ?? 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Typography variant="body1" flexGrow={1}>
                    เวลาผลิต/ชิ้น
                  </Typography>
                  <Typography variant="subtitle1" flexGrow={1}>
                    {liveData?.status === 'RUNNING' ? liveData?.cycle_time?.toFixed(2) : '--.--'} วินาที
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Typography variant="body1" flexGrow={1}>
                    จำนวนชิ้นงานที่ผลิต
                  </Typography>
                  <Typography variant="subtitle1" flexGrow={1}>
                    {liveData?.status === 'RUNNING' ? liveData?.cpm?.toFixed(2) : '--'} ชิ้น/นาที
                  </Typography>
                </Grid>
              </Grid>
            </Card>
            <Card sx={{ width: '100%', p: 3 }}>
              <Typography variant="h5" mb={3}>
                รายละเอียดการผลิต
              </Typography>
              <Box display="flex" flexDirection="column" justifyContent="start" gap={1.5} mb={3}>
                <Typography variant="body1">เลขที่ผลิต {post.lot_number ?? 'XXXXXX'}</Typography>
                <Typography variant="body1">ชื่อยา {post.product_name ?? 'XXXXXX'}</Typography>
                <Typography variant="body1">
                  เริ่มการผลิต {fDateTime(post.start_product, 'DD/MM/YYYY, HH:mm') ?? '--/--/--, --:--'} ถึง{' '}
                  {fDateTime(post.finish_product, 'DD/MM/YYYY, HH:mm') ?? '--/--/--, --:--'}
                </Typography>
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Group 3: RPM Trend, Machine Details */}
      <Grid container spacing={3} sx={{ mb: 4, minHeight: 300 }}>
        <Grid item xs={12} md={6}>
          <AnalyticsVisits
            type="area"
            title="📈 ข้อมูลการผลิต"
            subheader={
              productionTrendData?.series
                ? `${productionTrendData?.series[0].name} ${liveData?.good_path_count ?? '--'} ${productionTrendData?.series[1].name} ${liveData?.reject_count ?? '--'}`
                : 'ไม่มีข้อมูลการผลิตในช่วงนี้'
            }
            unit="ชิ้น"
            chart={{
              colors: ['#009D58', '#FF6384'],
              categories: productionTrendData?.categories ?? [],
              series: productionTrendData?.series ?? [],
            }}
            sx={{ px: 0.5, py: 1 }}
            height={325}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AnalyticsVisits
            type="area"
            title="📈 แนวโน้ม CPM"
            subheader={`ข้อมูลล่าสุด: ${liveData?.cpm?.toFixed(2) ?? '--'} รอบ/นาที`}
            unit="รอบ/นาที"
            chart={{
              categories: rpmTrendData?.categories,
              series: [{ name: 'ความเร็ว', data: rpmTrendData?.data ?? [] }],
            }}
            sx={{ px: 0.5, py: 1 }}
            height={325}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
