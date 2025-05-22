import serial
import time
import random

# ตั้งค่าพอร์ตและบอดเรต
SERIAL_PORT = "COM8"  # เปลี่ยนเป็นพอร์ตของคุณ เช่น "/dev/ttyUSB0" บน Linux
BAUD_RATE = 9600

def send_serial_data(data):
    try:
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
            ser.write(data.encode())  # ส่งข้อมูลแบบเข้ารหัสเป็น bytes
            print(f"Send: {data}")
    except serial.SerialException as e:
        print(f"Serial error: {e}")

if __name__ == "__main__":
    count = 0
    while count < 1000:
        random_value = round(random.uniform(100.00, 200.00), 2)
        # send_serial_data("+ " + str(50) + " pcs")
        send_serial_data("+ " + str(random_value) + " g")
        count+=1
        time.sleep(0.5)