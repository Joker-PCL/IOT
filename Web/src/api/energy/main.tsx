import { API_URL } from '../config/link_api';
import api from '../config/api';

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
    day_short: string;
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
