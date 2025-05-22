FROM node:lts-alpine

# ✅ ติดตั้ง tzdata และตั้งค่า Timezone เป็น Asia/Bangkok
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Bangkok /etc/localtime \
    && echo "Asia/Bangkok" > /etc/timezone

# ✅ กำหนดตัวแปร Timezone
ENV NODE_ENV=production
ENV TZ=Asia/Bangkok

# ✅ ตั้งค่าโฟลเดอร์ทำงาน
WORKDIR /usr/src/app

# ✅ คัดลอกไฟล์ package.json และติดตั้ง dependencies
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../

# ✅ คัดลอกโค้ดทั้งหมดเข้าไปใน container
COPY . .

# ✅ เปิดพอร์ตที่ต้องการ
EXPOSE 5000

# ✅ กำหนดสิทธิ์ให้ user node
RUN chown -R node /usr/src/app
USER node

# ✅ รอ 5 วินาทีแล้วสั่ง npm start
CMD ["sh", "-c", "sleep 5 && npm start"]
