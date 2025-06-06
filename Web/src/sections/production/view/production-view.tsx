import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Pagination from '@mui/material/Pagination'; // เพิ่มการ import Pagination
import Stack from '@mui/material/Stack'; // สำหรับจัด layout ของ Pagination
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Swal from 'sweetalert2';
import TablePagination from '@mui/material/TablePagination';

// import { _data_production } from 'src/_mock_production';
import { DashboardContent } from 'src/layouts/dashboard';

import { SvgColor } from 'src/components/svg-color';
import { Scrollbar } from 'src/components/scrollbar';

import { UserTableRow } from '../table-row';
import { TableNoData } from '../table-no-data';
import { UserTableHead } from '../table-head';
import { UserTableToolbar } from '../table-toolbar';
import { TableEmptyRows } from '../table-empty-rows';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { ProductionsProps } from '../table-row';
import { ProductionApi } from '../../../api/api';
import { Loading } from '../../../components/loading/loading';

// ----------------------------------------------------------------------

export function ProductionView() {
  const navigate = useNavigate();
  const table = useTable();
  const [isLoading, setIsLoading] = useState(true);
  const [onEventsRows, setOnEventsRows] = useState(false);
  const [dataProduction, setDataProduction] = useState([]);

  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const getData = await ProductionApi(); // Wait for the promise to resolve
        setIsLoading(false);
        setDataProduction(getData);
        console.log(getData);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          navigate('/login');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด...',
            text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้!',
            showConfirmButton: false,
          });
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData(); // Call the async function to fetch the data
  }, [onEventsRows, navigate]);

  const handleOpenForm = () => () => {
    navigate('/production/form');
  };

  const dataFiltered: ProductionsProps[] = applyFilter({
    inputData: dataProduction,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
    order: 'asc',
  });

  const notFound = !dataFiltered.length && !!filterName;

  if (isLoading) {
    return <Loading isShowing={isLoading} />;
  }

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          รายการผลิต
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          onClick={handleOpenForm()}
          startIcon={<SvgColor src="/assets/icons/iconify/add.svg" width="20px" height="20px" />}
        >
          เพิ่มรายการ
        </Button>
      </Box>

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 1100 }}>
              <UserTableHead
                order={table.order}
                orderBy={table.orderBy}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                // onSelectAllRows={(checked) =>
                //   table.onSelectAllRows(
                //     checked,
                //     dataProduction.map((data) => data.id)
                //   )
                // }
                headLabel={[
                  { id: 'timestamp', label: 'Timestamp' },
                  { id: 'lot_number', label: 'เลขที่ผลิต' },
                  { id: 'product_names', label: 'รายการผลิต' },
                  { id: 'batch_size', label: 'ขนาดผลิต' },
                  { id: 'machine', label: 'เครื่องจักร' },
                  { id: 'start_product', label: 'วันที่เริ่มการผลิต' },
                  { id: 'finish_product', label: 'วันที่จบการผลิต' },
                  { id: 'note', label: 'Note', align: 'center' },
                  { id: 'info', label: 'ข้อมูล', align: 'center' },
                  { id: 'edit', label: 'แก้ไข', align: 'center' },
                ]}
              />
              <TableBody>
                {dataFiltered.slice(table.page * table.rowsPerPage, table.page * table.rowsPerPage + table.rowsPerPage).map((row) => (
                  <UserTableRow
                    key={row.production_id}
                    row={row}
                    eventsRows={onEventsRows}
                    onEventsRows={setOnEventsRows}
                    selected={table.selected.includes(row.production_id)}
                    onSelectRow={() => table.onSelectRow(row.production_id)}
                  />
                ))}

                <TableEmptyRows height={68} emptyRows={emptyRows(table.page, table.rowsPerPage, dataProduction.length)} />

                {notFound && <TableNoData searchQuery={filterName} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <Grid
          container
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{
            mt: 2,
            pb: 2,
            px: 2.5,
            backgroundColor: '#f9f9f9', // เพิ่มสีพื้นหลัง
            flexWrap: { xs: 'wrap', md: 'nowrap' }, // จัด wrap เมื่อพื้นที่ไม่พอ
          }}
        >
          {/* Pagination */}
          <Grid item xs={12} md="auto">
            <Stack direction="row" justifyContent="center" alignItems="center">
              <Pagination
                count={Math.ceil(dataFiltered.length / table.rowsPerPage)} // คำนวณจำนวนหน้าทั้งหมด
                page={table.page + 1} // Material-UI ใช้ index เริ่มต้นที่ 1
                onChange={(event, value) => table.onChangePage(event, value - 1)} // ปรับ index ให้ตรงกับ state
                color="primary"
                shape="rounded"
                siblingCount={1} // แสดงจำนวนหน้าที่อยู่ข้างๆ
                boundaryCount={1} // แสดงจำนวนหน้าที่อยู่ขอบ
              />
            </Stack>
          </Grid>

          {/* TablePagination */}
          <Grid item xs={12} md="auto">
            <Stack direction="row" justifyContent="center" alignItems="center">
              <TablePagination
                component="div"
                page={table.page}
                count={dataFiltered.length}
                rowsPerPage={table.rowsPerPage}
                onPageChange={table.onChangePage}
                rowsPerPageOptions={[5, 10, 25]}
                onRowsPerPageChange={table.onChangeRowsPerPage}
                // ActionsComponent={()=><></>}
              />
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    if (checked) {
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  }, []);

  const onSelectRow = useCallback(
    (inputValue: string) => {
      const newSelected = selected.includes(inputValue) ? selected.filter((value) => value !== inputValue) : [...selected, inputValue];

      setSelected(newSelected);
    },
    [selected]
  );

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}
