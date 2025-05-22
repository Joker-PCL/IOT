const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
const mysql = require("mysql2/promise");
const cors = require("cors");

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  app.use(cors());
  app.use(express.json());

  // 📦 MySQL: Connect
  const db = await mysql.createPool({
    host: "db",
    user: "root",
    password: "plant172839",
    database: "iot",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // 📡 MQTT
  const mqttClient = mqtt.connect("mqtt://localhost:1883");
  console.log('Socket connected:', mqttClient.connected);

  mqttClient.on("connect", () => {
    console.log("✅ Connected to MQTT");
    mqttClient.subscribe("machine/M01");
  });

  let lastSaveTime = 0;

  mqttClient.on("message", async (topic, message) => {
    console.log("📡 MQTT Message:", message.toString());
    try {
      const payload = JSON.parse(message.toString());
      const { machineId, status, rpm, okCount, ngCount } = payload;

      // ใช้เวลาปัจจุบันใน timezone Bangkok
      const now = new Date()
        .toLocaleString("sv-SE", {
          timeZone: "Asia/Bangkok",
        })
        .replace(" ", "T");
      const nowEpoch = Date.now();

      // ส่งข้อมูลไปที่ frontend ทุกครั้ง
      io.emit("machine-data", {
        machineId,
        status,
        rpm,
        okCount,
        ngCount,
        timestamp: now,
      });

      // เช็คว่าครบ 15 วิ แล้วหรือยัง
      if (nowEpoch - lastSaveTime >= 5000) {
        lastSaveTime = nowEpoch;

        await db.execute(
          "INSERT INTO machine_data (machineId, status, okCount, ngCount, timestamp) VALUES (?, ?, ?, ?, ?)",
          [machineId, status, okCount, ngCount, now]
        );
        console.log("💾 Data saved to DB:", now);
      }
    } catch (err) {
      console.error("❌ MQTT Message Error:", err);
    }
  });

  // 📡 API Endpoint
  app.get("/api/machine/:id/recent", async (req, res) => {
    const [rows] = await db.execute(
      "SELECT * FROM machine_data WHERE machineId = ? ORDER BY timestamp DESC LIMIT 10",
      [req.params.id]
    );
    res.json(rows);
  });

  server.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
});
