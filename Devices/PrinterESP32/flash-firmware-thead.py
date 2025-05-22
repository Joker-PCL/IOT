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
from multiprocessing import Pool, Lock
from tqdm import tqdm
import re


# กำหนดเส้นทางไฟล์
base_dir = os.path.dirname(os.path.abspath(__file__))
firmware_path = os.path.join(base_dir, ".pio", "build", "sunton_s3", "firmware.bin")
bootloader_path = os.path.join(base_dir, ".pio", "build", "sunton_s3", "bootloader.bin")
partitions_path = os.path.join(base_dir, ".pio", "build", "sunton_s3", "partitions.bin")
ota_path = os.path.join(base_dir, "flash-ota.bin")

def find_ch340_ports():
    """ค้นหาพอร์ต CH340 ทั้งหมด"""
    ports = []
    for port in serial.tools.list_ports.comports():
        if "CH340" in port.description or "USB-SERIAL CH340" in port.description:
            ports.append(port.device)
    return ports

def upload_to_port(args):
    """อัพโหลดเฟิร์มแวร์ไปยังพอร์ตเดียว พร้อมแสดงความคืบหน้า"""
    port, port_index = args
    print_lock = Lock()
    
    try:
        with print_lock:
            print(f"\nเริ่มอัพโหลดไปยังพอร์ต {port}...")
        
        # สร้าง progress bar เฉพาะสำหรับพอร์ตนี้
        with tqdm(total=100, desc=f"พอร์ต {port}", position=port_index, leave=False, bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt}') as pbar:
            
            # คำสั่ง esptool ด้วยการดักจับ output แบบเรียลไทม์
            process = subprocess.Popen(
                [
                    sys.executable, "-m", "esptool",
                    "--chip", "esp32s3",
                    "--port", port,
                    "--baud", "460800",
                    "write_flash",
                    "--flash_mode", "dio",
                    "--flash_freq", "80m",
                    "--flash_size", "16MB",
                    "0x0000", bootloader_path,
                    "0x8000", partitions_path,
                    "0xe000", ota_path,
                    "0x10000", firmware_path
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1,
                encoding='utf-8',
                errors='replace'
            )
            
            # รูปแบบ regex สำหรับดักจับความคืบหน้า
            progress_re = re.compile(r'\((\d+) %\)')
            
            # อ่านผลลัพธ์แบบเรียลไทม์
            for line in process.stdout:
                match = progress_re.search(line)
                if match:
                    percent = int(match.group(1))
                    pbar.n = percent
                    pbar.refresh()
            
            process.wait()
        
        if process.returncode == 0:
            with print_lock:
                print(f"\n✅ อัพโหลดสำเร็จไปยังพอร์ต {port}")
            return True
        else:
            with print_lock:
                print(f"\n❌ อัพโหลดล้มเหลวไปยังพอร์ต {port}")
            return False
            
    except Exception as e:
        with print_lock:
            print(f"\n⚠️ เกิดข้อผิดพลาดกับพอร์ต {port}: {str(e)}")
        return False

if __name__ == "__main__":
    # ค้นหาพอร์ตทั้งหมด
    ch340_ports = find_ch340_ports()
    
    if not ch340_ports:
        print("⚠️ ไม่พบพอร์ต CH340 ที่เชื่อมต่อ")
    else:
        print(f"🔍 พบพอร์ต CH340: {', '.join(ch340_ports)}")
        print("🚀 เริ่มกระบวนการอัพโหลดแบบขนาน...\n")
        
        # เตรียมข้อมูลพอร์ตพร้อม index สำหรับ position ของ progress bar
        port_args = [(port, idx) for idx, port in enumerate(ch340_ports)]
        
        # สร้าง Pool สำหรับอัพโหลดพร้อมกัน
        with Pool(processes=len(ch340_ports)) as pool:
            results = pool.map(upload_to_port, port_args)
        
        # สรุปผล
        successful = sum(results)
        print(f"\n🎯 สรุปผลการอัพโหลด:")
        print(f"  - สำเร็จ: {successful} พอร์ต")
        print(f"  - ล้มเหลว: {len(ch340_ports) - successful} พอร์ต")
        print("✅ การอัพโหลดเสร็จสิ้น")