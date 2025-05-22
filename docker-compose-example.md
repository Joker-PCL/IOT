
# 🐳 ตัวอย่าง Docker Compose + คำสั่งพร้อมคำอธิบาย (ภาษาไทย)

## 📝 ตัวอย่างไฟล์ `docker-compose.yml`

```yaml
version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html
    networks:
      - my-network

  api:
    build: ./api
    ports:
      - "3000:3000"
    depends_on:
      - db
    networks:
      - my-network
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASS=example

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: example
      MYSQL_DATABASE: myapp
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - my-network

volumes:
  db-data:

networks:
  my-network:
```

---

## 📌 อธิบายแต่ละส่วน

### `version`
- กำหนดเวอร์ชันของ `docker-compose` syntax

### `services`
- รายการ container ที่จะรันพร้อมกัน

#### ✅ `web`
- ใช้ nginx และ map port `8080:80`
- ใช้ volume เพื่อ mount โฟลเดอร์ `./html` ไปยัง nginx

#### ✅ `api`
- สร้างจาก Dockerfile ที่อยู่ใน `./api`
- map port `3000:3000`
- เชื่อมกับ `db` และใช้ environment variable

#### ✅ `db`
- ใช้ image `mysql:8.0`
- กำหนดรหัสผ่าน root และชื่อ database
- เก็บข้อมูลใน volume `db-data`

### `volumes`
- ใช้เพื่อเก็บข้อมูลถาวรของ MySQL

### `networks`
- ให้ container เชื่อมต่อกันใน network เดียว

---

## 💻 คำสั่ง docker-compose พร้อมคำอธิบาย

| คำสั่ง | ความหมาย |
|--------|----------|
| `docker-compose up` | รันทุก service ตาม `docker-compose.yml` |
| `docker-compose up -d` | รันแบบ background (detached mode) |
| `docker-compose down` | หยุด container และลบ network ที่สร้าง |
| `docker-compose ps` | ดูสถานะของ service ที่กำลังรัน |
| `docker-compose logs` | ดู log ของ container ทั้งหมด |
| `docker-compose build` | สร้าง image จาก `Dockerfile` ที่กำหนดไว้ |
| `docker-compose exec <service> <command>` | รันคำสั่งใน container เช่น `docker-compose exec api sh` |
| `docker-compose stop` | หยุด container ทั้งหมด |
| `docker-compose start` | เริ่ม container ที่หยุดไว้ |

---

> เหมาะสำหรับเริ่มต้นสร้างระบบ Web + API + Database ด้วย Docker อย่างง่ายและมีประสิทธิภาพ
