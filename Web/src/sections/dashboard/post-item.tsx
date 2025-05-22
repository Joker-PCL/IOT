import { useState, useEffect } from 'react';
import type { CardProps } from '@mui/material/Card';
import { useNavigate } from 'react-router-dom';

import Swal from 'sweetalert2';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';

import { fDateTime } from 'src/utils/format-time';

import { SvgColor } from 'src/components/svg-color';
import { MachineDataProps, statusColors, statusMachine } from '../performance/view/performance-view';

// ----------------------------------------------------------------------
export type DashboardProps = {
  machine_id: string;
  alarm_box_sn_1: string;
  alarm_box_sn_2: string;
  device_status: string;
  machine_name_th: string;
  machine_name_en: string;
  machine_sn: string;
  machine_image: string;
  group_name: string;
  group_image: string;
  connection: string | null;
  production_id: number;
  lot_number: string;
  product_name: string;
  product_type: string;
  batch_size: number;
  pieces_per_box: number;
  pieces_per_pack: number;
  pieces_per_cut: number;
  cut_per_minute: number;
  start_product: string;
  finish_product: string;
  mode_gram_count: number;
  mode_pcs_count: number;
  liveData: MachineDataProps;
};

export function PostItem({ sx, post, liveData, ...other }: CardProps & { post: DashboardProps; liveData?: MachineDataProps }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [timeDiff, setTimeDiff] = useState('');

  useEffect(() => {
    const startProduct = new Date(post.start_product);
    const now = new Date();

    const diffMilliseconds = now.getTime() - startProduct.getTime();
    const diffSeconds = Math.floor(diffMilliseconds / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    const remainingHours = diffHours;
    const remainingMinutes = diffMinutes % 60;

    setTimeDiff(`${remainingHours >= 0 ? remainingHours : 'XX'} ชั่วโมง ${remainingMinutes >= 0 ? remainingMinutes : 'XX'} นาที`);

    const getCount = post?.mode_pcs_count > post?.mode_gram_count ? post.mode_pcs_count : post.mode_gram_count;
    const percent = (getCount / post.batch_size) * 100;
    setProgress(percent);
  }, [post, post.liveData]);

  const handleOpenDetail = (_post: DashboardProps) => () => {
    if (_post.lot_number) {
      navigate('/details', {
        state: _post,
      });
    } else {
      Swal.fire({
        icon: 'question',
        title: `เครื่อง ${_post.machine_name_en}`,
        text: 'ไม่พบข้อมูลการผลิต, ยังไม่มีข้อมูลการผลิตในวันนี้!',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '+ เพิ่มข้อมูล',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/production/form', {
            state: {
              row: _post,
            },
          });
        }
      });
    }
  };

  const handleOpenMachineSettingForm = (_post: DashboardProps) => () => {
    navigate('/machine-setting/form', {
      state: {
        post: {
          machine_id: _post.machine_id,
          alarm_box_sn_1: _post.alarm_box_sn_1,
          alarm_box_sn_2: _post.alarm_box_sn_2,
          machine_name_en: _post.machine_name_en,
          machine_sn: _post.machine_sn,
          machine_image: _post.machine_image,
          group_name: _post.group_name,
        },
      },
    });
  };

  const handleOpenPerformance = (_post: DashboardProps) => () => {
    navigate('/performance', {
      state: _post,
    });
  };

  const renderMachineImg = (
    <Box
      component="img"
      alt={post.machine_name_en}
      src={post.machine_image ? post.machine_image : '/assets/images/machine/default.png'}
      sx={{
        top: 0,
        width: 1,
        height: 1,
        objectFit: 'cover',
        position: 'absolute',
      }}
    />
  );

  const renderShape = (
    <SvgColor
      width={88}
      height={36}
      src="/assets/icons/shape-avatar.svg"
      sx={{
        left: 0,
        zIndex: 9,
        bottom: -16,
        position: 'absolute',
        color: 'background.paper',
      }}
    />
  );

  const renderMachineGroupImg = (
    <Avatar
      alt={post.machine_name_en}
      src={post.group_image ? post.group_image : '/assets/images/machine_group/default.png'}
      sx={{
        left: 24,
        zIndex: 9,
        bottom: -24,
        position: 'absolute',
      }}
    />
  );

  const renderDetail = (
    <>
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: 'darkcyan',
        }}
      >
        {`เลขที่ผลิต ${post.lot_number ? post.lot_number : 'XXXXXX'}`}
      </Typography>
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: 'darkcyan',
        }}
      >
        {`ชื่อยา ${post.product_name ? post.product_name : 'XXXXXX'}`}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{
          mb: 1,
          color: 'grey',
        }}
      >
        {`เริ่มการผลิต ${post.start_product ? fDateTime(post.start_product) : '--/--/----, --:--'}`}
        <br />
        {`จบการผลิต ${post.finish_product ? fDateTime(post.finish_product) : '--/--/----, --:--'}`}
      </Typography>
    </>
  );

  const renderTitle = (
    <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between">
      <Typography
        variant="body1"
        component="div"
        sx={{
          fontSize: '19px',
          color: 'cornflowerblue',
          textDecoration: 'underline',
          fontWeight: '600',
        }}
      >
        {post.machine_name_en}
      </Typography>
      <Box gap={0.1} display="flex" alignItems="center" justifyContent="space-between">
        <SvgColor width={15} height={15} src="/assets/icons/iconify/si-clock-duotone.svg" sx={{ mb: 0.3, mr: 0.3, color: '#40BC14' }} />
        <Typography variant="body2" component="div" sx={{ color: 'text.disabled' }}>
          {timeDiff}
        </Typography>
      </Box>
    </Box>
  );

  const renderDate = (
    <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between">
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: 'text.disabled',
        }}
      >
        {liveData?.timestamp ? (fDateTime(liveData.timestamp) ?? liveData?.timestamp) : '--/--/----, --:--:--'}
      </Typography>
      <Box gap={0.1} display="flex" alignItems="center" justifyContent="start">
        <SvgColor
          width={15}
          height={15}
          src={!liveData?.status ? '/assets/icons/iconify/line-md--downloading-loop.svg' : '/assets/icons/iconify/ic-round-lens.svg'}
          sx={{ mb: 0.1, color: statusColors[liveData?.status ?? 'LOADING'] }}
        />
        <Typography variant="body2" component="div" sx={{ color: 'text.disabled' }}>
          {!liveData?.status ? 'Loading...' : statusMachine[liveData?.status || 'OFFLINE']}
        </Typography>
      </Box>
    </Box>
  );

  const renderProgress = (
    <>
      <Box
        gap={1.5}
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          mt: 1,
          color: 'text.disabled',
        }}
      >
        <Typography variant="body2" sx={{ mr: 0.5 }}>
          การผลิต
        </Typography>
        <Typography variant="body2">
          {post?.mode_pcs_count > post?.mode_gram_count ? post.mode_pcs_count.toLocaleString() : post.mode_gram_count.toLocaleString()}/
          {post.batch_size > 0 ? post.batch_size.toLocaleString() : 'X,XXX'}
        </Typography>
      </Box>

      <Box sx={{ width: '100%' }}>
        <LinearProgress variant="determinate" color="success" sx={{ height: 15, borderRadius: 1 }} value={progress} />
      </Box>
    </>
  );

  const renderInfo = (
    <Box
      gap={1.5}
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        mt: 1,
        mb: 2,
        color: 'text.disabled',
      }}
    >
      <Box
        gap={1.5}
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        sx={{
          width: '100%',
          color: 'text.disabled',
        }}
      >
        {[
          {
            number: post.mode_gram_count,
            unit: 'Gram',
            color: 'primary.main',
            icon: 'skill-icons:unity-light',
          },
          {
            number: post.mode_pcs_count,
            unit: 'Pcs',
            color: 'secondary.main',
            icon: 'material-symbols:scale',
          },
        ].map((info, _index) => (
          <Box key={_index} display="flex">
            <Typography variant="body1" sx={{ mr: 0.5, color: info.color, fontWeight: '500' }}>
              {info.unit}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: '500' }}>
              {info.number.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderMenu = (
    <>
      <Box
        gap={1.5}
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mt: 2,
        }}
      >
        <Box gap={1} display="flex" flexWrap="wrap" alignItems="center">
          <Tooltip title="ตั้งค่าเครื่องจักร">
            <SvgColor
              onClick={handleOpenMachineSettingForm(post)}
              width={30}
              height={30}
              src="/assets/icons/iconify/solar--settings-bold-duotone.svg"
              sx={{ cursor: 'pointer', color: 'text.disabled' }}
            />
          </Tooltip>
          <Tooltip title="ข้อมูลการผลิต">
            <SvgColor
              onClick={handleOpenDetail(post)}
              width={30}
              height={30}
              src="/assets/icons/iconify/fluent--clipboard-text-edit-48-filled.svg"
              sx={{ cursor: 'pointer', mr: 0.5, color: 'text.disabled' }}
            />
          </Tooltip>
          <Tooltip title="ประสิทธิภาพการผลิต">
            <SvgColor
              onClick={handleOpenPerformance(post)}
              width={30}
              height={30}
              src="/assets/icons/navbar/ic-performance.svg"
              sx={{ cursor: 'pointer', mr: 0.5, color: 'text.disabled' }}
            />
          </Tooltip>
        </Box>
        <Box display="flex">
          <Typography variant="body1" sx={{ mr: 0.5, color: 'primary.main', fontWeight: '500' }}>
            SPEED
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: '500', color: '#868686' }}>
            {liveData?.cpm?.toFixed(2) || '0.00'}
          </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <Card sx={sx} {...other}>
      <Box
        sx={(theme) => ({
          position: 'relative',
          pt: 'calc(100% * 3 / 4)',
        })}
      >
        {renderShape}
        {renderMachineGroupImg}
        {renderMachineImg}
      </Box>

      <Box
        sx={(theme) => ({
          p: theme.spacing(5, 3, 2, 3),
        })}
      >
        {renderDetail}
        {renderTitle}
        {renderDate}
        {renderProgress}
        {/* {renderInfo} */}
        {renderMenu}
      </Box>
    </Card>
  );
}
