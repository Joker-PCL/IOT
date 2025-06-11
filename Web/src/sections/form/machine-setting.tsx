import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import Card from '@mui/material/Card';
import LoadingButton from '@mui/lab/LoadingButton';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import Swal from 'sweetalert2';
import { SvgColor } from 'src/components/svg-color';

import { useRouter } from 'src/routes/hooks';
import QrScaner from './qr-scaner';
import { MachineGroupsApi, MachineSettingsApi } from '../../api/production';

// ----------------------------------------------------------------------
export type MachineGroup = {
  group_name: string;
  group_img: string;
};

// รายชื่อเครื่องจักรในฐานข้อมูล
export type MachineSettingProps = {
  machine_id: string;
  machine_name_th: string;
  machine_name_en: string;
  machine_sn?: string;
  alarm_box_sn_1: string;
  alarm_box_sn_2: string;
  group_name: string;
  machine_img?: string;
  upload_machine_image?: File | null;
};

export function FormMachineSetting() {
  const router = useRouter();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const form = UseFormMachineSetting();
  const [machineGroupsLists, setMachineGroupsLists] = useState([]);
  const { post }: { post?: MachineSettingProps } = location.state || {};

  // const [uploadMachineImg, setUploadMachineImg] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleChangeMachineGroup = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    form.setForm(name, value);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = event.target;
    if (name === 'machine_img' && files) {
      const file = files[0];
      // setUploadMachineImg(file);
      setImagePreview(URL.createObjectURL(file));
      form.setForm('upload_machine_image', file);
    } else {
      form.setForm(name, value);
    }
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      console.log('Form post before validation:', form.formpost); // Check form post
      event.preventDefault();

      const sn1 = form.formpost.alarm_box_sn_1;
      const sn2 = form.formpost.alarm_box_sn_2;
      const sn1Valid = sn1 ? !sn1.startsWith('ESP32') : false;
      const sn2Valid = sn2 ? !sn2.startsWith('ESP32') : false;

      const newFormError = {
        alarm_box_sn_1: (sn1 && sn1 === sn2) || sn1Valid,
        alarm_box_sn_2: (sn1 && sn1 === sn2) || sn2Valid,
        machine_name_en: form.formpost.machine_name_en === '',
        group_name: form.formpost.group_name === '',
      };

      form.setFormpostError(newFormError);

      // ตรวจสอบว่ามี error หรือไม่
      const hasError = Object.values(newFormError).some((error) => error);
      if (hasError) {
        console.info('Form submission failed, please correct the errors.');
      } else {
        const fetchpost = async () => {
          try {
            const response = await MachineSettingsApi(form.formpost);
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
              navigate('/sign-in');
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
            }
          }
        };

        fetchpost(); // Call the async function to fetch the post
      }
    },
    [router, form, navigate]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (isLoading) {
      const fetchData = async () => {
        try {
          const getMachineGroupsLists = await MachineGroupsApi(); // Wait for the promise to resolve
          console.log(getMachineGroupsLists);
          setMachineGroupsLists(getMachineGroupsLists);
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

      if (post) {
        console.log('post: ', post);
        form.setFormpost({
          machine_id: post.machine_id,
          machine_sn: post.machine_sn,
          machine_name_th: post.machine_name_th,
          machine_name_en: post.machine_name_en,
          alarm_box_sn_1: post.alarm_box_sn_1,
          alarm_box_sn_2: post.alarm_box_sn_2,
          group_name: post.group_name,
        });
      }

      setIsLoading(false);
    }
  }, [navigate, post, form, isLoading]);

  const renderForm = (
    <Box
      component="form"
      autoComplete="on" // สำคัญ
      display="flex"
      flexDirection="column"
      alignItems="flex-end"
      onSubmit={handleSubmit} // สำคัญ!
    >
      <TextField
        id="machine_name_en"
        name="machine_name_en"
        label="เครื่องจักร"
        placeholder="Machine name..."
        value={form.formpost?.machine_name_en ?? ''}
        fullWidth
        onChange={handleChange}
        error={form.formError.machine_name_en}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <QrScaner
        name="machine_sn"
        label="หมายเลขเครื่องจักร"
        placeholder="MC-XXX"
        value={form.formpost?.machine_sn ?? ''}
        onChange={(name, value) => {
          form.setForm(name, value);
        }}
      />

      <QrScaner
        name="alarm_box_sn_1"
        label="หมายเลขเครื่องชั่งที่ 1"
        placeholder="ESP32-XXXXXXXXXXXXXXX"
        value={form.formpost?.alarm_box_sn_1 ?? ''}
        error={form.formError.alarm_box_sn_1}
        onChange={(name, value) => {
          form.setForm(name, value);
        }}
      />

      <QrScaner
        name="alarm_box_sn_2"
        label="หมายเลขเครื่องชั่งที่ 2"
        placeholder="ESP32-XXXXXXXXXXXXXXX"
        value={form.formpost?.alarm_box_sn_2 ?? ''}
        error={form.formError.alarm_box_sn_2}
        onChange={(name, value) => {
          form.setForm(name, value);
        }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="group_name_label">กลุ่มเครืองจักร</InputLabel>
        <Select
          labelId="group_name_label"
          id="group_name"
          value={form.formpost?.group_name ?? ''}
          error={form.formError.group_name}
          name="group_name"
          onChange={handleChangeMachineGroup}
          label="เลือกกลุ่มเครืองจักร"
        >
          {machineGroupsLists.map((group: MachineGroup) => (
            <MenuItem key={group.group_name} value={group.group_name}>
              {group.group_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        id="machine_img"
        name="machine_img"
        type="file"
        label="อัพโหลดภาพเครื่องจักร"
        fullWidth
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
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
          position: 'relative',
          backgroundColor: 'common.white',
        }}
      >
        <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" mb={5}>
          <Box
            component="img"
            alt={post?.machine_name_en}
            src={imagePreview || (post?.machine_img ? post.machine_img : '/assets/images/machine/default.png')}
            sx={{
              width: 300,
              height: 300,
              borderRadius: 2,
            }}
          />
        </Box>
        <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" mb={5}>
          <Typography variant="h4">แบบฟอร์มตั้งค่าเครื่องจักร</Typography>
        </Box>
        {renderForm}
      </Card>
    </>
  );
}

export function UseFormMachineSetting() {
  const [formpost, setFormpost] = useState<MachineSettingProps>({
    machine_id: '',
    machine_sn: '',
    machine_name_th: '',
    machine_name_en: '',
    alarm_box_sn_1: '',
    alarm_box_sn_2: '',
    machine_img: '',
    group_name: '',
    upload_machine_image: null,
  });

  const [formError, setFormpostError] = useState({
    machine_name_en: false,
    alarm_box_sn_1: false,
    alarm_box_sn_2: false,
    group_name: false,
  });

  const setForm = (name: string, value: string | number | File) => {
    setFormpost({
      ...formpost,
      [name]: value,
    });

    setFormpostError({
      ...formError,
      [name]: false,
    });
  };

  return {
    setForm,
    formpost,
    setFormpost,
    formError,
    setFormpostError,
  };
}
