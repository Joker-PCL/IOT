import type { CardProps } from '@mui/material/Card';

import { Box, Grid, Typography, Card, CardContent } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { SvgColor } from 'src/components/svg-color';

import IconButton from '@mui/material/IconButton';
import { ReactSVG } from 'react-svg';

// ----------------------------------------------------------------------

type MeterType = 'electricity' | 'water';

export type EnergyMeterItemProps = {
  title: string;
  timestamp: string;
  uptime: string;
  downtime: string;
  runtime: string;
};

export function MachineReportItem({ sx, post, unit, type, ...other }: CardProps & { post: EnergyMeterItemProps; unit?: string; type: MeterType }) {
  return (
    <Card sx={sx} {...other}>
      <Card sx={{ height: '100%', bgcolor: '#E2EF9A' }}>
        <Box columnGap={3} mb={2} px={3} pt={1.5} pb={1} bgcolor="#D2EF31" display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" color="#5C5C5C">
              🏭 เครื่อง {post.title}
            </Typography>
            <Typography variant="caption" component="div" color="textSecondary" pb={1} pl={3}>
              ข้อมูล {post.timestamp || '--/--/----, --:--:--'}
            </Typography>
          </Box>
          <Tooltip title="ดูข้อมูลเพิ่มเติม">
            <IconButton>
              <ReactSVG src="/assets/icons/iconify/info.svg" style={{ width: '40px', height: '40px' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <CardContent>
          <Grid container spacing={0.5} px={2}>
            {/* แถวที่ 1 - Uptime & Downtime */}
            <Grid item xs={12} md={6} xl={4}>
              <Typography display="flex" gap={1} variant="h4" color="#01D108">
                <SvgColor src="/assets/icons/iconify/icon-up-two.svg" width="30px" height="30px" />
                {post.uptime !== '0.00' ? post.uptime : '--.--'} {unit || 'ชม.'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6} xl={4}>
              <Typography display="flex" gap={1} variant="h4" color="#E4080A">
                <SvgColor src="/assets/icons/iconify/icon-down-two.svg" width="30px" height="30px" />
                {post.downtime !== '0.00' ? post.downtime : '--.--'} {unit || 'ชม.'}
              </Typography>
            </Grid>

            {/* แถวที่ 2 - Runtime (เต็มความกว้าง) */}
            <Grid item xs={12} md={6} xl={4}>
              <Typography display="flex" gap={1} variant="h4" color="#1875D7">
                <SvgColor src="/assets/icons/iconify/icon-all.svg" width="30px" height="30px" />
                {post.runtime !== '0.00' ? post.runtime : '--.--'} {unit || 'ชม.'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Card>
  );
}
