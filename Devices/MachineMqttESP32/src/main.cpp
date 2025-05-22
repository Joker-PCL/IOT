#include "./setting.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h> // รวมไลบรารี
#include <PubSubClient.h>
#include <WiFi.h>

// MQTT broker details
String machine_id = "";
String wifi_ssid = "";
String wifi_password = "";
String mqtt_server = "";
int mqtt_port = 1884;
String mqtt_topic_liveData = "";
String mqtt_topic_record = "";
String mqtt_topic_status = "";

// MQTT client
WiFiClient espClient;
PubSubClient client(espClient);

Preferences preferences; // สร้างออบเจกต์
bool IS_FIRST_RUN = true;
bool devMode = false;

// Variables for data aggregation
volatile bool isRunning = false;
volatile bool cycleTimeTiggered = false;
float cycle_time = 0; // เก็บเวลาเวลาในแต่ละรอบ
float cpm = 0;
unsigned long good_path_count = 0;
unsigned long reject_count = 0;
unsigned long start_time = 0;
unsigned long stop_time = 0;

// Variables for 30-second aggregation
float total_cycle_time = 0;
float total_cpm = 0;
int total_good_path_count = 0;
int total_reject_count = 0;
unsigned long total_start_time = 0;
unsigned long total_stop_time = 0;
int data_points = 0;

// Debounce timing variables
volatile unsigned long lastCycleTimeInterrupt = 0;

// Debounce delay in milliseconds
int debounceDelay = 50;
int timeout = 3000;

// Interrupt service routines with debounce
void IRAM_ATTR handleCycleTime() {
    unsigned long currentTime = millis();
    if (currentTime - lastCycleTimeInterrupt > debounceDelay && !cycleTimeTiggered) {
        lastCycleTimeInterrupt = currentTime;

        cycleTimeTiggered = true;
    }
}

// Function to connect to WiFi
void setupWiFi() {
    static unsigned long lastAttemptTime = 0;
    static bool isConnecting = false;

    if (WiFi.status() == WL_CONNECTED) {
        if (!isConnecting) {
            Serial.println("\nWiFi connected");
            Serial.print("IP Address: ");
            Serial.println(WiFi.localIP());
            isConnecting = true;
        }
        return;
    }

    if (millis() - lastAttemptTime > 5000 || lastAttemptTime == 0) {
        Serial.println("Connecting to WiFi...");
        WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
        lastAttemptTime = millis();
        isConnecting = false;
    }
}

// Function to connect to MQTT broker
void connectToMQTT() {
    static unsigned long lastAttemptTime = 0; // เก็บเวลาครั้งสุดท้ายที่พยายามเชื่อมต่อ

    // ตรวจสอบว่า WiFi เชื่อมต่ออยู่หรือไม่
    if (WiFi.status() == WL_CONNECTED) {
        // ตรวจสอบว่า MQTT ยังไม่ได้เชื่อมต่อ
        if (!client.connected()) {
            // พยายามเชื่อมต่อทุก 5 วินาที
            if (millis() - lastAttemptTime > 5000 || lastAttemptTime == 0) {
                Serial.println("Connecting to MQTT...");
                if (client.connect("ESP32Client")) {
                    Serial.println("Connected to MQTT broker");
                } else {
                    Serial.print("Failed to connect, rc=");
                    Serial.print(client.state());
                    Serial.println(" retrying in 5 seconds");
                }
                lastAttemptTime = millis(); // อัปเดตเวลาที่พยายามเชื่อมต่อครั้งล่าสุด
            }
        }
    }
}

