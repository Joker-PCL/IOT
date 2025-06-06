import { useState, useCallback, useEffect } from 'react';

import Pagination from '@mui/material/Pagination'; // เพิ่มการ import Pagination
import Stack from '@mui/material/Stack'; // สำหรับจัด layout ของ Pagination
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

// import { _data_gram } from 'src/_mock_gram';

import { Scrollbar } from 'src/components/scrollbar';

import { TableNoData } from '../table-no-data';
import { GramTableRow } from '../gram-table-row';
import { UserTableHead } from '../table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../table-toolbar';
import { emptyRows, applyFilterGram, getComparator } from '../utils';

import type { ModeGramProps } from '../gram-table-row';

// ----------------------------------------------------------------------
interface ModeGramViewProps {
  dataGram: ModeGramProps[];
}

export function ModeGramView({ dataGram }: ModeGramViewProps) {
  const table = ModeGramUseTable();
  const [filterName, setFilterName] = useState('');

  const dataFiltered: ModeGramProps[] = applyFilterGram({
    inputData: dataGram,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
    order: 'desc',
  });

  const notFound = !dataFiltered.length && !!filterName;
  return (
    <>
      {dataGram.length <= 0 ? null : (
        <Card>
          <CardHeader title="ข้อมูลการชั่งน้ำหนัก" subheader="(ชั่งแบบ กรัม)" />
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
              <Table sx={{ widthidth: 800, minWidth: 1000 }}>
                <UserTableHead
                  order={table.order}
                  orderBy={table.orderBy}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataGram.map((data) => data.mode_gram_id)
                    )
                  }
                  headLabel={[
                    { id: 'timestamp', label: 'Timestamp' },
                    { id: 'serial_number', label: 'Serial number' },
                    { id: 'operator1', label: 'Oper 1' },
                    { id: 'operator2', label: 'Oper 2' },
                    { id: 'minWeight', label: 'Set Min.' },
                    { id: 'maxWeight', label: 'Set Max.' },
                    { id: 'weight', label: 'Weight' },
                    { id: 'isVerified', label: 'Pass/Fail', align: 'center' },
                  ]}
                />
                <TableBody>
                  {dataFiltered.slice(table.page * table.rowsPerPage, table.page * table.rowsPerPage + table.rowsPerPage).map((row) => (
                    <GramTableRow key={row.mode_gram_id} row={row} selected={table.selected.includes(row.mode_gram_id)} />
                  ))}

                  <TableEmptyRows height={68} emptyRows={emptyRows(table.page, table.rowsPerPage, dataGram.length)} />

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
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  onRowsPerPageChange={table.onChangeRowsPerPage}
                />
              </Stack>
            </Grid>
          </Grid>
        </Card>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

export function ModeGramUseTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'desc';
      setOrder(isAsc ? 'asc' : 'desc');
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
