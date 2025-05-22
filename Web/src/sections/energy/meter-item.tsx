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

export function EnergyMeterItem({ sx, post, unit, type, ...other }: CardProps & { post: EnergyMeterItemProps, unit?:  string, type: MeterType;}) {
  const _unit = unit || (type === 'electricity' ? 'kWh' : 'm³');
  const _bgcolor = unit || (type === 'electricity' ? '#FAF0E7' : '#cee9fe');
  const _color = unit || (type === 'electricity' ? '#FF7400' : '#0085ed');

  return (
    <Card sx={sx} {...other}>
      <Card sx={{ height: '100%', px: 1.5, bgcolor: _bgcolor }}>
        <CardContent>
          <Typography variant="subtitle1" color="textSecondary">
            {type === 'electricity' ? '⚡' : '💧'} {post.title}
          </Typography>
          <Typography variant="caption" component="div" color="text.disabled" pb={1} pl={3}>
            ข้อมูลล่าสุด {post.timestamp || '--/--/----, --:--:--'}
          </Typography>
          <Box gap={0.1} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h3" pl={3} color={_color}>
              {post.value || '------'} {unit || _unit}
            </Typography>

            <Tooltip title="ดูข้อมูลเพิ่มเติม">
              <IconButton>
                <ReactSVG src="/assets/icons/iconify/info.svg" style={{ width: '30px', height: '30px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </Card>
  );
}