// Function to read data from hardware
void readHardwareData() {
    // Update totals for 30-second aggregation
    total_cycle_time += cycle_time;
    total_cpm += cpm;
    total_good_path_count += good_path_count;
    total_reject_count += reject_count;
    data_points++;

    static String lastStatus = "STOP";

    if (client.connected()) {

        String status = isRunning ? "RUNNING" : "STOP";

        // สร้าง payload สำหรับ live data
        JsonDocument doc;
        doc["machine_id"] = machine_id;
        doc["status"] = status;
        doc["cycle_time"] = cycle_time;
        doc["cpm"] = cpm;
        doc["good_path_count"] = good_path_count;
        doc["reject_count"] = reject_count;
        doc["start_time"] = start_time;
        doc["stop_time"] = stop_time;

        String payload;
        serializeJson(doc, payload);

        // ส่งข้อมูลไปยัง MQTT broker
        if (client.publish(mqtt_topic_liveData.c_str(), payload.c_str())) {
            Serial.println("✅ Hardware data published successfully: " + payload);
            good_path_count = 0;
            reject_count = 0;
            start_time = 0;
            stop_time = 0;
        } else {
            Serial.println("❌ Hardware data publishing failed");
        }

        if (status != lastStatus) {
            JsonDocument statusDoc;
            statusDoc["machine_id"] = machine_id;
            statusDoc["status"] = status;

            String statusPayload;
            serializeJson(statusDoc, statusPayload);

            String statusUrl = mqtt_topic_status + String(machine_id);
            if (client.publish(statusUrl.c_str(), statusPayload.c_str())) {
                Serial.println("✅ Status published successfully: " + statusPayload);
            } else {
                Serial.println("❌ Status publishing failed");
            }

            lastStatus = status;
        }
    }
}

// Function to send 30-second aggregated data
void sendAggregatedData() {
    float avg_cycle_time = total_cycle_time / data_points;
    float avg_cpm = total_cpm / data_points;

    if (client.connected()) {

        // สร้าง payload สำหรับ record data
        JsonDocument doc;
        doc["machine_id"] = machine_id;
        doc["cycle_time"] = avg_cycle_time;
        doc["cpm"] = avg_cpm;
        doc["good_path_count"] = total_good_path_count;
        doc["reject_count"] = total_reject_count;
        doc["start_time"] = total_start_time;
        doc["stop_time"] = total_stop_time;

        String payload;
        serializeJson(doc, payload);
        // ส่งข้อมูลไปยัง MQTT broker
        if (client.publish(mqtt_topic_record.c_str(), payload.c_str())) {
            Serial.println("✅ Aggregated data published successfully: " + payload);
            // Reset aggregation variables
            total_cycle_time = 0;
            total_cpm = 0;
            total_good_path_count = 0;
            total_reject_count = 0;
            total_start_time = 0;
            total_stop_time = 0;
            data_points = 0;
        } else {
            Serial.println("❌ Aggregated data publishing failed");
        }
    }
}

void publishRandomData() {
    static String _lastStatus = "";
    static unsigned long lastAttemptTime = 0;

    if (millis() - lastAttemptTime > 1000 || lastAttemptTime == 0) {
        const char *_status = random(0, 10) < 8 ? "RUNNING" : "STOP";
        bool _isRunning = strcmp(_status, "RUNNING") == 0;

        float _cycle_time = _isRunning ? random(30, 201) / 100.0 : 0;
        float _cpm = _isRunning ? random(3200, 3401) / 100.0 : 0;
        int _good_path_count = _isRunning ? random(5, 9) : 0;
        int _reject_count = _isRunning ? random(1, 4) : 0;
        int _start_time = _isRunning ? 1 : 0;
        int _stop_time = !_isRunning ? 1 : 0;

        if (WiFi.status() == WL_CONNECTED) {

            // สร้าง JSON payload ด้วย ArduinoJson
            JsonDocument doc;
            doc["machine_id"] = machine_id;
            doc["status"] = _status;
            doc["cycle_time"] = _cycle_time;
            doc["cpm"] = _cpm;
            doc["good_path_count"] = _good_path_count;
            doc["reject_count"] = _reject_count;
            doc["start_time"] = _start_time;
            doc["stop_time"] = _stop_time;

            String payload;
            serializeJson(doc, payload);

            if (client.publish(mqtt_topic_liveData.c_str(), payload.c_str())) {
                Serial.println("✅ Message published successfully: " + payload);
            } else {
                Serial.println("❌ Message publishing failed");
            }

            if (String(_status) != _lastStatus) {
                JsonDocument statusDoc;
                statusDoc["machine_id"] = machine_id;
                statusDoc["status"] = _status;

                String statusPayload;
                serializeJson(statusDoc, statusPayload);

                String statusUrl = mqtt_topic_status + String(machine_id);
                if (client.publish(statusUrl.c_str(), statusPayload.c_str())) {
                    Serial.println("✅ Status published successfully: " + statusPayload);
                } else {
                    Serial.println("❌ Status publishing failed");
                }

                _lastStatus = _status;
            }
        }

        lastAttemptTime = millis();
    }
}

