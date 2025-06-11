import { API_URL } from '../config/link_api';
import api from '../config/api';

/* ---------------------------------------------------------------------------------------------------*/
/* --------------------------------------- รายงานเครื่องจักร -----------------------------------------------*/
/* ---------------------------------------------------------------------------------------------------*/

export type MachineReportType = 'weekly' | 'monthly' | 'yearly' | 'custom';

export type MachineReportApiProps = {
  reportType: MachineReportType;
  machineSn: string;
  startDate?: string;
  endDate?: string;
};

export type MachineReportWeeklyProps = {
  day_of_week: number;
  day_name: string;
  day_name_short: string;
  total_start_time: number;
  total_stop_time: number;
  total_run_time: number;
};

export type MachineReportMonthlyProps = {
  day_of_month: number;
  day_name: string;
  day_name_short: string;
  total_start_time: number;
  total_stop_time: number;
  total_run_time: number;
};

export type MachineReportYearlyProps = {
  month_number: number;
  month_name: string;
  month_name_short: string;
  total_start_time: number;
  total_stop_time: number;
  total_run_time: number;
};

export type MachineReportCustomProps = {
  day_of_month: number;
  month_of_year: number;
  year: number;
  day_name: string;
  day_name_short: string;
  full_date: string;
  total_start_time: number;
  total_stop_time: number;
  total_run_time: number;
};

export type DateRangeProps = {
  display: string;
  start: string;
  end: string;
}

export type MachineReportProps = {
  reportType: string;
  machineNameTh: string;
  machineNameEn: string;
  machineSn: number;
  dateRange: DateRangeProps,
  data: {
    is_today: boolean;
    day_of_week: number;
    day_of_month: number;
    day_name: string;
    day_name_short: string;
    month_number: number;
    month_name: string;
    month_name_short: string;
    month_of_year: number;
    year: number;
    full_date: string;
    total_start_time: number;
    total_stop_time: number;
    total_run_time: number;
  }[];
};

export async function MachineReportApi(post: MachineReportApiProps) {
  try {
    const response = await api.post(API_URL.GET_MACHINE_REPORT, post);
    const data: MachineReportProps = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching energy:', error);
    throw error;
  }
}
