#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <queue>

#define DEFAULT_WIFI_SSID "EN-TEST"
#define DEFAULT_WIFI_PASSWORD "plant172839"
#define DEFAULT_SERVER_URL "http://192.175.0.174:5000/api/test"
#define MAX_QUEUE_SIZE 5
#define MAX_RETRIES 3
#define RETRY_DELAY_MS 5000

QueueHandle_t dataQueue;
bool breakQueue = false;

struct QueueItem {
    JsonDocument doc;
    int retryCount;
    unsigned long timestamp;

    QueueItem() : retryCount(0), timestamp(millis()) {}
};

bool sendDataToServer(JsonDocument *doc) {
    String jsonString;
    serializeJson(*doc, jsonString);
    // Serial.println("Data to send: " + jsonString);

    HTTPClient http;
    http.begin(DEFAULT_SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonString);
    bool success = false;

    if (httpResponseCode > 0) {
        String response = http.getString();
        // Serial.printf("HTTP %d: %s\n", httpResponseCode, response.c_str());

        if (httpResponseCode == HTTP_CODE_OK || httpResponseCode == HTTP_CODE_CREATED) {
            success = true;
        }
    } else {
        // Serial.printf("HTTP Error %d: %s\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}

void addDataToQueue() {
    Serial.print("Queue data to be sent: ");
    Serial.print(uxQueueMessagesWaiting(dataQueue));
    if (uxQueueSpacesAvailable(dataQueue) == 0) {
        Serial.println("Queue is full, cannot add new data");
        return;
    }

    QueueItem item;
    item.doc["device_id"] = "ESP32-01";
    item.doc["timestamp"] = item.timestamp;
    item.doc["temperature"] = random(20, 35);
    for (int i = 1; i <= 9; i++) {
        item.doc["humidity" + String(i)] = random(40, 80);
    }

    QueueItem *pItem = new QueueItem(item); // Make a copy of data in heap because the queue needs a pointer
    if (xQueueSend(dataQueue, &pItem, portMAX_DELAY) != pdTRUE) {
        Serial.println("Failed to add data to queue");
        delete pItem;
    } else {
        Serial.println("Data added to queue successfully");
        Serial.print("Number of items in queue: ");
        Serial.println(uxQueueMessagesWaiting(dataQueue));
    }
}

void processQueueTask(void *parameter) {
    while (1) {
        while (breakQueue) {
            Serial.println("Queue is blocked");
            vTaskDelay(pdMS_TO_TICKS(500)); // Delay when queue is blocked
        }
        // Check WiFi status
        while (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi disconnected, reconnecting...");
            vTaskDelay(pdMS_TO_TICKS(500)); // Delay when queue is blocked
        }

        QueueItem *item;
        if (xQueueReceive(dataQueue, &item, portMAX_DELAY) == pdTRUE) {
            Serial.println("\nProcessing data from the queue...");

            bool sendSuccess = sendDataToServer(&item->doc);

            if (!sendSuccess) {
                Serial.printf("Failed to send data to server");
                vTaskDelay(pdMS_TO_TICKS(500)); // Delay when queue is blocked
            } else {
                Serial.println("Data sent successfully");
            }

            delete item;
        }

        Serial.println("Waiting for new data in the queue...");
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

void setup() {
    Serial.begin(115200);

    WiFi.begin(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASSWORD);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    dataQueue = xQueueCreate(MAX_QUEUE_SIZE, sizeof(QueueItem *));
    if (dataQueue == NULL) {
        Serial.println("Failed to create queue!");
        while (true)
            ; // Stop the program
    }

    xTaskCreate(processQueueTask, "QueueProcessor", 10000, NULL, 1, NULL);
}

void loop() {
    static unsigned long lastAddTime = 0;
    if (millis() - lastAddTime > 1000) {
        lastAddTime = millis();
        addDataToQueue();
    }

    if (Serial.available()) {
        char cmd = Serial.read();
        switch (cmd) {
        case 'B':
            breakQueue = Serial.parseInt();
            Serial.printf("(DEV SET_MODE)=> %s\n", breakQueue ? "ON" : "OFF");
            break;
        case 'R':
            Serial.printf("(RESTART)=> .......\n");
            ESP.restart();
            break;
        default:
            break;
        }
    }

    delay(100);
}