void processCpmTimeTask(void *parameter) {
    static bool firstCycleTimeTigger = true;
    static unsigned long lastCycleTime = 0; // เก็บเวลา lastCycleTime
    static unsigned long lastTimeout = 0;   // เก็บเวลา timeout
    static bool rejectStatus = false;       // เก็บเวลา timeout

    for (;;) {
        if (cycleTimeTiggered) {
            if (firstCycleTimeTigger) {
                firstCycleTimeTigger = false;
                cycleTimeTiggered = false;
                lastCycleTime = millis();
                Serial.println("Machine has started to work >>>");
            } else {
                cycle_time = (millis() - lastCycleTime) / 1000.0; // แปลงเป็นวินาที
                cpm = float(60.0) / cycle_time;                   // คำนวณ CPM (จำนวนรอบต่อนาที)

                lastCycleTime = millis(); // รีเซ็ตตัวจับเวลา
                lastTimeout = millis();   // รีเซ็ตเวลา timeout

                isRunning = true; // เปลี่ยนสถานะการทำงาน -> true

                for (int i = 0; i < REJECT_NUMBER_PIN; i++) {
                    int readRejectSensor = digitalRead(REJECT_PINS[i]);

                    if (readRejectSensor == LOW) {
                        rejectStatus = true;
                        reject_count++;
                    }
                }

                if (!rejectStatus) {
                    good_path_count++;
                }

                Serial.printf("Cycle time (s): %.2f, Result: %s, ", cycle_time, rejectStatus ? "NG" : "OK");
                Serial.printf("OK: %d, NG: %d\n", good_path_count, reject_count);
                cycleTimeTiggered = false;
            }
        }

        // หากไม่มีสัญญานจากเซ็นเซอร์ภายใน 3 วินาที และ สถานะการทำงาน -> true
        if (millis() - lastTimeout >= timeout && isRunning) {
            Serial.println("Machine stopped working!!");
            isRunning = false; // เปลี่ยนสถานะการทำงาน -> false
            firstCycleTimeTigger = true;
            cycle_time = 0;
            cpm = 0;
        }

        vTaskDelay(10 / portTICK_PERIOD_MS);
    }
}

// รีเซ็ตการตั้งค่า
void factoryReset() {
    Serial.println("Factory reset....");
    preferences.begin(NAME_SPACE, false);
    preferences.clear(); // ลบข้อมูลทั้งหมดใน namespace "myApp"
    preferences.end();

    delay(500);
    preferences.begin(NAME_SPACE, false);
    preferences.putString(MEM_WIFI_SSID, DEFAULT_WIFI_SSID);
    preferences.putString(MEM_WIFI_PASSWORD, DEFAULT_WIFI_PASSWORD);
    preferences.putInt(MEM_MQTT_MQTT_SERVER, DEFAULT_MQTT_PORT);
    preferences.putString(MEM_MQTT_MQTT_PORT, DEFAULT_MQTT_SERVER);
    preferences.putString(MEM_MQTT_MQTT_TOPIC_LIVEDATA, DEFAULT_MQTT_TOPIC_LIVEDATA);
    preferences.putString(MEM_MQTT_MQTT_TOPIC_RECORD, DEFAULT_MQTT_TOPIC_RECORD);
    preferences.putString(MEM_MQTT_TOPIC_STATUS, DEFAULT_MQTT_TOPIC_STATUS);

    preferences.putInt(MEM_DEBOUNDE_DELAY, DEFAULT_DEBOUNDE_DELAY);
    preferences.putInt(MEM_TIMEOUT, DEFAULT_TIMEOUT);

    preferences.end();
    delay(500);
}

