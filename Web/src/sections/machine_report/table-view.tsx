import { useState, useEffect, useRef, Fragment } from 'react';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';

import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import { Box, Typography } from '@mui/material';

import { Scrollbar } from 'src/components/scrollbar';
import { ReactSVG } from 'react-svg';
import { Loading } from '../../components/loading/loading';
import { MachineReportProps } from '../../api/machine-report';
import { convertSeconds } from './utils';
import { TogglePeriodTime, TogglePeriodTimeProps } from './togle-period-time';

export function MachineReportUsageView({ posts, toggle }: { posts: MachineReportProps[]; toggle: TogglePeriodTimeProps }) {
  const [isLoading, setIsLoading] = useState(true);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subTitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    console.log('post', posts);
    // รวมวันที่ทั้งหมด (unique)
    const daysSet = new Set<string>();
    posts.forEach((post) => {
      post?.data.forEach((d: any) => daysSet.add(d.month_name || d.day_name_short || d.day_name));
    });
    const days = Array.from(daysSet).sort((a, b) => Number(a.split('/')[0]) - Number(b.split('/')[0]));

    // สร้างแถวข้อมูล
    const rows = days.map((day) => {
      const row: any = { day };
      posts.forEach((post, idx) => {
        const found = post?.data.find((d: any) => d.day_name === day || d.month_name === day || d.day_name_short === day);
        row[`start_time_${idx}`] = convertSeconds(found?.total_start_time || 0) ?? null;
        row[`stop_time_${idx}`] = convertSeconds(found?.total_stop_time || 0) ?? null;
        row[`running_time_${idx}`] = convertSeconds(found?.total_run_time || 0) ?? null;
      });
      return row;
    });
    setTableRows(rows);
    setIsLoading(false);
  }, [posts]);

  // พิมพ์รายงาน
  const handlePrint = () => {
    if (tableRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head>
            <title>${titleRef.current?.innerHTML}</title>
            <style>
              @page { size: A4 landscape; margin: 5mm; }
              body { font-family: 'Sarabun', sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 4px; text-align: center; font-size: 10pt; }
              th { background-color:rgb(53, 54, 54); color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f5f5f5;  font-size: 8pt; }
              td {font-size: 8pt; }
            </style>
          </head>
          <body>
            <h3 style="text-align: center;">${titleRef.current?.innerHTML}</h3>
            <p style="text-align: center; font-size: 14px;">${subTitleRef.current?.innerHTML}</p>
            ${tableRef.current.innerHTML}
            <script>
              window.print();
              window.close();
            </script>
          </body>
        </html>
      `);
        printWindow.document.close();
      }
    }
  };

  if (isLoading) {
    return <Loading isShowing={isLoading} />;
  }

  return (
    <Card>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" my={5}>
        <Typography ref={titleRef} variant="h4">
          รายงานเครื่องจักร (ชั่วโมง)
        </Typography>
        <Typography ref={subTitleRef} variant="subtitle2">
          ข้อมูล {posts[0].dateRange.display}
        </Typography>
      </Box>
      <Box
        display="flex"
        sx={{
          flexWrap: { xs: 'wrap', md: 'nowrap' }, // จัด wrap เมื่อพื้นที่ไม่พอ
        }}
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        pb={2}
        px={2}
      >
        <Button variant="contained" onClick={handlePrint} color="primary" sx={{ ml: 1.5, gap: 1 }}>
          <ReactSVG src="/assets/icons/iconify/emojione--printer.svg" style={{ marginRight: 2, width: '30px', height: '30px' }} />
          พิมพ์รายงาน
        </Button>
        <TogglePeriodTime dateRange={toggle.dateRange} onPeriodTimeChange={toggle.onPeriodTimeChange} />
      </Box>
      <Scrollbar>
        <TableContainer
          ref={tableRef}
          sx={{
            position: 'relative',
            maxHeight: '600px', // กำหนดความสูงสูงสุดของตาราง
            overflow: 'auto', // เปิดใช้งานการเลื่อน
          }}
        >
          <Table
            stickyHeader // ตรึงหัวตาราง
            sx={{
              minWidth: 550,
              borderTop: '1px solid #ddd', // เส้นขอบด้านล่างของหัวตาราง
              borderLeft: '1px solid #ddd', // เส้นขอบด้านบนของหัวตาราง
              '& .MuiTableHead-root': {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: '#ffffff', // สีพื้นหลังหัวตาราง
              },
              '& .MuiTableBody-root tr:nth-of-type(even)': {
                backgroundColor: '#f5f5f5', // สีพื้นหลังของแถวที่เป็นคู่
              },
              '& .MuiTableBody-root tr:nth-of-type(odd)': {
                backgroundColor: '#ffffff', // สีพื้นหลังของแถวที่เป็นคี่
              },
              '& .MuiTableBody-root tr:hover': {
                backgroundColor: '#e0e0e0', // สีพื้นหลังเมื่อเลื่อนเมาส์ไปที่แถว
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                padding: '10px', // ระยะห่างภายในเซลล์
                borderBottom: '1px solid #ddd', // เส้นขอบด้านล่างของหัวตาราง
                borderRight: '1px solid #ddd', // เส้นขอบด้านบนของหัวตาราง
                // backgroundColor: 'rgb(157, 165, 165)', // สีพื้นหลังหัวตาราง
                // color: 'white', // สีตัวอักษรหัวตาราง
              },
              '&  .MuiTableBody-root .MuiTableCell-root': {
                padding: '8px', // ระยะห่างภายในเซลล์
                fontSize: '14px', // ขนาดตัวอักษร
                borderRight: '1px solid #ddd', // เส้นขอบด้านบนของหัวตาราง
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2} sx={{minWidth: 100}}>
                  วันที่
                </TableCell>
                {posts.map((post, idx) => (
                  <TableCell key={`en-table-header-a-${idx}`} align="center" colSpan={3}>
                    {post.machineNameEn}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {posts.map((post, idx) => (
                  <Fragment key={`en-table-header-b-${idx}`}>
                    <TableCell align="center" sx={{minWidth: 100}}>เดินเครื่อง</TableCell>
                    <TableCell align="center" sx={{minWidth: 100}}>หยุดเครื่อง</TableCell>
                    <TableCell align="center" sx={{minWidth: 100}}>รวมเวลา</TableCell>
                  </Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row, i) => (
                <TableRow key={`en-table-row-${i}`}>
                  <TableCell align="center">{row.day}</TableCell>
                  {posts.map((post, idx) => (
                    <Fragment key={`en-table-row-${idx}`}>
                      <TableCell align="center">{row[`start_time_${idx}`] > 0 ? row[`start_time_${idx}`].toLocaleString() : '-'}</TableCell>
                      <TableCell align="center">{row[`stop_time_${idx}`] > 0 ? row[`stop_time_${idx}`].toLocaleString() : '-'}</TableCell>
                      <TableCell align="center">{row[`running_time_${idx}`] > 0 ? row[`running_time_${idx}`].toLocaleString() : '-'}</TableCell>
                    </Fragment>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );
}
