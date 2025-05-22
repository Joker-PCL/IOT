# python -m venv venv
# source venv/bin/activate
# pip install esptool
# pip install pyserial
# pip install tqdm
# python upload.py
import os
import subprocess
import serial.tools.list_ports
import sys

# ระบุเส้นทางของเฟิร์มแวร์ โดยอ้างอิง path ปัจจุบัน
base_dir = os.path.dirname(os.path.abspath(__file__))
firmware_path = os.path.join(base_dir, ".pio", "build", "esp32-8048S043C", "firmware.bin")
# ระบุเส้นทางของไฟล์ bootloader, partitions และ boot_app0 โดยอ้างอิง path ปัจจุบัน
bootloader_path = os.path.join(base_dir, ".pio", "build", "esp32-8048S043C", "bootloader.bin")
partitions_path = os.path.join(base_dir, ".pio", "build", "esp32-8048S043C", "partitions.bin")
ota_path = os.path.join(base_dir, "flash-ota.bin")

def find_ch340_ports():
    """ค้นหา USB-SERIAL CH340 ทั้งหมด"""
    ports = []
    for port in serial.tools.list_ports.comports():
        if "CH340" in port.description:  # ตรวจสอบคำว่า CH340 ในคำอธิบายพอร์ต
            ports.append(port.device)
    return ports

def upload_to_ports(firmware_path, ports):
    """อัปโหลด bootloader, partitions, boot_app0 และ firmware ไปยังพอร์ตที่กำหนด"""

    for port in ports:
        print(f"Uploading to {port}...")
        subprocess.run([
            sys.executable, "-m", "esptool",  # ใช้ Python ที่อยู่ใน venv
            "--chip", "esp32s3",
            "--port", port,
            "--baud", "460800",  # ลด baud rate เป็น 460800
            "--before", "default_reset",
            "--after", "hard_reset",
            "write_flash", "-z",
            "--flash_mode", "dio",
            "--flash_freq", "80m",
            "--flash_size", "16MB",
            "0x0000", bootloader_path,  # bootloader
            "0x8000", partitions_path,  # partitions
            "0xe000", ota_path,   # boot_app0
            "0x10000", firmware_path    # firmware
        ])

if __name__ == "__main__":
    # ค้นหา CH340 Ports
    ch340_ports = find_ch340_ports()
    if not ch340_ports:
        print("ไม่พบอุปกรณ์ CH340 ที่เชื่อมต่อ")
    else:
        print(f"พบพอร์ต CH340: {', '.join(ch340_ports)}")
        upload_to_ports(firmware_path, ch340_ports)