// โหลดข้อมูลการตั้งค่า
void loadConfiguration() {
    // เปิด Namespace "polipharm" ในโหมดอ่าน-เขียน
    preferences.begin(NAME_SPACE, true);
    IS_FIRST_RUN = preferences.getBool(MEM_FIRST_RUN, false);
    if (IS_FIRST_RUN) {
        factoryReset();
    }

    machine_id = preferences.getString(MEM_MACHINE_ID, "");
    Serial.println("MACHINE ID: " + machine_id);

    CYCLE_TIME_PIN = preferences.getInt(MEM_CYCLE_TIME_NUMBER_PIN, DEFAULT_CYCLE_TIME_PIN);
    REJECT_NUMBER_PIN = preferences.getInt(MEM_REJECT_NUMBER_PIN, DEFAULT_REJECT_NUMBER_PIN);
    pinMode(CYCLE_TIME_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(CYCLE_TIME_PIN), handleCycleTime, FALLING);
    Serial.println("CYCLE_TIME_PIN: " + String(CYCLE_TIME_PIN));
    Serial.print("REJECT_PINS: ");
    for (int i = 0; i < REJECT_NUMBER_PIN; i++) {
        pinMode(REJECT_PINS[i], INPUT_PULLUP);
        Serial.print(String(REJECT_PINS[i]));
        i < REJECT_NUMBER_PIN - 1 ? Serial.print(", ") : Serial.println();
    }

    // ข้อมูล Wi-Fi
    wifi_ssid = preferences.getString(MEM_WIFI_SSID, DEFAULT_WIFI_SSID);
    wifi_password = preferences.getString(MEM_WIFI_PASSWORD, DEFAULT_WIFI_PASSWORD);
    mqtt_server = preferences.getString(MEM_MQTT_MQTT_SERVER, DEFAULT_MQTT_SERVER);
    mqtt_port = preferences.getInt(MEM_MQTT_MQTT_PORT, DEFAULT_MQTT_PORT);
    mqtt_topic_liveData = preferences.getString(MEM_MQTT_MQTT_TOPIC_LIVEDATA, DEFAULT_MQTT_TOPIC_LIVEDATA);
    mqtt_topic_record = preferences.getString(MEM_MQTT_MQTT_TOPIC_RECORD, DEFAULT_MQTT_TOPIC_RECORD);
    mqtt_topic_status = preferences.getString(MEM_MQTT_TOPIC_STATUS, DEFAULT_MQTT_TOPIC_STATUS);
    Serial.println("WIFI SSID: " + wifi_ssid);
    Serial.println("WIFI PASS: " + wifi_password);
    Serial.println("MQTT SERVER URL: " + mqtt_server);
    Serial.println("MQTT SERVER PORT: " + String(mqtt_port));
    Serial.println("MQTT TOPIC LIVE DATA: " + mqtt_topic_liveData);
    Serial.println("MQTT TOPIC RECORD: " + mqtt_topic_record);
    Serial.println("MQTT TOPIC STATUS: " + mqtt_topic_status);
    Serial.println("================================");

    debounceDelay = preferences.getInt(MEM_DEBOUNDE_DELAY, DEFAULT_DEBOUNDE_DELAY);
    timeout = preferences.getInt(MEM_TIMEOUT, DEFAULT_TIMEOUT);
    Serial.println("DEBOUNDE DELAY: " + String(debounceDelay));
    Serial.println("TIMEOUT TIMEOUT: " + String(timeout));
    Serial.println("================================");

    preferences.end();
}

