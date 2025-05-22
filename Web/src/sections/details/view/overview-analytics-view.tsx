import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import 'dayjs/locale/th';
import dayjs, { Dayjs } from 'dayjs';

import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';

import Swal from 'sweetalert2';

import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { SvgColor } from 'src/components/svg-color';
import { fDateTime } from 'src/utils/format-time-timezone';

import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';
import { ModeGramView } from '../table/view/gram-view';
import { ModePcsView } from '../table/view/pcs-view';
import { Loading } from '../../../components/loading/loading';

import { DetailApi } from '../../../api/api';
import type { ModeGramProps } from '../table/gram-table-row';
import type { ModePcsProps } from '../table/pcs-table-row';
import type { DashboardProps } from '../../dashboard/post-item';
import type { ProductionsProps } from '../../production/table-row';

interface SummaryChartProps {
  date: string;
  fail_count: number;
  pass_count: number;
}

interface ModeGramDataProps {
  data: ModeGramProps[];
  pass_count: number;
  fail_count: number;
  average_per_minute: number;
  pass_percentage: number;
  fail_percentage: number;
  summary_days: SummaryChartProps[];
}

interface ModePcsDataProps {
  data: ModePcsProps[];
  pass_count: number;
  fail_count: number;
  average_per_minute: number;
  pass_percentage: number;
  fail_percentage: number;
  summary_days: SummaryChartProps[];
}

interface GetData {
  production: ProductionsProps;
  modeGramData: ModeGramDataProps;
  modePcsData: ModePcsDataProps;
}

interface FinishProductionTimeProps {
  hours: number;
  date: dayjs.Dayjs;
}

