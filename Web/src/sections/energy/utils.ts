type ElectricityMeterUnit = 'wh' | 'kwh' | 'mwh' | 'gwh' | 'twh';

// ใช้ Record type สำหรับ object unitsInKwh
const unitsInKwh: Record<ElectricityMeterUnit, number> = {
  wh: 0.001,
  kwh: 1,
  mwh: 1000,
  gwh: 1000000,
  twh: 1000000000,
};

export function convertEnergyUnit(value: number | null | undefined, fromUnit: string, toUnit: string): number | null {
  if (!value) {
    return null; // คืนค่า 0 ถ้าค่าไม่ถูกต้อง
  }

  // แปลงหน่วยเป็น lowercase และตรวจสอบ type
  const from = fromUnit.toLowerCase() as ElectricityMeterUnit;
  const to = toUnit.toLowerCase() as ElectricityMeterUnit;

  // ตรวจสอบว่าหน่วยที่ส่งมาถูกต้องหรือไม่
  if (!(from in unitsInKwh) || !(to in unitsInKwh)) {
    throw new Error('Invalid unit. Supported units are: Wh, kWh, MWh, GWh, TWh');
  }

  // แปลงค่าเป็น kWh ก่อน
  const valueInKwh = value * unitsInKwh[from];

  // แปลงจาก kWh เป็นหน่วยเป้าหมาย
  const convertedValue = valueInKwh / unitsInKwh[to];
  return convertedValue > 0 ? convertedValue : 0;
}
