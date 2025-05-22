# 📦 Docker Commands Cheat Sheet (ภาษาไทย)

เอกสารนี้รวมคำสั่งพื้นฐานและที่ใช้บ่อยของ Docker เพื่อช่วยให้คุณใช้งาน Docker ได้สะดวกยิ่งขึ้น

---

## 🔧 ติดตั้ง Docker

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker
```

**ตรวจสอบเวอร์ชัน:**

```bash
docker --version
```

---

## 🐳 คำสั่งทั่วไป

| คำสั่ง           | ความหมาย                    |
| ---------------- | --------------------------- |
| `docker version` | ดูเวอร์ชัน Docker           |
| `docker info`    | ดูข้อมูลระบบ Docker         |
| `docker help`    | แสดงคำสั่งทั้งหมดของ Docker |

---

## 📂 Image

| คำสั่ง                           | ความหมาย                        |
| -------------------------------- | ------------------------------- |
| `docker pull <image>`            | ดาวน์โหลด image จาก Docker Hub  |
| `docker images`                  | แสดงรายการ image ที่มีในเครื่อง |
| `docker rmi <image>`             | ลบ image ออกจากเครื่อง          |
| `docker build -t <name>:<tag> .` | สร้าง image จาก Dockerfile      |

---

## 📦 Container

| คำสั่ง                             | ความหมาย                        |
| ---------------------------------- | ------------------------------- |
| `docker run <image>`               | รัน container จาก image         |
| `docker run -it <image>`           | รันแบบ interactive (เปิด shell) |
| `docker run -d <image>`            | รันแบบ background (detached)    |
| `docker run --name <name> <image>` | กำหนดชื่อให้ container          |
| `docker ps`                        | ดู container ที่กำลังรัน        |
| `docker ps -a`                     | ดู container ทั้งหมด            |
| `docker stop <container>`          | หยุด container                  |
| `docker start <container>`         | เริ่ม container                 |
| `docker restart <container>`       | รีสตาร์ท container              |
| `docker rm <container>`            | ลบ container                    |
| `docker exec -it <container> bash` | เข้า shell ของ container        |
| `docker logs <container>`          | ดู log ของ container            |

---

## 🗂️ Volume

| คำสั่ง                                 | ความหมาย                    |
| -------------------------------------- | --------------------------- |
| `docker volume create <name>`          | สร้าง volume                |
| `docker volume ls`                     | แสดงรายการ volume           |
| `docker volume rm <name>`              | ลบ volume                   |
| `docker run -v <volume>:/path <image>` | mount volume เข้า container |

---

## 🌐 Network

| คำสั่ง                          | ความหมาย             |
| ------------------------------- | -------------------- |
| `docker network ls`             | ดู network ทั้งหมด   |
| `docker network create <name>`  | สร้าง network ใหม่   |
| `docker network inspect <name>` | ดูรายละเอียด network |
| `docker network rm <name>`      | ลบ network           |

---

## 🧹 การทำความสะอาดระบบ

| คำสั่ง                   | ความหมาย                                                |
| ------------------------ | ------------------------------------------------------- |
| `docker system prune`    | ลบ container, image, network ที่ไม่ใช้แล้ว (ต้องยืนยัน) |
| `docker system prune -a` | ลบทุกอย่างที่ไม่ได้ใช้งาน (ระวัง!)                      |
| `docker volume prune`    | ลบ volume ที่ไม่ได้ใช้งาน                               |
| `docker image prune`     | ลบ image ที่ไม่มี tag หรือล้าสมัย                       |

---

## 🐳 Docker Compose

| คำสั่ง                 | ความหมาย                               |
| ---------------------- | -------------------------------------- |
| `docker-compose up`    | รัน service ตาม `docker-compose.yml`   |
| `docker-compose up -d` | รันแบบ background                      |
| `docker-compose down`  | หยุดและลบ container ทั้งหมดจาก compose |
| `docker-compose ps`    | ดู service ที่กำลังรัน                 |
| `docker-compose logs`  | ดู logs ทั้งหมด                        |

---

> เอกสารนี้เหมาะสำหรับทั้งมือใหม่และผู้มีประสบการณ์ ที่ต้องการอ้างอิงคำสั่ง Docker ได้อย่างรวดเร็ว
