import type { TableRowProps } from '@mui/material/TableRow';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type TableNoDataProps = TableRowProps & {
  searchQuery: string;
};

export function TableNoData({ searchQuery, ...other }: TableNoDataProps) {
  return (
    <TableRow {...other}>
      <TableCell align="center" colSpan={8}>
        <Box sx={{ py: 15, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ไม่พบข้อมูล
          </Typography>

          <Typography variant="body2">
            ไม่พบข้อมูลที่ตรงกับ &nbsp;
            <strong>&quot;{searchQuery}&quot;</strong>.
            <br /> ตรวจสอบข้อมูลการค้นหาอีกครั้ง
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}
