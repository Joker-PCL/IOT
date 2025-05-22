const mqtt = require("mqtt");

const options = {
    host: "localhost", // หรือ IP ของ ChirpStack
    port: 1883,
};

// เชื่อมต่อ MQTT
const client = mqtt.connect(options);

client.on("connect", () => {
    console.log("Connected to MQTT Broker");

    // Topic สำหรับส่งคำสั่งไปยังอุปกรณ์
    const topic = "application/1/device/ef27dde39a41e997/command/down";

    // Payload คำสั่งเปิดไฟ (Base64)
    const payload = JSON.stringify({
        confirmed: true,
        fPort: 2,
        data: Buffer.from([1]).toString("base64") // คำสั่งเปิดไฟ (ค่า 1)
    });

    // ส่งคำสั่ง
    client.publish(topic, payload, {}, (err) => {
        if (!err) console.log("Downlink Command Sent!");
        else console.error("MQTT Publish Error:", err);
        client.end();
    });
});
