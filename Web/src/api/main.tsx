import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { API_URL } from './config/link_api';
import type { ProductionsProps } from '../sections/production/table-row';
import type { FormProps } from '../sections/auth/sign-in-view';
import type { MachineSettingProps } from '../sections/form/machine-setting';

// สร้าง instance ของ axios
const api = axios.create({
  baseURL: API_URL.BASE_URL, // เริ่มต้นด้วย _HOST_MAIN
  withCredentials: true, // ✅ สำคัญมาก เพื่อให้ Cookie ถูกส่งไป-กลับ
  timeout: 10000, // 10 วินาที
});

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

export async function MachinesApi() {
  try {
    const response = await api.get(API_URL.GET_MACHINE);

    return response.data;
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

/* ---------------------------------------------------------------------------------------------------*/
/* --------------------------------------- การใช้พลังงาน -----------------------------------------------*/
/* ---------------------------------------------------------------------------------------------------*/
export type MeterType = 'electricity' | 'water';
export type SensorIdType = {
  active_energy_delivered_a: number;
  active_energy_delivered_b: number;
  active_energy_delivered_c: number;
  active_energy_delivered_total: number;
  voltage_a_b: number;
  voltage_b_c: number;
  voltage_a_c: number;
  voltage_a_n: number;
  voltage_b_n: number;
  voltage_c_n: number;
  voltage_avg_l_l: number;
  voltage_avg_l_n: number;
  current_a: number;
  current_b: number;
  current_c: number;
  current_n: number;
  current_avg: number;
  active_power_a: number;
  active_power_b: number;
  active_power_c: number;
  active_power_total: number;
  water_usage_unit: number;
};

export type MetersListsProps = {
  energy_meter_id: number;
  bucket: string;
  meter_type: string;
  range: string;
  meter_unit: string;
  meter_position: string;
} & SensorIdType;

export async function MetersListsApi(meterType?: MeterType) {
  try {
    const response = await api.post(API_URL.GET_METERS, {
      meter_type: meterType, // ส่งค่า meterType ไปใน body
    });
    const data: MetersListsProps[] = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching energy:', error);
    throw error;
  }
}

export type MeterPeriodTimeType = 'daily' | 'weekly' | 'monthly';
export type MeterDateRangeType = 'week' | 'month' | 'year';

export type MeterDataApiProps = {
  bucket: string;
  sensorId: number;
  period: MeterPeriodTimeType;
  range: MeterDateRangeType;
  startDate?: string;
  endDate?: string;
};

export type MeterDataProps = {
  meta: {
    period: string;
    range: string;
    year: string;
    currentMonth: number;
    asOfDate: string;
    weekOfYear: number;
    month: string;
    lastData: number;
    lastDataDate: string;
    startDate: string;
    endDate: string;
  };
  data: {
    date: string;
    day: string;
    currentValue: number | null;
    prevValue: number | null;
    difference: number | null;
    isToday: boolean;
    weekOfMonth: string | number;
    weekOfYear: string | number;
    range: string;
    isFuture: boolean;
    isCurrentWeek: boolean;
    month: string;
    isCurrentMonth: boolean;
    hasPartialData: boolean;
  }[];
};

export type EnergyDataProps = {
  energy_meter_id: number;
  bucket: string;
  meter_type: string;
  meter_position: string;
  meter_unit: string;
  meter_data: MeterDataProps | null | undefined;
};

export async function MeterDataApi(post: MeterDataApiProps) {
  try {
    const response = await api.post(API_URL.GET_METER_DATA, post);
    const data: MeterDataProps | null | undefined = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching energy:', error);
    throw error;
  }
}
