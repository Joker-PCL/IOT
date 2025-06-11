import { useState, useEffect, useRef } from 'react';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { saveAs } from 'file-saver';
import { jsPDF as JSPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Scrollbar } from 'src/components/scrollbar';
import { Loading } from '../../../components/loading/loading';
import { EnergyDataProps } from '../../../api/energy';
import { convertEnergyUnit } from '../utils';

export function EnergyUsageView({ post }: { post: EnergyDataProps[] }) {
  const [isLoading, setIsLoading] = useState(true);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [allDays, setAllDays] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post || post.length === 0) return;

    const daysSet = new Set<string>();
    post.forEach((meter) => {
      meter?.meter_data?.data.forEach((d: any) => daysSet.add(d.day));
    });
    const days = Array.from(daysSet).sort((a, b) => Number(a.split('/')[0]) - Number(b.split('/')[0]));
    setAllDays(days);

    const rows = days.map((day) => {
      const row: any = { day };
      post.forEach((meter, idx) => {
        const found = meter?.meter_data?.data.find((d: any) => d.day === day);
        row[`currentValue_${idx}`] = convertEnergyUnit(found?.currentValue, meter.meter_unit, 'kwh')?.toLocaleString() ?? null;
        row[`difference_${idx}`] = convertEnergyUnit(found?.difference, meter.meter_unit, 'kwh')?.toLocaleString() ?? null;
      });
      return row;
    });
    setTableRows(rows);
    setIsLoading(false);
  }, [post]);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const exportToPDF = () => {
    const doc = new JSPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Add Thai font (you need to have the font file)
    // For proper Thai support, you should add a Thai font like 'Sarabun'
    // doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('รายงานการใช้พลังงาน (หน่วย kWh)', 148, 10, { align: 'center' });

    // Prepare data for the table
    const headers = ['วันที่'];
    post.forEach((meter) => {
      headers.push(meter.meter_position, 'จำนวนหน่วย');
    });

    const data = tableRows.map((row) => {
      const rowData = [row.day];
      post.forEach((_, idx) => {
        rowData.push(row[`currentValue_${idx}`] || '-', row[`difference_${idx}`] || '-');
      });
      return rowData;
    });

    // Add the table using autoTable
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 20 },
    });

    // Save the PDF
    doc.save('energy_usage_report.pdf');
    handleMenuClose();
  };

  const exportToCSV = () => {
    const headers = ['วันที่'];
    post.forEach((meter) => {
      headers.push(`${meter.meter_position} (เลขมิเตอร์)`, `${meter.meter_position} (จำนวนหน่วย)`);
    });

    const data = tableRows.map((row) => {
      const rowData = [row.day];
      post.forEach((_, idx) => {
        rowData.push(row[`currentValue_${idx}`] || '-', row[`difference_${idx}`] || '-');
      });
      return rowData;
    });

    const csvContent = [headers, ...data].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'energy_usage_report.csv');
    handleMenuClose();
  };

  const handlePrint = () => {
    if (tableRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head>
            <title>รายงานการใช้พลังงาน</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: 'Sarabun', sans-serif; margin: 5rem; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 4px; text-align: center; font-size: 10pt; }
              th { background-color:rgb(53, 54, 54); color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            ${tableRef.current.innerHTML}
          </body>
        </html>
      `);
        printWindow.document.close();
        // printWindow.focus();
        printWindow.print();
      }
    }
  };

  if (isLoading) {
    return <Loading isShowing={isLoading} />;
  }

  return (
    <Card>
      <div style={{ padding: '16px', textAlign: 'right' }}>
        <Button variant="contained" color="primary" onClick={handleMenuClick} style={{ marginBottom: '16px' }}>
          Export Data
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={exportToPDF}>Export as PDF</MenuItem>
          <MenuItem onClick={exportToCSV}>Export as CSV</MenuItem>
          <MenuItem
            onClick={() => {
              handlePrint();
              handleMenuClose();
            }}
          >
            Print
          </MenuItem>
        </Menu>
      </div>

      <div ref={tableRef}>
        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" rowSpan={2}>
                    วันที่
                  </TableCell>
                  {post.map((meter, idx) => (
                    <TableCell key={meter.energy_meter_id} align="center" colSpan={2}>
                      {meter.meter_position}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {post.map((meter, idx) => (
                    <>
                      <TableCell align="center" key={`cv${idx}`}>
                        เลขมิเตอร์
                      </TableCell>
                      <TableCell align="center" key={`diff${idx}`}>
                        จำนวนหน่วย
                      </TableCell>
                    </>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell align="center">{row.day}</TableCell>
                    {post.map((meter, idx) => (
                      <>
                        <TableCell align="center" key={`cv${i}-${idx}`}>
                          {row[`currentValue_${idx}`] ? row[`currentValue_${idx}`] : '-'}
                        </TableCell>
                        <TableCell align="center" key={`diff${i}-${idx}`}>
                          {row[`difference_${idx}`] ? row[`difference_${idx}`] : '-'}
                        </TableCell>
                      </>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </div>
    </Card>
  );
}
