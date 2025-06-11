import * as React from 'react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import TableRow from '@mui/material/TableRow';
import MenuList from '@mui/material/MenuList';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import Swal from 'sweetalert2';
import Button from '@mui/material/Button';

import Dialog, { DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import { fDateTime } from 'src/utils/format-time';
import { ReactSVG } from 'react-svg';
import { SvgColor } from 'src/components/svg-color';

import { ProductionDeleteApi } from '../../api/production';
// ----------------------------------------------------------------------

export type ProductionsProps = {
  production_id: string;
  timestamp: string;
  lot_number: string;
  product_name: string;
  product_type: string;
  batch_size: number;
  pieces_per_box: number;
  pieces_per_pack: number;
  pieces_per_cut: number;
  cut_per_minute: number;
  machine_sn: string;
  machine_name_en: string;
  start_product: string;
  finish_product: string;
  notes: string;
};

type UserTableRowProps = {
  row: ProductionsProps;
  selected: boolean;
  eventsRows: boolean;
  onEventsRows: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectRow: () => void;
};

export function UserTableRow({ row, selected, eventsRows, onEventsRows, onSelectRow }: UserTableRowProps) {
  const navigate = useNavigate();
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);
  const [scroll, setScroll] = React.useState<DialogProps['scroll']>('paper');
  const [openDetail, setOpenDetail] = React.useState(false);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleOpenNote = (scrollType: DialogProps['scroll']) => () => {
    setOpenDetail(true);
    setScroll(scrollType);
  };

  const handleCloseNote = () => {
    setOpenDetail(false);
  };

  const handleOpenDetail = (_row: ProductionsProps) => () => {
    const { machine_name_en, start_product, finish_product } = _row; // สมมติว่า _post มีข้อมูลเหล่านี้

    if (machine_name_en && start_product && finish_product) {
      console.log('Open Detail:', _row);
      navigate('/Details', {
        state: _row,
      });
    }
  };

  const handleDeleteProduction = (_row: ProductionsProps) => {
    Swal.fire({
      title: `ยืนยันการลบรายการ`,
      text: `ชื่อยา: ${_row.product_name} เลขที่ผลิต: ${_row.lot_number}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ยืนยันการลบ !',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        const fetchData = async () => {
          try {
            const response = await ProductionDeleteApi(_row); // Wait for the promise to resolve

            onEventsRows(!eventsRows);

            Swal.fire({
              icon: 'success',
              title: 'ดำเนินการเรียบร้อยแล้ว',
              text: 'บันทึกรายการผลิตเรียบร้อยแล้ว',
              showConfirmButton: false,
              timer: 2000,
            });
          } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด...',
              text: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้!, ลองไหม่อีกครั้ง',
              showCancelButton: true,
              cancelButtonText: 'ปิด',
            });
          }
        };

        fetchData(); // Call the async function to fetch the data
      }
    });
  };

  const descriptionElementRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (openDetail) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [openDetail]);

  return (
    <>
      {/* <TableRow hover selected={selected}> */}
      <TableRow hover selected={selected} style={{ verticalAlign: 'middle' }}>
        <TableCell component="th" scope="row">
          <Box gap={1} display="flex" alignItems="center">
            <ReactSVG src="/assets/icons/iconify/overtime.svg" style={{ width: '40px', height: '40px' }} />
            {fDateTime(row.timestamp)}
          </Box>
        </TableCell>

        <TableCell>{row.lot_number}</TableCell>
        <TableCell>{row.product_name}</TableCell>
        <TableCell>{row.batch_size ? row.batch_size.toLocaleString() : 'X,XXX'}</TableCell>
        <TableCell>{row.machine_name_en}</TableCell>
        <TableCell>{fDateTime(row.start_product, 'DD/MM/YYYY, HH:mm')}</TableCell>
        <TableCell>{fDateTime(row.finish_product, 'DD/MM/YYYY, HH:mm')}</TableCell>
        <TableCell align="center">
          <IconButton onClick={handleOpenNote('paper')} disabled={!row.notes}>
            <ReactSVG
              src={row.notes ? '/assets/icons/iconify/note.svg' : '/assets/icons/iconify/empty-note.svg'}
              style={{ width: '30px', height: '30px' }}
            />
          </IconButton>
        </TableCell>

        <TableCell align="center">
          <IconButton onClick={handleOpenDetail(row)}>
            <ReactSVG src="/assets/icons/iconify/info.svg" style={{ width: '30px', height: '30px' }} />
          </IconButton>
        </TableCell>

        <TableCell align="center">
          <IconButton onClick={handleOpenPopover}>
            <SvgColor src="/assets/icons/iconify/menu.svg" width="25px" height="25px" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={openDetail}
        onClose={handleCloseNote}
        aria-labelledby="scroll-dialog-title"
        aria-describedby="scroll-dialog-description"
      >
        <DialogTitle id="scroll-dialog-title">รายละเอียดเพิ่มเติม</DialogTitle>
        <DialogContent dividers={scroll === 'paper'} sx={{ minHeight: 250 }}>
          <DialogContentText id="scroll-dialog-description" ref={descriptionElementRef} tabIndex={-1}>
            {row.notes ? row.notes : '# ไม่มีหมายเหตุ'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNote} variant="contained" color="error">
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{
            p: 0.5,
            gap: 0.5,
            width: 140,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              [`&.${menuItemClasses.selected}`]: { bgcolor: 'action.selected' },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              handleClosePopover();
              if (row) {
                navigate('/production/form', {
                  state: { row },
                });
              }
            }}
          >
            <SvgColor src="/assets/icons/iconify/edit.svg" width="20px" height="20px" />
            แก้ไข
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleClosePopover();
              handleDeleteProduction(row);
            }}
            sx={{ color: 'error.main' }}
          >
            <SvgColor src="/assets/icons/iconify/delete.svg" width="20px" height="20px" />
            ลบ
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}
