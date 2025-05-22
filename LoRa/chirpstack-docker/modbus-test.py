from pymodbus.client.serial import ModbusSerialClient
import struct

# ตั้งค่าการเชื่อมต่อ Modbus RTU ผ่าน RS485
client = ModbusSerialClient(
    port='COM6',         # เปลี่ยนเป็นพอร์ตที่ใช้ (เช่น '/dev/ttyUSB0' บน Linux)
    baudrate=9600,       # ตั้งค่า Baudrate ตามมิเตอร์
    bytesize=8,
    parity='N',
    stopbits=1,
    timeout=1
)

# ฟังก์ชันอ่านค่าแรงดันจากรีจิสเตอร์
def read_voltage(register):
    response = client.read_holding_registers(address=register - 1, count=2, slave=1)  # ปรับ 1-based เป็น 0-based
    if response.isError():
        print(f"Error reading register {register}")
        return None
    else:
        registers = response.registers
        raw_data = (registers[0] << 16) | registers[1]
        voltage = struct.unpack('!f', raw_data.to_bytes(4, byteorder='big'))[0]
        return voltage

#  ฟังก์ชันอ่านค่า Energy (INT64)
def read_energy(register):
    response = client.read_holding_registers(address=register - 1, count=4, slave=1)  # ปรับ 1-based เป็น 0-based
    if response.isError():
        print(f"Error reading register {register}")
        return None
    else:
        registers = response.registers
        raw_data = (registers[0] << 48) | (registers[1] << 32) | (registers[2] << 16) | registers[3]
        energy = struct.unpack('!q', raw_data.to_bytes(8, byteorder='big', signed=True))[0]  # แปลงเป็น INT64
        return energy

# เชื่อมต่อและอ่านค่า
if client.connect():
    print("Connected to Modbus RTU device")

    registers_float2 = {
        "Voltage A-B": 50016,
        "Voltage B-C": 50018,
        "Voltage C-A": 50020,
        "Voltage A-N": 50022,
        "Voltage B-N": 50024,
        "Voltage C-N": 50026,
        "Voltage L-L Avg": 50028,
        "Voltage L-N Avg": 50030,
        "Current A": 50000,
        "Current B": 50002,
        "Current C": 50004,
        "Current N": 50006,
        "Current Avg": 50008,
        "Frequency": 21016,
    }

    registers_float4 = {
        "Active Energy Delivered Phase A": 50056,
        "Active Energy Delivered Phase B": 50060,
        "Active Energy Delivered Phase C": 50064,
        "Active Energy Delivered (Into Load)": 50068,
        "Reactive Energy Delivered Phase A": 50072,
        "Reactive Energy Delivered Phase B": 50076,
        "Reactive Energy Delivered Phase C": 50080,
        "Reactive Energy Delivered": 50084,
    }

    for name, reg in registers_float2.items():
        voltage = read_voltage(reg)
        if voltage is not None:
            print(f"{name}: {voltage:.2f}")

    for name, reg in registers_float4.items():
        voltage = read_energy(reg)
        if voltage is not None:
            print(f"{name}: {voltage:.2f}")
    client.close()
else:
    print("Failed to connect to Modbus RTU device")
