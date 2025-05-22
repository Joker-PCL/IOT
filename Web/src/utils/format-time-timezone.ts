import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// import duration from 'dayjs/plugin/duration';
// import relativeTime from 'dayjs/plugin/relativeTime';

// ----------------------------------------------------------------------

// dayjs.extend(duration);
// dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// ----------------------------------------------------------------------

export type DatePickerFormat = Dayjs | Date | string | number | null | undefined;

/**
 * Docs: https://day.js.org/docs/en/display/format
 */
export const formatStr = {
  dateTime: 'DD MMM YYYY h:mm a', // 17 Apr 2022 12:00 am
  date: 'DD MMM YYYY', // 17 Apr 2022
  time: 'h:mm a', // 12:00 am
  split: {
    dateTime: 'DD/MM/YYYY h:mm a', // 17/04/2022 12:00 am
    date: 'DD/MM/YYYY', // 17/04/2022
  },
  paramCase: {
    dateTime: 'DD-MM-YYYY h:mm a', // 17-04-2022 12:00 am
    date: 'DD-MM-YYYY', // 17-04-2022
  },
};

export function today(format?: string, timeZone: string = 'Asia/Bangkok') {
  return dayjs(new Date()).startOf('day').tz(timeZone).format(format);
}

// ----------------------------------------------------------------------
/** Output: 2024-10-16 16:00:36
 */
export function fDateTimeToLocal(date: string, format: string = 'YYYY-MM-DD HH:mm:ss', timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).tz(timeZone).format(format) : 'Invalid time value';
}

/** output: 08/10/2024, 15:45:45
 */
export function fDateTime(date: DatePickerFormat, format: string='DD/MM/YYYY, HH:mm:ss', timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).tz(timeZone).format(format ?? formatStr.dateTime) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 17 Apr 2022
 */
export function fDate(date: DatePickerFormat, format?: string, timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).tz(timeZone).format(format ?? formatStr.date) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 12:00 am
 */
export function fTime(date: DatePickerFormat, format?: string, timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).tz(timeZone).format(format ?? formatStr.time) : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: 1713250100
 */
export function fTimestamp(date: DatePickerFormat, timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).tz(timeZone).isValid();

  return isValid ? dayjs(date).valueOf() : 'Invalid time value';
}

// ----------------------------------------------------------------------

/** output: a few seconds, 2 years
 */
export function fToNow(date: DatePickerFormat, format: string = 'YYYY-MM-DD HH:mm:ss', timeZone: string = 'Asia/Bangkok') {
  if (!date) {
    return null;
  }

  const isValid = dayjs(date).isValid();

  return isValid ? dayjs(date).tz(timeZone).format(format) : 'Invalid time value';
}
