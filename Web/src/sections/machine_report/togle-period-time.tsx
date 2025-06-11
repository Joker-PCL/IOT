import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { MachineReportType } from '../../api/machine-report';

export type TogglePeriodTimeProps = {
  dateRange: MachineReportType;
  onPeriodTimeChange: (newAlignment: MachineReportType) => void;
};

export function TogglePeriodTime({
  dateRange,
  onPeriodTimeChange,
}: {
  dateRange: MachineReportType;
  onPeriodTimeChange: (newAlignment: MachineReportType) => void;
}) {
  const handleChange = (event: React.MouseEvent<HTMLElement>, newValue: MachineReportType) => {
    if (newValue !== null) {
      onPeriodTimeChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup value={dateRange} exclusive onChange={handleChange} sx={{ px: 1.5, height: '35px' }}>
      <ToggleButton value="weekly">สัปดาห์</ToggleButton>
      <ToggleButton value="monthly">เดือน</ToggleButton>
      <ToggleButton value="yearly">ปี</ToggleButton>
    </ToggleButtonGroup>
  );
}