export function ProcuctionDetailsView() {
  const location = useLocation();
  const router = useRouter();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<GetData | null>(null);
  const [categoriesChart, setCategoriesChart] = useState<string[]>([]);
  const [gramDataChart, setGramDataChart] = useState<number[]>([]);
  const [pcsDataChart, setPcsDataChart] = useState<number[]>([]);
  const [finishProductionTime, setFinishProductionTime] = useState<FinishProductionTimeProps>();

  const post: DashboardProps = location.state || ({} as DashboardProps);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const getData: GetData = await DetailApi(post.production_id);

        setIsLoading(false);
        setData(getData);
        console.log(getData);

        const { batch_size, pieces_per_box, pieces_per_pack, pieces_per_cut, cut_per_minute, start_product } = getData.production;

        const productionTimeInHours = Math.ceil(
          (batch_size * pieces_per_box * pieces_per_pack) / (pieces_per_cut * pieces_per_pack) / cut_per_minute / 60
        );

        const startDate = dayjs(start_product);
        const finishDate = startDate.add(productionTimeInHours, 'hour');
        setFinishProductionTime({
          hours: productionTimeInHours,
          date: finishDate,
        });

        // สร้าง categories จาก date ที่ไม่ซ้ำกัน
        const uniqueDates = [
          ...new Set([
            ...getData.modeGramData.summary_days.map((item) => item.date), // กำจัดค่าที่เป็น null
            ...getData.modePcsData.summary_days.map((item) => item.date), // กำจัดค่าที่เป็น null
          ]),
        ];

        const categories = uniqueDates.sort(); // เรียงวันที่ให้ถูกต้อง

        // สร้าง gramDataChart และ pcsDataChart โดยใช้ pass_count
        const _gramDataChart = categories.map((date) => {
          const gramEntry = getData.modeGramData.summary_days.find((item) => item.date === date);
          return gramEntry ? gramEntry.pass_count : 0;
        });

        const _pcsDataChart = categories.map((date) => {
          const pcsEntry = getData.modePcsData.summary_days.find((item) => item.date === date);
          return pcsEntry ? pcsEntry.pass_count : 0;
        });

        setCategoriesChart(categories);
        setGramDataChart(_gramDataChart);
        setPcsDataChart(_pcsDataChart);
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
  }, [navigate, post.production_id]);

  return (
    <>
      <Loading isShowing={isLoading} />
      {data && (
        <DashboardContent maxWidth="xl">
          <Card
            sx={{
              mb: { xs: 3, md: 5 },
              p: 3,
              backgroundColor: 'common.white',
            }}
          >
            <Typography variant="h4">เครื่อง {data.production.machine_name_en}</Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                color: 'gray',
              }}
            >
              {`เลขที่ผลิต ${data.production.lot_number ? data.production.lot_number : 'XXXXXX'}`}
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                color: 'gray',
              }}
            >
              {`ชื่อยา ${data.production.product_name ? data.production.product_name : 'XXXXXX'}`}
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                color: 'grey',
              }}
            >
              {`ขนาดการผลิต ${data.production.batch_size ? data.production.batch_size.toLocaleString() : 'XXXXXX'}`}
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                color: 'grey',
              }}
            >
              {`วันที่เริ่มการผลิต ${data.production.start_product ? fDateTime(data.production.start_product) : '--/--/----, --:--'}`}
              <br />
              {`วันที่จบการผลิต ${data.production.finish_product ? fDateTime(data.production.finish_product) : '--/--/----, --:--'}`}
            </Typography>

            {!finishProductionTime?.hours ? (
              ''
            ) : (
              <Typography
                variant="body2"
                component="div"
                sx={{
                  color: 'grey',
                }}
              >
                {`สูตรคำนวน 
                  ((${data?.production.batch_size || '--'} x 
                    ${data?.production.pieces_per_box || '--'} x 
                    ${data?.production.pieces_per_pack || '--'}) ÷ 
                      (${data?.production.pieces_per_pack || '--'} x 
                      ${data?.production.pieces_per_cut || '--'})) ÷ 
                      ${data?.production.cut_per_minute || '--'} ÷ 60`}
                <br />
                {`** เวลาที่ใช้ในการผลิตโดยประมาณ ${finishProductionTime?.hours || '--'} ชั่วโมง`}
                <br />
                {`** ประมาณ ${finishProductionTime?.date.format('DD/MM/YYYY, HH:mm') || '--'}`}
              </Typography>
            )}

            <Box display="flex" flexDirection="row" justifyContent="start" gap={1} mt={4}>
              <LoadingButton
                size="large"
                type="button"
                sx={{ width: 40, height: 65, borderRadius: 50 }}
                color="inherit"
                variant="contained"
                onClick={router.back}
              >
                <SvgColor width={30} height={30} src="/assets/icons/iconify/fluent-emoji-high-contrast--back-arrow.svg" color="white" />
              </LoadingButton>

              <LoadingButton
                type="button"
                sx={{ width: 40, height: 65, borderRadius: 50 }}
                color="primary"
                variant="contained"
                onClick={() =>
                  navigate('/production/form', {
                    state: { row: data.production },
                  })
                }
              >
                <SvgColor width={40} height={40} src="/assets/icons/iconify/fluent--clipboard-text-edit-48-filled.svg" color="white" />
              </LoadingButton>
            </Box>
          </Card>

          <Grid container spacing={3}>
            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="จำนวน PASS (กรัม)"
                percent={data.modeGramData?.pass_percentage || 0}
                total={data.modeGramData?.pass_count || 0}
                color="success"
                icon={<img alt="icon" src="./assets/icons/repo/scale1.svg" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="จำนวน FAIL (กรัม)"
                percent={data.modeGramData?.fail_percentage || 0}
                total={data.modeGramData?.fail_count || 0}
                color="error"
                icon={<img alt="icon" src="./assets/icons/repo/scale2.svg" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="จำนวน PASS (PCS)"
                percent={data.modePcsData?.pass_percentage || 0}
                total={data.modePcsData?.pass_count || 0}
                color="success"
                icon={<img alt="icon" src="./assets/icons/repo/scale1.svg" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="จำนวน FAIL (PCS)"
                percent={data.modePcsData?.fail_percentage || 0}
                total={data.modePcsData?.fail_count || 0}
                color="error"
                icon={<img alt="icon" src="./assets/icons/repo/scale2.svg" />}
              />
            </Grid>

            <Grid xs={12} md={12} lg={12}>
              {categoriesChart.length <= 0 ? null : (
                <AnalyticsWebsiteVisits
                  title="กราฟข้อมูลการชั่ง"
                  subheader={`${fDateTime(post.start_product)} ถึง ${fDateTime(post.finish_product)}`}
                  unit="กล่อง"
                  chart={{
                    categories: categoriesChart,
                    series: [
                      { name: 'ชั่งแบบกรัม', data: gramDataChart },
                      { name: 'ชั่งแบบ PCS', data: pcsDataChart },
                    ],
                  }}
                />
              )}
            </Grid>

            <Grid xs={12} md={12} lg={12}>
              <ModeGramView dataGram={data.modeGramData.data} />
            </Grid>

            <Grid xs={12} md={12} lg={12}>
              <ModePcsView dataPcs={data.modePcsData.data} />
            </Grid>
          </Grid>
        </DashboardContent>
      )}
    </>
  );
}
