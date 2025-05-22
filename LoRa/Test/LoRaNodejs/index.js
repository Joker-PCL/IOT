const mqtt = require("mqtt");

// ตั้งค่า MQTT Broker ของ ChirpStack
const options = {
    host: "localhost", // เปลี่ยนเป็น IP ของ ChirpStack
    port: 1883,
};

// เชื่อมต่อไปยัง MQTT Broker
const client = mqtt.connect(options);

client.on("connect", () => {
    console.log("Connected to MQTT Broker");

    // Subscribe หัวข้อที่ ChirpStack ใช้ส่งข้อมูล
    client.subscribe("application/+/device/+/event/up", (err) => {
        if (!err) {
            console.log("Subscribed to LoRaWAN uplink topic");
        }
    });
});

// รับข้อมูล LoRaWAN uplink
client.on("message", (topic, message) => {
    const payload = JSON.parse(message.toString());
    console.log("Received uplink:", payload);
});
