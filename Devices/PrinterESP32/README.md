# Getting started with the Sunton ESP32-S3 7 inch display, LovyanGFX and LVGL

Simple demo application how to use this display with LovyanGFX and LVGL.

Some more explanation you can find on https://www.haraldkreuzer.net/en/news/getting-started-makerfabs-esp32-s3-7-inch-display-lovyangfx-and-lvgl


# Libaries
    LovyanGFX: 1.1.12
    LVGL: 8.3.11

# วิธีต่อสาย RS232
    ตัวเมีย => ตัวเมีย = RX => TX
    ตัวเมีย => ตัวผู้ = RX => RX
    
# ติดตั้ง clang-format บน Windows
    1. ไปที่ เว็บไซต์ LLVM https://github.com/llvm/llvm-project/releases/tag/llvmorg-19.1.0 แล้วดาวน์โหลดไฟล์ Windows Installer (ตัวอย่าง: LLVM-XX.X.X-win64.exe)
        ในระหว่างการติดตั้ง:
        ให้เลือกตัวเลือกที่รวม clang-format
        จำตำแหน่งที่ติดตั้ง (โดยปกติจะอยู่ใน C:\Program Files\LLVM)

    2. ตรวจสอบว่า clang-format ใช้งานได้
        เปิด Command Prompt (CMD) หรือ PowerShell
        พิมพ์คำสั่ง: clang-format --version
        ถ้าทุกอย่างถูกต้อง คุณจะเห็นข้อความแสดงเวอร์ชัน เช่น: clang-format version 16.0.0
        ถ้าไม่ได้ผล อาจเป็นเพราะตำแหน่งของ clang-format ไม่ได้อยู่ใน PATH (ไปขั้นตอนที่ 3)

3. เพิ่ม clang-format ลงใน Environment Variable
กด Win + R และพิมพ์ sysdm.cpl แล้วกด Enter

ไปที่แท็บ Advanced → คลิก Environment Variables

ในส่วน System Variables:

เลือก Path → คลิก Edit
คลิก New แล้วเพิ่มพาธที่ติดตั้ง clang-format (ตัวอย่าง: C:\Program Files\LLVM\bin)
คลิก OK ทุกหน้าต่าง
เปิด CMD ใหม่ แล้วลองรัน:

bash
คัดลอก
แก้ไข
clang-format --version
4. ตั้งค่า clang-format ใน VS Code
เปิด VS Code
ไปที่ Settings (กด Ctrl + ,)
ค้นหา clang-format.executable
ตั้งค่าให้เป็นพาธเต็มของ clang-format เช่น:
python
คัดลอก
แก้ไข
C:\Program Files\LLVM\bin\clang-format.exe
ตั้งค่า Default Formatter:
เปิด Command Palette (กด Ctrl + Shift + P) → ค้นหา Preferences: Open Settings (JSON)
เพิ่มหรือแก้ไขการตั้งค่า:
json
คัดลอก
แก้ไข
{
  "editor.defaultFormatter": "xaver.clang-format",
  "clang-format.executable": "C:\\Program Files\\LLVM\\bin\\clang-format.exe"
}
5. รีสตาร์ท VS Code
ปิดแล้วเปิด VS Code อีกครั้ง จากนั้นลองกด Alt + Shift + F เพื่อจัดรูปแบบโค้ด
