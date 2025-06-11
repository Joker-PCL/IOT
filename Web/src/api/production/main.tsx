import imageCompression from 'browser-image-compression';
import { API_URL } from '../config/link_api';
import api from '../config/api';
import type { ProductionsProps } from '../../sections/production/table-row';
import type { FormProps } from '../../sections/auth/sign-in-view';
import type { MachineSettingProps } from '../../sections/form/machine-setting';

// Want to use async/await? Add the `async` keyword to your outer function/method.
export async function LoginApi(form: FormProps) {
  try {
    const response = await api.post(API_URL.LOGIN, form);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function LogoutApi() {
  try {
    const response = await api.post(API_URL.LOGOUT);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function DashboardApi() {
  try {
    const response = await api.get(API_URL.GET_DASHBOARD);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function ProductionApi() {
  try {
    const response = await api.get(API_URL.GET_PRODUCTION);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function ProductionUpdateApi(form: ProductionsProps) {
  try {
    const response = await api.post(API_URL.POST_PRODUCTION_UPDATE, form);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function ProductionDeleteApi(form: ProductionsProps) {
  try {
    const response = await api.post(API_URL.POST_PRODUCTION_DELETE, {
      production_id: form.production_id,
    });

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function DetailApi(production_id: number) {
  try {
    const response = await api.post(API_URL.GET_DETAILS, { production_id });

    return response.data;
  } catch (error) {
    console.error('Error fetching production details:', error);
    throw error;
  }
}

export async function PerformanceApi(machine_sn: String, start_product?: String, finish_product?: String) {
  try {
    const response = await api.post(API_URL.GET_PERFORMANCE, { machine_sn, start_product, finish_product });
    return response.data;
  } catch (error) {
    console.error('Error fetching performance:', error);
    throw error;
  }
}

export async function ProductsApi() {
  try {
    const response = await api.get(API_URL.GET_PRODUCTS);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function ProductTypesApi() {
  try {
    const response = await api.get(API_URL.GET_PRODUCTS_TYPE);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// รายชื่อเครื่องจักรในฐานข้อมูล
export type MachineListsProps = {
  serial_number: string;
  machine_sn: string;
  machine_name_en: string;
  last_connect: string;
  machine_img: string;
  group_name: string;
};

export async function MachinesApi() {
  try {
    const response = await api.get(API_URL.GET_MACHINE);
    const data: MachineListsProps[] = response.data;
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function MachineGroupsApi() {
  try {
    const response = await api.get(API_URL.GET_MACHINE_GROUPS);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function MachineSettingsApi(form: MachineSettingProps) {
  try {
    const formData = new FormData();
    formData.append('machine_id', form.machine_id);
    formData.append('machine_sn', form.machine_sn ?? '');
    formData.append('machine_name_th', form.machine_name_th ?? '');
    formData.append('machine_name_en', form.machine_name_en ?? '');
    formData.append('alarm_box_sn_1', form.alarm_box_sn_1 ?? '');
    formData.append('alarm_box_sn_2', form.alarm_box_sn_2 ?? '');
    formData.append('group_name', form.group_name);

    // ✅ ลดขนาดภาพก่อนแนบลง FormData
    if (form.upload_machine_image) {
      const compressedBlob = await imageCompression(form.upload_machine_image, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      // ตั้งชื่อใหม่โดยอิงจากชื่อเดิม หรือสร้างชื่อใหม่ก็ได้
      const originalName = form.upload_machine_image.name;
      const extension = originalName.split('.').pop() || 'jpg';
      const newName = `compressed_${Date.now()}.${extension}`;

      const compressedFile = new File([compressedBlob], newName, {
        type: compressedBlob.type,
      });

      formData.append('upload_machine_image', compressedFile);
    }

    const response = await api.post(API_URL.POST_MACHINE_SETTINGS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function UpdateSubcriptApi() {
  try {
    const response = await api.get(API_URL.UPDATE_SUBSCRIPT);

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
