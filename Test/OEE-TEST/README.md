
# IoT Machine Monitoring System

This project demonstrates a full-stack IoT solution to monitor machine status in real-time and store periodic data.

## 🧱 Project Structure
- `esp32/`: Code for ESP32 to send machine data via MQTT.
- `backend/`: Node.js server handling MQTT data, storing to MySQL, and emitting data via WebSocket.
- `frontend/`: React app to display live and historical machine data.
- `docker-compose.yml`: Sets up MQTT Broker, MySQL, and Backend.

## 🚀 Deployment

### 1. Clone or unzip the project
```bash
unzip iot_machine_monitoring.zip
cd iot_machine_monitoring
```

### 2. Start the services with Docker
```bash
docker-compose up --build
```

This will run:
- Mosquitto MQTT broker on port `1883`
- MySQL on port `3306`
- Backend on port `3000`

### 3. Run React Frontend
In a separate terminal (outside Docker), install dependencies and start the React app:

```bash
cd frontend
npm install socket.io-client axios
npm run dev  # or npm start if using Create React App
```

Update `App.jsx` if needed to match backend IP address (e.g., `localhost` or `192.168.x.x`).

### 4. Upload ESP32 Code
Upload the code in `esp32/src/main.cpp` to your ESP32 using PlatformIO or Arduino IDE.

Make sure to replace Wi-Fi credentials and set the IP of your MQTT server.

## ✅ Features
- Real-time machine status updates
- Stores OK/NG counts and status every 5 seconds
- View recent historical data via API and frontend
- Built with Docker, Node.js, MySQL, and React

---
Enjoy building your factory dashboard! 🏭📊