void command(char cmd) {
    Serial.println("Command: " + String(cmd));
    switch (cmd) {
    case 'M': // แสดงรายการการตั้งค่าทั้งหมด
        Serial.println("=== SETTINGS MENU ===");
        Serial.println("D: Set Development Mode (0 = OFF, 1 = ON)");
        Serial.println("R: Restart the device");
        Serial.println("F: Factory Reset");
        Serial.println("S: Set specific parameter");
        Serial.println("    Parameters:");
        Serial.println("    - machine_id (id): Set MACHINE ID");
        Serial.println("    - wifi_ssid (ws): Set WiFi SSID");
        Serial.println("    - wifi_password (wp): Set WiFi Password");
        Serial.println("    - mqtt_server (ms): Set MQTT Server");
        Serial.println("    - mqtt_port (mp): Set MQTT Port");
        Serial.println("    - mqtt_topic_liveData (mtl): Set MQTT Topic for Live Data");
        Serial.println("    - mqtt_topic_record (mtr): Set MQTT Topic for Record Data");
        Serial.println("    - mqtt_topic_status (mts): Set MQTT Topic for Status");
        Serial.println("    - debounceDelay (dd): Set debounce delay (ms)");
        Serial.println("    - timeout (to): Set timeout (ms)");
        Serial.println("======================");
        break;
    case 'D': // ตั้งค่า Development Mode
        devMode = Serial.parseInt();
        Serial.printf("(DEV SET_MODE)=> %s\n", devMode ? "ON" : "OFF");
        break;
    case 'R': // รีสตาร์ทอุปกรณ์
        Serial.printf("(RESTART)=> .......\n");
        ESP.restart();
        break;
    case 'F': // รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น
        Serial.printf("(FACTORY RESET)=> .......\n");
        factoryReset();
        ESP.restart();
        break;
    case 'S': { // ตั้งค่าพารามิเตอร์เฉพาะ
        Serial.println("(SETTINGS)=> Enter parameter to configure:");
        Serial.println("Options: machine_id (id), cycle_time_pin (ctp), reject_number_pin (rnp), wifi_ssid (ws), wifi_password (wp), mqtt_server "
                       "(ms), mqtt_port (mp), mqtt_topic_liveData (mtl), "
                       "mqtt_topic_record (mtr), mqtt_topic_status (mts), debounceDelay (dd), timeout (to)");

        while (!Serial.available()) {
            delay(10); // รอรับชื่อพารามิเตอร์
        }
        String parameter = Serial.readStringUntil('\n');
        parameter.trim();

        Serial.println("(SETTINGS)=> Enter value for " + parameter + ":");
        while (!Serial.available()) {
            delay(10); // รอรับค่าของพารามิเตอร์
        }
        String value = Serial.readStringUntil('\n');
        value.trim();

        preferences.begin(NAME_SPACE, false);
        if (parameter == "machine_id" || parameter == "id") {
            preferences.putString(MEM_MACHINE_ID, value);
            machine_id = value;
        } else if (parameter == "wifi_ssid" || parameter == "ws") {
            preferences.putString(MEM_WIFI_SSID, value);
            wifi_ssid = value;
            WiFi.disconnect();
            delay(500); // รอให้การตัดการเชื่อมต่อเสร็จสิ้น
        } else if (parameter == "wifi_password" || parameter == "wp") {
            preferences.putString(MEM_WIFI_PASSWORD, value);
            wifi_password = value;
            WiFi.disconnect();
            delay(500); // รอให้การตัดการเชื่อมต่อเสร็จสิ้น
        } else if (parameter == "mqtt_server" || parameter == "ms") {
            preferences.putString(MEM_MQTT_MQTT_SERVER, value);
            mqtt_server = value;

            client.disconnect();
            delay(500); // รอให้การตัดการเชื่อมต่อเสร็จสิ้น

        } else if (parameter == "mqtt_port" || parameter == "mp") {
            preferences.putInt(MEM_MQTT_MQTT_PORT, value.toInt());
            mqtt_port = value.toInt();

            client.disconnect();
            delay(500); // รอให้การตัดการเชื่อมต่อเสร็จสิ้น
        } else if (parameter == "mqtt_topic_liveData" || parameter == "mtl") {
            preferences.putString(MEM_MQTT_MQTT_TOPIC_LIVEDATA, value);
            mqtt_topic_liveData = value;
        } else if (parameter == "mqtt_topic_record" || parameter == "mtr") {
            preferences.putString(MEM_MQTT_MQTT_TOPIC_RECORD, value);
            mqtt_topic_record = value;
        } else if (parameter == "mqtt_topic_status" || parameter == "mts") {
            preferences.putString(MEM_MQTT_TOPIC_STATUS, value);
            mqtt_topic_status = value;
        } else if (parameter == "debounceDelay" || parameter == "dd") {
            preferences.putInt(MEM_DEBOUNDE_DELAY, value.toInt());
            debounceDelay = value.toInt();
        } else if (parameter == "cycle_time_pin" || parameter == "ctp") {
            // ยกเลิก attachInterrupt สำหรับ CYCLE_TIME_PIN
            detachInterrupt(digitalPinToInterrupt(CYCLE_TIME_PIN));
            preferences.putInt(MEM_CYCLE_TIME_NUMBER_PIN, value.toInt());
            CYCLE_TIME_PIN = value.toInt();
            attachInterrupt(digitalPinToInterrupt(CYCLE_TIME_PIN), handleCycleTime, FALLING);
        } else if (parameter == "reject_number_pin" || parameter == "rnp") {
            preferences.putInt(MEM_REJECT_NUMBER_PIN, value.toInt());
            REJECT_NUMBER_PIN = value.toInt();
        } else if (parameter == "timeout" || parameter == "to") {
            preferences.putInt(MEM_TIMEOUT, value.toInt());
            timeout = value.toInt();
        } else {
            Serial.println("(SETTINGS)=> Unknown parameter: " + parameter);
        }
        preferences.end();

        Serial.println("(SETTINGS)=> " + parameter + " updated to: " + value);
        break;
    }
    default:
        Serial.println("(UNKNOWN COMMAND)=> Command not recognized.");
        break;
    }
}

