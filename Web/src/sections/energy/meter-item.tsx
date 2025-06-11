import { useState, useEffect } from 'react';
import type { CardProps } from '@mui/material/Card';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { fDateTime, fDateTimeToLocal, secToHMS, timeDiff, fTimestamp } from 'src/utils/format-time';
import Tooltip from '@mui/material/Tooltip';

import IconButton from '@mui/material/IconButton';
import { ReactSVG } from 'react-svg';

// ----------------------------------------------------------------------

type MeterType = 'electricity' | 'water';

export type EnergyMeterItemProps = {
  title: string;
  timestamp: string;
  value: string;
};

export function EnergyMeterItem({ sx, post, unit, type, ...other }: CardProps & { post: EnergyMeterItemProps; unit?: string; type: MeterType }) {
  const _unit = unit || (type === 'electricity' ? 'kWh' : 'm³');
  const _hbgcolor = unit || (type === 'electricity' ? '#FBBE88' : '#91CCF9');
  const _bgcolor = unit || (type === 'electricity' ? '#FDDCC0' : '#CAE6FC');
  const _color = unit || (type === 'electricity' ? '#FF7400' : '#0085ed');

  return (
    <Card sx={sx} {...other}>
      <Card sx={{ height: '100%', bgcolor: _bgcolor }}>
        <Box columnGap={3} px={3} pt={1} pb={0.5} bgcolor={_hbgcolor} display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" color="#5C5C5C">
              {type === 'electricity' ? '⚡' : '💧'} {post.title}
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
        <CardContent sx={{ pt: 1 }}>
          <Box gap={0.1} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h3" pl={3} color={_color}>
              {post.value || '------'} {unit || _unit}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Card>
  );
}
