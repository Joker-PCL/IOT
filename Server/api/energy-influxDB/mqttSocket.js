const { Server } = require('socket.io');
const mqtt = require('mqtt');
const pool = require('../../configuration/mysql_db');

module.exports = async function setupMQTTAndSocket(server, mqttUrl) {
  const io = new Server(server, {
    cors: {
      origin: '*', // หรือเฉพาะ https://localhost
      methods: ['GET', 'POST'],
    },
  });

  const mqttClient = mqtt.connect(mqttUrl);

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT');

    // Subscribe ไปยัง machine/livedata และ machine/record
    mqttClient.subscribe('machine/livedata/#', (err) => {
      if (!err) console.log('✅ Subscribed to machine/livedata/#');
    });

    mqttClient.subscribe('machine/record/#', (err) => {
      if (!err) console.log('✅ Subscribed to machine/record/#');
    });

    mqttClient.subscribe('machine/status/#', (err) => {
      if (!err) console.log('✅ Subscribed to machine/record/#');
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      payload.timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
      // console.log(payload)

      if (topic.startsWith('machine/livedata/') && payload.machine_id) {
        // ส่งข้อมูลไปยัง client
        io.sockets.sockets.forEach((socket) => {
          if (socket.subscribedTopics && socket.subscribedTopics.has(payload.machine_id)) {
            socket.emit('machine-data', {...payload, machine_sn: payload.machine_id});
          }
        });
      } else if (topic.startsWith('machine/record/') && payload.machine_id) {
        await saveMachineData(payload.machine_id, payload);
      } else if (topic.startsWith('machine/status/') && payload.machine_id) {
        await saveMachineStatus(payload.machine_id, payload);
      }
    } catch (e) {
      console.error('❌ MQTT parse error:', e);
    }
  });

  io.on('connection', (socket) => {
    console.log('⚡️ New client connected:', socket.id);

    socket.subscribedTopics = new Set();

    socket.on('subscribe', (machineSN) => {
      console.log(`Client ${socket.id} subscribed to machine/livedata/${machineSN}`);
      socket.subscribedTopics.add(machineSN);
      socket.emit('subscribed', { topic: `machine/livedata/${machineSN}` });
    });

    socket.on('unsubscribe', (machineSN) => {
      console.log(`Client ${socket.id} unsubscribed from machine/livedata/${machineSN}`);
      socket.subscribedTopics.delete(machineSN);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  // ฟังก์ชันสำหรับบันทึกข้อมูลลงฐานข้อมูล
  async function saveMachineData(machineSN, data) {
    try {
      const query = `
          INSERT INTO machine_data (
            timestamp, machine_sn, cycle_time, cpm, good_path_count, reject_count, start_time, stop_time
          )
          SELECT NOW(), ?, ?, ?, ?, ?, ?, ?
          FROM machine
          WHERE machine.machine_sn = ?
      `;
      const values = [machineSN, data.cycle_time, data.cpm, data.good_path_count, data.reject_count, data.start_time, data.stop_time, machineSN];
      const [result] = await pool.query(query, values);

      // ตรวจสอบผลลัพธ์
      if (result.affectedRows > 0) {
        if (result.insertId) {
          console.log(`✅ New data saved for machine ${machineSN}`);
        } else {
          console.log(`🔄 Data updated for machine ${machineSN}`);
        }
      } else {
        console.log(`❌ No rows affected for machine ${machineSN}`);
      }
    } catch (err) {
      console.error('❌ Failed to save data to database:', err);
    }
  }

  async function saveMachineStatus(machineSN, data) {
    try {
      const query = `
        INSERT INTO machine_status (timestamp, machine_sn, status)
        SELECT NOW(), ?, ?
        FROM machine
        WHERE machine.machine_sn = ?
      `;
      const values = [machineSN, data.status, machineSN];
      const result = await pool.query(query, values);

      // ตรวจสอบผลลัพธ์
      if (result.affectedRows > 0) {
        if (result.insertId) {
          console.log(`✅ New data saved status for machine ${machineSN}`);
        } else {
          console.log(`🔄 Data updated status for machine ${machineSN}`);
        }
      } else {
        console.log(`❌ No rows affected status for machine ${machineSN}`);
      }
    } catch (err) {
      console.error('❌ Failed to save status data to database:', err);
    }
  }

  return { mqttClient };
};
