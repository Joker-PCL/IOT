import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { MeterDateRangeType } from '../../api/api';

export type TogglePeriodTimeProps = {
  dateRange: MeterDateRangeType;
  onPeriodTimeChange: (newAlignment: MeterDateRangeType) => void;
};

export function TogglePeriodTime({
  dateRange,
  onPeriodTimeChange,
}: {
  dateRange: MeterDateRangeType;
  onPeriodTimeChange: (newAlignment: MeterDateRangeType) => void;
}) {
  const handleChange = (event: React.MouseEvent<HTMLElement>, newValue: MeterDateRangeType) => {
    if (newValue !== null) {
      onPeriodTimeChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup value={dateRange} exclusive onChange={handleChange} sx={{ px: 1.5, height: '35px' }}>
      <ToggleButton value="week">สัปดาห์</ToggleButton>
      <ToggleButton value="month">เดือน</ToggleButton>
      <ToggleButton value="year">ปี</ToggleButton>
    </ToggleButtonGroup>
  );
}
