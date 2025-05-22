## Comment 
    # Environment variables for frontend
    PUBLIC_WASM_PATH="/reader/zxing_reader.wasm"

## Setup

    # Install pm2
        > https://github.com/marklagendijk/node-pm2-windows-startup
        > npm install pm2-windows-startup -g
        > pm2-startup install
        > pm2 save

    # Running
        docker-compose up --build --scale api=3
        docker-compose up --scale api=3
        docker-compose down

    # Copy docker image
        docker save -o api.tar api:latest
    # Install docker image
        docker load -i api.tar    

## Status code

    # 1xx (Informational)
        100 Continue: ร้องขอสามารถดำเนินการต่อไปได้
        101 Switching Protocols: กำลังสลับโปรโตคอลตามที่ร้องขอ
        102 Processing: เซิร์ฟเวอร์กำลังประมวลผลคำร้องขอ

    # 2xx (Success)
        200 OK: การร้องขอสำเร็จและข้อมูลที่ร้องขอถูกส่งกลับ
        201 Created: คำร้องขอสำเร็จและทรัพยากรใหม่ถูกสร้างขึ้น
        202 Accepted: คำร้องขอได้รับการยอมรับสำหรับการประมวลผล แต่ยังไม่ได้ดำเนินการเสร็จสิ้น
        204 No Content: ไม่มีข้อมูลที่จะส่งกลับ แต่คำร้องขอสำเร็จ

    # 3xx (Redirection)
        301 Moved Permanently: ทรัพยากรถูกย้ายอย่างถาวรไปยัง URL ใหม่
        302 Found: ทรัพยากรถูกย้ายไปยังตำแหน่งใหม่ชั่วคราว
        304 Not Modified: ไม่มีการเปลี่ยนแปลงจากทรัพยากรที่เคยเรียกใช้ก่อนหน้า

    # 4xx (Client Error)
        400 Bad Request: คำร้องขอไม่ถูกต้องหรือมีข้อผิดพลาดในรูปแบบ
        401 Unauthorized: ต้องการการตรวจสอบสิทธิ์
        403 Forbidden: ไม่อนุญาตให้เข้าถึงทรัพยากร
        404 Not Found: ไม่พบทรัพยากรที่ร้องขอ
        405 Method Not Allowed: วิธีการร้องขอที่ใช้ไม่ถูกต้องสำหรับทรัพยากรนี้

    # 5xx (Server Error)
        500 Internal Server Error: มีข้อผิดพลาดภายในเซิร์ฟเวอร์
        502 Bad Gateway: เกตเวย์หรือพร็อกซีเซิร์ฟเวอร์ได้รับคำตอบที่ไม่ถูกต้องจากเซิร์ฟเวอร์อื่น
        503 Service Unavailable: เซิร์ฟเวอร์ไม่พร้อมใช้งานในขณะนี้
        504 Gateway Timeout: เกตเวย์หรือพร็อกซีไม่ได้รับการตอบกลับจากเซิร์ฟเวอร์ในเวลาที่กำหนด
