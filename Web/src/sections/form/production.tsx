import { useState, useCallback, useEffect } from 'react';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import 'dayjs/locale/th';
import dayjs, { Dayjs } from 'dayjs';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import Swal from 'sweetalert2';
import { SvgColor } from 'src/components/svg-color';

import { useRouter } from 'src/routes/hooks';
import { fDateTimeToLocal } from 'src/utils/format-time';
import { ProductsApi, ProductTypesApi, MachinesApi, ProductionUpdateApi } from '../../api/api';

import { ProductSearch } from './product-search';
import type { ProductionsProps } from '../production/table-row';
import { MachineSearch } from './machine-search';

dayjs.locale('th');

// ----------------------------------------------------------------------
// รายชื่อยาในฐานข้อมูล
export type ProductListsProps = {
  product_id: number;
  product_name: string;
};

export type ProductTypesProps = {
  type_id: number;
  type: string;
  description: string;
};

// รายชื่อเครื่องจักรในฐานข้อมูล
export type MachineListsProps = {
  serial_number: string;
  machine_sn: string;
  machine_name_en: string;
  last_connect: string;
  machine_img: string;
  group_name: string;
};

export function FormProduction() {
  const router = useRouter();
  const location = useLocation();
  const navigate = useNavigate();
  const form = UseFormProduction();
  const [loadingData, setLoadingData] = useState(false);
  const { row }: { row?: ProductionsProps } = location.state || {};
  const [productLists, setProductLists] = useState([]);
  const [productTypes, setProductTypes] = useState<ProductTypesProps[]>([]);
  const [machineLists, setMachineLists] = useState<MachineListsProps[]>([]);
  const [productionTimeInHours, setProductionTimeInHours] = useState(0);

  const processFinishDate = (name: string, value: Dayjs | string | number | null) => {
    // ตรวจสอบว่า name ตรงกับเงื่อนไขที่กำหนด
    if (['batch_size', 'pieces_per_box', 'pieces_per_pack', 'pieces_per_cut', 'cut_per_minute', 'start_product'].includes(name)) {
      const { batch_size, pieces_per_box, pieces_per_pack, pieces_per_cut, cut_per_minute, start_product } = {
        ...form.formData,
        [name]: value,
      } as typeof form.formData; // ใช้ Type Assertion

      if (batch_size > 0 && pieces_per_box > 0 && pieces_per_pack > 0 && pieces_per_cut > 0 && cut_per_minute > 0 && start_product) {
        const _productionTimeInHours = Math.ceil(
          (batch_size * pieces_per_box * pieces_per_pack) / (pieces_per_cut * pieces_per_pack) / cut_per_minute / 60
        );
        setProductionTimeInHours(_productionTimeInHours);

        const startDate = dayjs(start_product);
        const finishDate = startDate.add(_productionTimeInHours, 'hour');

        form.setForm('finish_product', finishDate.format('YYYY-MM-DD HH:mm'));
      } else {
        setProductionTimeInHours(0);
        form.setForm('finish_product', '');
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    form.setForm(name, value);
    processFinishDate(name, value);
  };

  const handleChangeDateField = (name: string, value: Dayjs | null) => {
    form.setForm(name, value ? value.format('YYYY-MM-DD HH:mm:ss') : '');
    processFinishDate(name, value);
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      console.log('Form Data before validation:', form.formData); // Check form data
      const newFormError = {
        lot_number: form.formData.lot_number === '',
        product_name: form.formData.product_name === '',
        product_type: form.formData.product_type === '',
        batch_size: form.formData.batch_size <= 0,
        pieces_per_box: form.formData.pieces_per_box <= 0,
        pieces_per_pack: form.formData.pieces_per_pack <= 0,
        pieces_per_cut: form.formData.pieces_per_cut <= 0,
        cut_per_minute: form.formData.pieces_per_cut <= 0,
        machine_sn: form.formData.machine_sn === '',
        machine_name_en: form.formData.machine_name_en === '',
        start_product: form.formData.start_product === '',
        finish_product: form.formData.finish_product === '',
      };

      form.setFormDataError(newFormError);

      // ตรวจสอบว่ามี error หรือไม่
      const hasError = Object.values(newFormError).some((error) => error);
      if (hasError) {
        console.info('Form submission failed, please correct the errors.');
      } else {
        const fetchData = async () => {
          try {
            const response = await ProductionUpdateApi(form.formData); // Wait for the promise to resolve
            router.back();

            Swal.fire({
              icon: 'success',
              title: 'ดำเนินการเรียบร้อยแล้ว',
              text: 'บันทึกรายการผลิตเรียบร้อยแล้ว',
              showConfirmButton: false,
              timer: 2000,
            });
          } catch (error) {
            if (error.status === 401 || error.status === 403) {
              navigate('/login');
            } else {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด...',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล!, ลองไหม่อีกครั้ง',
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonColor: '#d33',
                cancelButtonText: 'ปิด',
              });
              console.error('Error fetching data:', error);
            }
          }
        };

        fetchData(); // Call the async function to fetch the data
      }
    },
    [form, router, navigate]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (!loadingData) {
      const fetchData = async () => {
        try {
          // ดึงข้อมูลทั้งหมดพร้อมกัน
          const [getProductLists, getMachineLists, getProductTypes] = await Promise.all([ProductsApi(), MachinesApi(), ProductTypesApi()]);
          // console.log(getProductLists, getMachineLists, getProductTypes);
          setProductLists(getProductLists);
          setMachineLists(getMachineLists);
          setProductTypes(getProductTypes);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData(); // Call the async function to fetch the data
      console.log('Data: ', row);
      if (row) {
        form.setFormData({
          production_id: row.production_id ?? '',
          timestamp: row.timestamp ?? '',
          lot_number: row.lot_number ?? '',
          product_name: row.product_name ?? '',
          product_type: row.product_type ?? 'แผง',
          batch_size: row.batch_size ?? 0,
          pieces_per_box: row.pieces_per_box ?? 0,
          pieces_per_pack: row.pieces_per_pack ?? 0,
          pieces_per_cut: row.pieces_per_cut ?? 0,
          cut_per_minute: row.cut_per_minute ?? 0,
          machine_sn: row.machine_sn ?? '',
          machine_name_en: row.machine_name_en ?? '',
          start_product: fDateTimeToLocal(row.start_product) ?? '',
          finish_product: fDateTimeToLocal(row.finish_product) ?? '',
          notes: row.notes ?? '',
        });
      }

      setLoadingData(true);
    }
  }, [row, form, loadingData]);

  const renderForm = (
    <Box
      component="form"
      autoComplete="on" // สำคัญ
      display="flex"
      flexDirection="column"
      alignItems="flex-end"
      onSubmit={handleSubmit} // สำคัญ!
    >
      <MachineSearch
        posts={machineLists}
        sx={{ px: 3 }}
        setValue={form.formData?.machine_name_en ?? ''}
        error={form.formError.machine_name_en}
        onChange={handleChange}
        disabled={!!row?.machine_name_en}
        onSearch={(event: React.SyntheticEvent, value: string) => {
          if (machineLists.length > 0) {
            console.log(machineLists);
            const machine = machineLists.find((mc: MachineListsProps) => mc.machine_name_en === value);
            form.setForm('machine_name_en', value);
            form.setForm('machine_sn', machine?.machine_sn ?? '');
          }
        }}
      />

      <TextField
        name="lot_number"
        label="เลขที่ผลิต"
        placeholder="Lot number..."
        value={form.formData?.lot_number ?? ''}
        fullWidth
        onChange={handleChange}
        error={form.formError.lot_number}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <ProductSearch
        posts={productLists}
        sx={{ px: 3 }}
        product_name={form.formData?.product_name ?? ''}
        error={form.formError.product_name}
        onChange={handleChange}
        onSearch={(event: React.SyntheticEvent, value: string) => {
          form.setForm('product_name', value);
        }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="product_type-label">ประเภทชิ้นงาน</InputLabel>
        <Select
          labelId="product_type-label"
          label="ประเภทชิ้นงาน"
          name="product_type"
          value={form.formData?.product_type || 'แผง'}
          error={form.formError.product_type}
          onChange={(event: SelectChangeEvent) => {
            form.setForm('product_type', event.target.value);
          }}
        >
          {productTypes.map((lists) =>
            lists.type ? (
              <MenuItem key={lists.type_id} value={lists.type}>
                {lists.type}
              </MenuItem>
            ) : null
          )}
        </Select>
      </FormControl>

      <TextField
        name="batch_size"
        label="ขนาดผลิต"
        placeholder="--,---"
        type="number"
        value={form.formData?.batch_size || ''}
        error={form.formError.batch_size}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <TextField
        name="pieces_per_box"
        label="จำนวนชิ้นงาน/กล่อง (จำนวนแผงยาที่บรรจุต่อ 1 กล่อง)"
        placeholder="--,---"
        type="number"
        value={form.formData?.pieces_per_box || ''}
        error={form.formError.pieces_per_box}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <TextField
        name="pieces_per_pack"
        label="จำนวนชิ้นงาน/แผง (จำนวนเม็ดยาที่บรรจุต่อ 1 แผง)"
        placeholder="--,---"
        type="number"
        value={form.formData?.pieces_per_pack || ''}
        error={form.formError.pieces_per_pack}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <TextField
        name="pieces_per_cut"
        label="จำนวนแผง/ตัด  (จำนวนแผงต่อ 1 ตัด)"
        placeholder="--,---"
        type="number"
        value={form.formData?.pieces_per_cut || ''}
        error={form.formError.pieces_per_cut}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <TextField
        name="cut_per_minute"
        label="จำนวนตัด/นาที  (จำนวนการตัดใน 1 นาที)"
        placeholder="--,---"
        type="number"
        value={form.formData?.cut_per_minute || ''}
        error={form.formError.cut_per_minute}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MobileDateTimePicker
          value={form.formData.start_product ? dayjs(form.formData.start_product) : null}
          onChange={(newValue) => {
            handleChangeDateField('start_product', newValue);
          }}
          label={`วันที่เริ่มการผลิต (ใช้เวลาในการผลิตโดยประมาณ ${productionTimeInHours || '--'} ชั่วโมง)`}
          onError={console.log}
          ampm={false}
          renderInput={(params) => (
            <TextField
              name="start_product"
              placeholder="วัน/เดือน/ปี ชั่วโมง:นาที"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3 }}
              fullWidth
              {...params}
            />
          )}
        />
      </LocalizationProvider>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MobileDateTimePicker
          value={form.formData.finish_product ? dayjs(form.formData.finish_product) : null}
          onChange={(newValue) => {
            handleChangeDateField('finish_product', newValue);
          }}
          label="วันที่จบการผลิต"
          onError={console.log}
          ampm={false}
          renderInput={(params) => (
            <TextField
              name="finish_product"
              placeholder="วัน/เดือน/ปี ชั่วโมง:นาที"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3 }}
              fullWidth
              {...params}
            />
          )}
        />
      </LocalizationProvider>

      <TextField
        name="notes"
        label="ลงบันทึกเพิ่มเติม"
        placeholder="Note..."
        value={form.formData?.notes ?? ''}
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        multiline
        rows={8} // กำหนดจำนวนแถวของ textarea
        sx={{ mb: 3 }}
      />

      <Box gap={1.5} display="flex" flexDirection="row" alignItems="center" mb={5}>
        <LoadingButton fullWidth size="large" type="submit" color="success" variant="contained">
          <SvgColor width={30} height={30} src="/assets/icons/iconify/line-md--confirm-circle-twotone.svg" sx={{ marginRight: 0.5 }} color="white" />
          บันทึก
        </LoadingButton>

        <LoadingButton fullWidth size="large" type="button" color="error" variant="contained" onClick={handleCancel}>
          <SvgColor width={30} height={30} src="/assets/icons/iconify/ic--twotone-cancel.svg" sx={{ marginRight: 0.5 }} color="white" />
          ยกเลิก
        </LoadingButton>
      </Box>
    </Box>
  );

  return (
    <>
      <Card
        sx={{
          mx: { xs: 3, md: 20 },
          mb: 5,
          px: { xs: 1, md: 8 },
          py: 5,
          boxShadow: 'none',
          position: 'relative',
          backgroundColor: 'common.white',
        }}
      >
        <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" mb={5}>
          <Typography variant="h4">แบบฟอร์มการผลิต</Typography>
        </Box>
        {renderForm}
      </Card>
    </>
  );
}

export function UseFormProduction() {
  const [formData, setFormData] = useState<ProductionsProps>({
    machine_sn: '',
    machine_name_en: '',
    production_id: '',
    timestamp: '',
    lot_number: '',
    product_name: '',
    product_type: 'แผง',
    batch_size: 0,
    pieces_per_box: 0,
    pieces_per_pack: 0,
    pieces_per_cut: 0,
    cut_per_minute: 0,
    start_product: '',
    finish_product: '',
    notes: '',
  });

  const [formError, setFormDataError] = useState({
    machine_sn: false,
    machine_name_en: false,
    lot_number: false,
    product_name: false,
    product_type: false,
    batch_size: false,
    pieces_per_box: false,
    pieces_per_pack: false,
    pieces_per_cut: false,
    cut_per_minute: false,
    start_product: false,
    finish_product: false,
  });

  const setForm = useCallback((name: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormDataError((prev) => ({
      ...prev,
      [name]: false,
    }));
  }, []);

  return {
    setForm,
    formData,
    setFormData,
    formError,
    setFormDataError,
  };
}
