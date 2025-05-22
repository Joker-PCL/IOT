const mqtt = require("mqtt");

// const client = mqtt.connect("mqtt://192.168.12.77:1884");
const client = mqtt.connect("mqtt://localhost:1884");

const test_number = 20; // เพิ่มจำนวนเครื่องจักรจำลอง
let dataBuffer = {}; // Object สำหรับเก็บข้อมูลแยกตาม machine_id

// สถานะเครื่องจักรที่เป็นไปได้
const machineStatuses = [
  "RUNNING",
  "RUNNING",
  "RUNNING",
  "RUNNING",
  "RUNNING",
  "RUNNING",
  "RUNNING",
  "STOP",
];

client.on("connect", () => {
  console.log("📡 Connected to broker");

  // ส่งข้อมูลแบบเรียลไทม์ทุก 1 วินาที
  setInterval(() => {
    for (let i = 0; i < test_number; i++) {
      const machine_id = `ESP32-TEST${i}`;
      const status =
        machineStatuses[Math.floor(Math.random() * machineStatuses.length)]; // สุ่มสถานะ
      const isRunning = status === "RUNNING";

      const data = {
        machine_id,
        status,
        cycle_time: isRunning
          ? parseFloat((Math.random() * 5 + 1).toFixed(2))
          : 0, // 1-5 วินาทีเมื่อ RUNNING
        cpm: isRunning ? parseFloat((Math.random() * 20 + 10).toFixed(2)) : 0, // 10-50 CPM เมื่อ RUNNING
        good_path_count: isRunning ? Math.floor(Math.random() * 10 + 1) : 0, // 1-10 ชิ้นงานดี
        reject_count: isRunning ? Math.floor(Math.random() * 3) : 0, // 0-2 ชิ้นงานเสีย
        start_time: isRunning ? Math.floor(Math.random() * 2) : 0, // 0-60 วินาที
        stop_time: !isRunning ? Math.floor(Math.random() * 2) : 0, // 0-60 วินาทีเมื่อไม่ RUNNING
      };

      // ส่งข้อมูลแบบเรียลไทม์
      client.publish(
        `machine/livedata/${machine_id}`,
        JSON.stringify(data),
        () => {
          console.log(`✅ Sent at ${new Date().toLocaleTimeString()}:`, data);
        }
      );

      // เก็บข้อมูลลง buffer แยกตาม machine_id
      if (!dataBuffer[machine_id]) {
        dataBuffer[machine_id] = [];
      }
      dataBuffer[machine_id].push(data);
    }
  }, 1000); // ทุก 1 วินาที

  // บันทึกข้อมูลทุก 1 นาที
  function testRecordData() {
    setInterval(() => {
      Object.keys(dataBuffer).forEach((machine_id) => {
        const machineData = dataBuffer[machine_id];
        if (machineData.length > 0) {
          // คำนวณค่าเฉลี่ยและผลรวม
          const summary = machineData.reduce(
            (acc, curr) => {
              acc.cycle_time += curr.cycle_time;
              acc.cpm += curr.cpm;
              acc.good_path_count += curr.good_path_count;
              acc.reject_count += curr.reject_count;
              acc.start_time += curr.start_time;
              acc.stop_time += curr.stop_time;
              acc.count += 1;
              return acc;
            },
            {
              cycle_time: 0,
              cpm: 0,
              good_path_count: 0,
              reject_count: 0,
              start_time: 0,
              stop_time: 0,
              count: 0,
            }
          );

          const averagedData = {
            machine_id,
            cycle_time: parseFloat(
              (summary.cycle_time / summary.count).toFixed(2)
            ),
            cpm: parseFloat((summary.cpm / summary.count).toFixed(2)),
            good_path_count: summary.good_path_count,
            reject_count: summary.reject_count,
            start_time: summary.start_time,
            stop_time: summary.stop_time,
          };

          // ส่งข้อมูลที่คำนวณไปยัง topic สำหรับบันทึก
          client.publish(
            `machine/record/${machine_id}`,
            JSON.stringify(averagedData),
            () => {
              console.log(
                `📝 Logged at ${new Date().toLocaleTimeString()} for ${machine_id}:`,
                averagedData
              );
            }
          );

          // ล้าง buffer ของ machine_id หลังจากบันทึก
          dataBuffer[machine_id] = [];
        }
      });
    }, 60000); // ทุก 1 นาที
  }

  // testRecordData();
});
