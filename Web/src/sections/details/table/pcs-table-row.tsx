import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { ReactSVG } from 'react-svg';
// ----------------------------------------------------------------------

export type ModePcsProps = {
  mode_pcs_id: string;
  timestamp: string;
  serial_number: string;
  operator1: number;
  operator2: number;
  primary_pcs: number;
  pcs: number;
  result: string;
};

type ModePcsTableRowProps = {
  row: ModePcsProps;
  selected: boolean;
};

export function PcsTableRow({ row, selected }: ModePcsTableRowProps) {
  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        <TableCell component="th" scope="row">
          <Box gap={1} display="flex" alignItems="center">
            <ReactSVG
              src="/assets/icons/iconify/overtime.svg"
              style={{ width: '40px', height: '40px' }}
            />
            {fDateTime(row.timestamp)}
          </Box>
        </TableCell>

        <TableCell>{row.serial_number}</TableCell>

        <TableCell>{row.operator1}</TableCell>
        <TableCell>{row.operator2}</TableCell>
        <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }} >{row.primary_pcs} PCS</TableCell>
        <TableCell sx={{ color: (row.result === 'FAIL' && 'error.main') || 'success.main', fontWeight: 'bold' }} >{row.pcs} PCS</TableCell>

        <TableCell align="center">
          <Label color={(row.result === 'FAIL' && 'error') || 'success'}>{row.result}</Label>
        </TableCell>
      </TableRow>
    </>
  );
}