void updateLedStatus() {
    unsigned long currentTime = millis();
    static unsigned long lastBlinkTime = 0;
    static int blinkInterval = 1000; // ค่าเริ่มต้น
    static int ledState = LOW;

    if (currentTime - lastBlinkTime >= blinkInterval) {
        lastBlinkTime = currentTime;
        ledState = !ledState; // สลับสถานะ LED
        digitalWrite(LED_STATUS, ledState);
    }

    if (WiFi.status() == WL_CONNECTED && client.connected()) {
        blinkInterval = 1000; // WiFi และ MQTT เชื่อมต่อสำเร็จ
    } else if (WiFi.status() == WL_CONNECTED && !client.connected()) {
        blinkInterval = 100; // WiFi เชื่อมต่อสำเร็จ แต่ MQTT ไม่สำเร็จ
    } else {
        blinkInterval = 500; // WiFi ไม่เชื่อมต่อ
    }
}

void setup() {
    Serial.begin(115200);
    loadConfiguration();

    client.setServer(mqtt_server.c_str(), mqtt_port);
    connectToMQTT();

    // ตั้งค่า GPIO pins และ interrupts
    pinMode(LED_STATUS, OUTPUT); // ตั้งค่า LED

    xTaskCreate(processCpmTimeTask,      // Function that should be called
                "Process cpm time task", // Name of the task (for debugging)
                8192,                    // Stack size (bytes)
                NULL,                    // Parameter to pass
                1,                       // Task priority
                NULL                     // Task handle
    );
}

void loop() {
    setupWiFi();
    updateLedStatus();

    // ตรวจสอบการเชื่อมต่อ MQTT
    if (!client.connected()) {
        connectToMQTT();
    } else {
        client.loop();
    }

    // ส่งข้อมูล hardware data ทุก 2 วินาที
    static unsigned long lastPublishTime = 0;
    if (millis() - lastPublishTime > 2000 && !devMode) {
        lastPublishTime = millis();

        if (isRunning) {
            start_time += 2;
            total_start_time += 2;
        } else {
            stop_time += 2;
            total_stop_time += 2;
        }

        readHardwareData();
    }

    // ส่งข้อมูล record data ทุก 30 วินาที
    static unsigned long lastRecordTime = 0;
    if (millis() - lastRecordTime > 30000) {
        lastRecordTime = millis();
        sendAggregatedData();
    }

    if (devMode)
        publishRandomData();

    if (Serial.available())
        command(Serial.read());
}