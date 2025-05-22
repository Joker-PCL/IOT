const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("📡 Connected to broker");

  setInterval(() => {
    const data = {
      machineId: "M01",
      status: "on",
      rpm: Math.floor(Math.random() * 100),
      okCount: Math.floor(Math.random() * 100),
      ngCount: Math.floor(Math.random() * 100),
    };

    client.publish("machine/M01", JSON.stringify(data), () => {
      console.log(`✅ Sent at ${new Date().toLocaleTimeString()}:`, data);
    });
  }, 1000); // ทุก 5 วินาที
});
