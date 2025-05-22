#define LGFX_LCD4_3
// #define LGFX_LCD7_0
// #define TOUCH_DEBUG

#include "./gui/gui.h"
#include <Arduino.h>
#include <Wire.h>
#include <lv_conf.h>
#include <lvgl.h>
#include <queue>

#include "Printer.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <NTPClient.h>
#include <PCF8574.h>
#include <RTClib.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiUdp.h>

#include <Preferences.h> // รวมไลบรารี

#include "./setting.h"

Preferences preferences; // สร้างออบเจกต์
bool devMode = false;

int runTaskTimeOut = 10000;
bool runTaskComplete = false;
bool syncWifi = false;
bool syncTime = false;
bool switchToDetailsPage = false;
TaskHandle_t syncWifiTaskHandle = NULL;  // ตัวแปรเก็บ handle ของ syncWifiTask
TaskHandle_t syncTimeTaskHandle = NULL;  // ตัวแปรเก็บ handle ของ syncTimeTask
TaskHandle_t handShakeTaskHandle = NULL; // ตัวแปรเก็บ handle ของ handShakeTask
TaskHandle_t processQueueTaskHandle = NULL; // ตัวแปรเก็บ handle ของ processQueueTask

char chipid[23];

String EmployeeID1 = "";
String EmployeeID2 = "";
int SET_MODE = 0;
float SET_MIN_WEIGHT = 0.00;
float SET_MAX_WEIGHT = 0.00;
bool SET_PRINT_LOGO = false;
bool SET_PRINT_PCS = false;
int SET_PCS = 0;

// Count
unsigned long COUNT_GRAM_OK = 0;
unsigned long COUNT_GRAM_NG = 0;
unsigned long COUNT_PCS_OK = 0;
unsigned long COUNT_PCS_NG = 0;

PCF8574 pcf8574(0x20);
bool isAlert = false;
bool alertState = false;
int alertRounds = 0;
long alertTime = 0;

QueueHandle_t dataQueue;

// โครงสร้างเพื่อเก็บข้อมูลที่ต้องการส่ง
struct DataToSend {
    int mode;
    JsonDocument jsonData; // กำหนดขนาดที่ชัดเจน
    DataToSend() {}
};

// ประกาศ Queue เป็น global
QueueHandle_t xSendDataQueue = NULL;

// ข้อมูล Wi-Fi
int handshakeStatus = INITIAL;
String ssidString = "";
String passwordString = "";
String apiServer = "";
String ntpUDPServerString = "";
String authorizationToken = "";
String machineName = "";

// NTP Client
WiFiUDP ntpUDP;
// ปรับโซนเวลาได้ตามต้องการ (7*3600 สำหรับ UTC+7)
// NTPClient timeClient(ntpUDP, "pool.ntp.org", 7 * 3600, 60000);
NTPClient timeClient(ntpUDP);
RTC_DS3231 rtc;

Printer printer;

struct DateTimeInfo {
    String datetime;
    String date;
    String time;
};

// ฟังก์ชันสำหรับการอ่านค่าเวลา
DateTimeInfo getDateTime() {
    DateTime now = rtc.now();

    char datetime_buffer[20] = "YYYY-MM-DD hh:mm:ss";
    now.toString(datetime_buffer);

    // Serial.println(datetime_buffer);

    char date[11]; // สร้าง buffer สำหรับวันที่
    sprintf(date, "%02d/%02d/%04d", now.day(), now.month(), now.year());

    char time[9]; // สร้าง buffer สำหรับเวลา
    sprintf(time, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());

    DateTimeInfo dtInfo;
    dtInfo.datetime = datetime_buffer;
    dtInfo.date = String(date);
    dtInfo.time = String(time);

    return dtInfo;
}

// เลือกโหมดการชั่ง กรัม หรือ นับจำนวน
void setCurrentPage() {
    if (SET_MODE == MODE_GRAM) {
        lv_label_set_text(ui_ModeLabel, "กรัม");
        _ui_flag_modify(ui_GramPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
        _ui_flag_modify(ui_PcsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_SettingPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_ConfirmFactoryResetPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_ConfirmWiFiSettingsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
    } else if (SET_MODE == MODE_PCS) {
        _ui_flag_modify(ui_GramPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_PcsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
        _ui_flag_modify(ui_SettingPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_ConfirmFactoryResetPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_ConfirmWiFiSettingsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        lv_label_set_text(ui_ModeLabel, "นับจำนวน");
    }
}

// ฟังก์ชันสำหรับการตั้งค่าโหมดการทำงาน
void selectMode(lv_event_t *e) {
    if (e) {
        lv_event_code_t event_code = lv_event_get_code(e);
        lv_obj_t *target = lv_event_get_target(e);
        SET_MODE = lv_obj_has_state(target, LV_STATE_CHECKED);
        preferences.begin(NAME_SPACE, false);
        preferences.putInt(MEM_SET_MODE, SET_MODE);
        preferences.end();

        setCurrentPage();
    }
}

// ฟังก์ชันสำหรับ Task การเชื่อมต่อ Wi-Fi
void wifiConnectTask(void *parameter) {
    const TickType_t timeout = pdMS_TO_TICKS(runTaskTimeOut);
    TickType_t startTime = xTaskGetTickCount();

    Serial.print("Connecting to wifi");
    while (WiFi.status() != WL_CONNECTED) {
        if (xTaskGetTickCount() - startTime > timeout) {
            Serial.printf("\nTimeout: Wifi connect failed!\n");
            handShakeTaskHandle = NULL;
            syncTimeTaskHandle = NULL;
            handshakeStatus = OFFLINE;
            switchToDetailsPage = true;
            vTaskDelay(300 / portTICK_PERIOD_MS);
            runTaskComplete = true;
            vTaskDelete(NULL);
        }
        vTaskDelay(1000 / portTICK_PERIOD_MS);
        Serial.print(".");
    }

    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("\nWiFi connect to ssid: %s\n", WiFi.SSID());
    syncWifi = true;
    vTaskDelay(1000 / portTICK_PERIOD_MS);
    xTaskNotifyGive(handShakeTaskHandle);
    xTaskNotifyGive(syncTimeTaskHandle);
    vTaskDelete(NULL);
}

// ฟังก์ชันสำหรับ Task การซิงค์เวลา
void syncTimeTask(void *parameter) {
    // รอการแจ้งเตือนจาก wifiConnectTask ก่อนจะเริ่มทำงาน
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    syncWifi = false;
    Serial.println("Syncing time...");

    const TickType_t timeout = pdMS_TO_TICKS(runTaskTimeOut); // Timeout
    TickType_t startTime = xTaskGetTickCount();               // เวลาที่เริ่มต้น task

    // เริ่มต้น NTP Client
    timeClient.begin();
    while (!timeClient.update()) {
        timeClient.forceUpdate();
        vTaskDelay(100 / portTICK_PERIOD_MS);

        // ตรวจสอบว่า task ทำงานเกิน timeout หรือไม่
        if (xTaskGetTickCount() - startTime > timeout) {
            Serial.println("Timeout: NTP update failed");
            switchToDetailsPage = true; // ตั้งค่าว่า tasks ทั้งหมดเสร็จสิ้น
            vTaskDelay(100 / portTICK_PERIOD_MS);
            runTaskComplete = true;
            vTaskDelete(NULL);
        }
    }

    // เช็คเวลาใน RTC กับเวลา NTP
    time_t rtcTime = rtc.now().unixtime();      // อ่านเวลาใน RTC
    time_t ntpTime = timeClient.getEpochTime(); // เวลา NTP

    // คำนวณความแตกต่าง
    long timeDifference = abs(rtcTime - ntpTime);

    // หากความแตกต่างเกิน 5 นาที (300 วินาที) จะอัปเดต RTC ด้วยเวลา NTP
    if (timeDifference > 300) { // กำหนดค่า 300 วินาที (5 นาที) เป็นเกณฑ์
        Serial.println("Time difference is too large, updating RTC...");
        rtc.adjust(DateTime(ntpTime)); // อัปเดต RTC ด้วยเวลา NTP
    } else {
        Serial.println("Time difference is within acceptable range, no need to update RTC.");
    }

    // ถ้า RTC lost power, อัปเดตเวลา RTC จาก NTP
    if (rtc.lostPower()) {
        Serial.println("RTC lost power, syncing time...");
        if (timeClient.update()) {
            time_t epoch = timeClient.getEpochTime();
            if (epoch > 1000000000) { // ตรวจสอบว่า epoch ถูกต้อง (มากกว่าปี 2001)
                Serial.printf("Setting RTC time: %lu\n", epoch);
                rtc.adjust(DateTime(epoch)); // อัปเดต RTC ด้วยเวลา NTP
            } else {
                Serial.println("Invalid time received, not updating RTC.");
            }
        } else {
            Serial.println("NTP update failed, cannot set RTC.");
        }
    }

    DateTimeInfo dt = getDateTime();
    Serial.printf("Date: %s\n", dt.date);
    Serial.printf("Time: %s\n", dt.time);

    syncTime = true; // ตั้งค่าว่า tasks ทั้งหมดเสร็จสิ้น
    vTaskDelay(1000 / portTICK_PERIOD_MS);
    switchToDetailsPage = true; // ตั้งค่าว่า tasks ทั้งหมดเสร็จสิ้น
    vTaskDelay(1000 / portTICK_PERIOD_MS);
    runTaskComplete = true; // ตั้งค่าว่า tasks ทั้งหมดเสร็จสิ้น
    vTaskDelete(NULL);      // ปิด Task เมื่อทำงานเสร็จ
}

// ฟังก์ชันสำหรับอัพเดท UI ของเครื่องจักร
lv_timer_t *updateMachineNameTimer = NULL;
void updateUiMachine(lv_timer_t *timer) {
    bool handshake_success = false;

    switch (handshakeStatus) {
    case INITIAL:
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans60, 0);
        lv_label_set_text(ui_MachineName, "Handshaking...");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_GRAY), 0);
        break;

    case ERROR:
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans60, 0);
        lv_label_set_text(ui_MachineName, "Handshake failed!");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_ORANGE), 0);
        handshake_success = true;
        break;

    case REGISTERED:
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans100, 0);
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_GRAY), 0);
        lv_label_set_text(ui_MachineName, machineName.c_str());
        handshake_success = true;
        break;

    case NOT_REGISTERED:
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans60, 0);
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_ORANGE), 0);
        lv_label_set_text(ui_MachineName, "Device not registered!");
        handshake_success = true;
        break;

    case OFFLINE:
        lv_label_set_text(ui_MachineName, "...OFFLINE...");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_ORANGE), 0);
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans100, 0);
        handshake_success = true;
        break;

    default:
        Serial.printf("Unknown handshake status: %d\n", handshakeStatus);
        lv_obj_set_style_text_font(ui_MachineName, &ui_font_NotoSans60, 0);
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(COLOR_ORANGE), 0);
        lv_label_set_text(ui_MachineName, "Handshake failed!");
        handshake_success = true;
        break;
    }

    if (handshake_success) {
        lv_obj_clear_state(ui_UpdateDetails, LV_STATE_DISABLED);
        if (updateMachineNameTimer != NULL) {
            updateMachineNameTimer = NULL;
            Serial.println("Delete updateMachineNameTimer...");
            lv_timer_del(updateMachineNameTimer);
        }

        lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที
    }
}

// ฟังก์ชันสำหรับ handShakeTask
void handShakeTask(void *parameter) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    handshakeStatus = INITIAL;

    while (true) {

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("Handshaking...");
            // ส่ง GET request ไปที่ server เพื่อส่ง Authorization Token
            HTTPClient http;
            http.begin(apiServer + "/handshake");
            http.addHeader("Content-Type", "application/json");
            // สร้างข้อมูล JSON ที่จะส่ง
            String jsonData = "{\"serial_number\":\"" + String(chipid) + "\", \"ip_address\":\"" + WiFi.localIP().toString() + "\"}";

            int httpResponseCode = http.POST(jsonData);

            if (httpResponseCode == REGISTERED) {
                String payload = http.getString();
                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, payload);

                // Test if parsing succeeds
                handshakeStatus = httpResponseCode;
                if (error) {
                    Serial.print(F("deserializeJson() failed: "));
                    Serial.println(error.f_str());
                } else {
                    const char *_machineName = doc["machineName"];
                    const char *_authorizationToken = doc["accessToken"];
                    machineName = _machineName;
                    machineName.toUpperCase();
                    authorizationToken = _authorizationToken;

                    Serial.println("Machine Name: " + machineName);
                    Serial.println("Authorization Token: " + authorizationToken);
                    http.end(); // ปิดการเชื่อมต่อ HTTP
                }

                break;

            } else if (httpResponseCode == NOT_REGISTERED) {
                Serial.print("Error on sending POST: ");
                Serial.println(httpResponseCode);

                if (handShakeTaskHandle != NULL) {
                    Serial.println("Deleting task...");
                    handShakeTaskHandle = NULL; // ตั้งค่าเป็น NULL เพื่อป้องกันการใช้ handle ซ้ำ
                    vTaskDelete(handShakeTaskHandle);
                }

                break;
            } else {
                continue;
            }
        } else {
            handshakeStatus = OFFLINE;
            Serial.println("Server 404");
            if (handShakeTaskHandle != NULL) {
                Serial.println("Deleting task...");
                handShakeTaskHandle = NULL; // ตั้งค่าเป็น NULL เพื่อป้องกันการใช้ handle ซ้ำ
                vTaskDelete(handShakeTaskHandle);
            }

            break;
        }

        Serial.printf("Status code: %d\n", handshakeStatus);
        vTaskDelay(3000 / portTICK_PERIOD_MS);
    }

    Serial.println("Deleted handshake tasks");
    handShakeTaskHandle = NULL; // ตั้งค่าเป็น NULL เพื่อป้องกันการใช้ handle ซ้ำ
    vTaskDelete(NULL);          // ลบ Task นี้หลังจากส่งข้อมูลเสร็จสิ้น
}

// ฟังก์ชัน task สำหรับอัพเดทข้อมูล
void updateDetails(lv_event_t *e) {
    Serial.println("Update details...");
    lv_obj_add_state(ui_UpdateDetails, LV_STATE_DISABLED);

    if (updateMachineNameTimer == NULL) {
        Serial.println("Start updateMachineNameTimer...");
        updateMachineNameTimer = lv_timer_create(updateUiMachine, 100, NULL);
    }

    if (handShakeTaskHandle == NULL) {
        xTaskCreatePinnedToCore(handShakeTask, "Handshaking Task", 10000, NULL, 1, &handShakeTaskHandle, 1);
        xTaskNotifyGive(handShakeTaskHandle); // เมื่อเชื่อมต่อสำเร็จแล้ว ให้แจ้ง syncTimeTask
    } else {
        Serial.println("Handshaking task already running...");
    }
}

// อัพเดท Counter
void updateCount(int _mode) {
    preferences.begin(NAME_SPACE, false);

    if (_mode == MODE_GRAM) {
        lv_label_set_text_fmt(ui_OkGramCount, "%05u", COUNT_GRAM_OK);
        lv_label_set_text_fmt(ui_NgGramCount, "%05u", COUNT_GRAM_NG);
        preferences.putULong(MEM_COUNT_GRAM_OK, COUNT_GRAM_OK);
        preferences.putULong(MEM_COUNT_GRAM_NG, COUNT_GRAM_NG);
        Serial.printf("(COUNT_GRAM)=> OK: %u, NG: %u\n", COUNT_GRAM_OK, COUNT_GRAM_NG);
    } else if (_mode == MODE_PCS) {
        lv_label_set_text_fmt(ui_OkPcsCount, "%05u", COUNT_PCS_OK);
        lv_label_set_text_fmt(ui_NgPcsCount, "%05u", COUNT_PCS_NG);
        preferences.putULong(MEM_COUNT_PCS_OK, COUNT_PCS_OK);
        preferences.putULong(MEM_COUNT_PCS_NG, COUNT_PCS_NG);
        Serial.printf("(COUNT_PCS)=> OK: %u, NG: %u\n", COUNT_PCS_OK, COUNT_PCS_NG);
    }
    preferences.end();
}

// รีเซ็ต Counter
void resetCount(lv_event_t *e) {
    lv_obj_t *target = lv_event_get_target(e);
    int _mode = (int)lv_event_get_user_data(e);

    if (_mode == MODE_GRAM) {
        COUNT_GRAM_OK = 0;
        COUNT_GRAM_NG = 0;
    } else if (_mode == MODE_PCS) {
        COUNT_PCS_OK = 0;
        COUNT_PCS_NG = 0;
    }

    updateCount(_mode);
}

// ฟังก์ชันสำหรับการส่งข้อมูลไปยัง Server
bool sendDataToServer(JsonDocument *jsonData) {
    String jsonString;
    serializeJson(*jsonData, jsonString);
    Serial.println("(Packing data)=> " + jsonString);

    HTTPClient http;

    int _data_mode = (*jsonData)["mode"].as<int>();
    if (_data_mode == MODE_GRAM) {
        http.begin(apiServer + "/devices/modeGram");
    } else if (_data_mode == MODE_PCS) {
        http.begin(apiServer + "/devices/modePcs");
    } else {
        http.end(); // ปิดการเชื่อมต่อ HTTP
        Serial.println("Invalid mode");
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + authorizationToken);

    int httpResponseCode = http.POST(jsonString);
    bool success = false;

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("(Response)=> %d: %s\n", httpResponseCode, response.c_str());

        if (httpResponseCode == HTTP_CODE_OK || httpResponseCode == HTTP_CODE_CREATED) {
            success = true;
        }
    } else {
        Serial.printf("(HTTP Error)=> %d: %s\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}

// ฟังก์ชันสำหรับการเพิ่มข้อมูลลงใน Queue
void addDataToQueue(DataToSend dataToSend) {
    Serial.print("Queue data to be sent: ");
    Serial.print(uxQueueMessagesWaiting(dataQueue));
    Serial.print(" ");

    if (uxQueueSpacesAvailable(dataQueue) == 0) {
        Serial.println("Queue is full, cannot add new data");
        return;
    }

    DataToSend *pItem = new DataToSend(dataToSend); // Make a copy of data in heap because the queue needs a pointer
    if (xQueueSend(dataQueue, &pItem, portMAX_DELAY) != pdTRUE) {
        Serial.println("Failed to add data to queue");
        delete pItem;
    } else {
        Serial.println("Data added to queue successfully");
        Serial.print("Number of items in queue: ");
        Serial.println(uxQueueMessagesWaiting(dataQueue));
    }
}

// ฟังก์ชันสำหรับการเตรียมและส่งข้อมูล
void processQueueTask(void *parameter) {
    while (1) {
        // Check WiFi status
        while (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi disconnected, reconnecting...");
            vTaskDelay(pdMS_TO_TICKS(500)); // Delay when queue is blocked
        }

        DataToSend *item;
        if (xQueueReceive(dataQueue, &item, portMAX_DELAY) == pdTRUE) {
            Serial.println("\nProcessing data from the queue...");

            bool sendSuccess = sendDataToServer(&item->jsonData);

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

// สั่งปริ้นน้ำหนัก
void printWeight(String weight) {
    weight.replace("+", "");
    weight.replace("-", "");
    weight.replace("g", "");
    weight.trim();

    for (int i = 0; i < weight.length(); i++) {
        if (!isDigit(weight[i]) && weight[i] != '.') {
            return;
        }
    }

    float readFloat = weight.toFloat();
    String _result = "FAIL";
    if (readFloat > 0) {
        DateTimeInfo dt = getDateTime();
        lv_label_set_text_fmt(ui_CurrentWeight, "%.2f", readFloat);
        if (readFloat < SET_MIN_WEIGHT || readFloat > SET_MAX_WEIGHT) {
            lv_obj_set_style_bg_color(ui_LedGramResult, lv_color_hex(COLOR_RED), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentWeight, lv_color_hex(COLOR_RED), LV_PART_MAIN);
            lv_label_set_text(ui_GramResult, "ไม่ผ่าน");
            isAlert = true;
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที
            COUNT_GRAM_NG++;
            _result = "FAIL";
        } else {
            lv_obj_set_style_bg_color(ui_LedGramResult, lv_color_hex(COLOR_GREEN), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentWeight, lv_color_hex(COLOR_GREEN), LV_PART_MAIN);
            lv_label_set_text(ui_GramResult, "ผ่าน");
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที
            COUNT_GRAM_OK++;
            _result = "PASS";

            pcf8574.digitalWrite(P0, LOW);
            delay(200);
            pcf8574.digitalWrite(P0, HIGH);

            printer.reset();
            if (lv_obj_has_state(ui_PrintLogo, LV_STATE_CHECKED)) {
                printer.setAlign(ALIGN_CENTER);
                printer.printLogo(); // พิมพ์โลโก้
            }

            printer.setAlign(ALIGN_LEFT);
            String currentDate = dt.date;
            String currentTime = dt.time;
            printer.println("Date: " + currentDate);
            printer.println("Time: " + currentTime);

            printer.println("Weight Range: " + String(SET_MIN_WEIGHT, 2) + " - " + String(SET_MAX_WEIGHT, 2) + " g.");
            printer.println("Weight:            " + String(readFloat, 2) + " g.");
            printer.println("Operator id 1: " + EmployeeID1);
            printer.println("Operator id 2: " + EmployeeID2);

            printer.feed(1);
            printer.setFontSize(LARGE);
            printer.setBold(BOLD_ON);
            printer.setAlign(ALIGN_CENTER);
            printer.highlight(HIGHLIGHT_VERTICAL_HORIZONTALLY_EXPANDED);
            printer.println("PASS");
            printer.cut();
        }

        updateCount(MODE_GRAM);

        DataToSend item;
        item.jsonData["timestamp"] = dt.datetime;
        item.jsonData["serial_number"] = String(chipid);
        item.jsonData["operator1"] = EmployeeID1.toInt();
        item.jsonData["operator2"] = EmployeeID2.toInt();
        item.jsonData["min_weight"] = SET_MIN_WEIGHT;
        item.jsonData["max_weight"] = SET_MAX_WEIGHT;
        item.jsonData["weight"] = readFloat;
        item.jsonData["result"] = _result;

        addDataToQueue(item);
    }
}

// สั่งปริ้นจำนวน
void printPcs(String pcs) {
    pcs.replace("+", "");
    pcs.replace("-", "");
    pcs.replace("pcs", "");
    pcs.trim();

    for (int i = 0; i < pcs.length(); i++) {
        if (!isDigit(pcs[i]) && pcs[i]) {
            return;
        }
    }

    int readInt = pcs.toInt();
    String _result = "FAIL";

    if (readInt > 0) {
        DateTimeInfo dt = getDateTime();
        lv_label_set_text_fmt(ui_CurrentPcs, "%d", readInt);
        if (readInt != SET_PCS) {
            lv_obj_set_style_bg_color(ui_LedPcsResult, lv_color_hex(COLOR_RED), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentPcs, lv_color_hex(COLOR_RED), LV_PART_MAIN);
            lv_label_set_text(ui_PcsResult, "ไม่ผ่าน");
            isAlert = true;
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที

            COUNT_PCS_NG++;
            _result = "FAIL";
        } else {
            lv_obj_set_style_bg_color(ui_LedPcsResult, lv_color_hex(COLOR_GREEN), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentPcs, lv_color_hex(COLOR_GREEN), LV_PART_MAIN);
            lv_label_set_text(ui_PcsResult, "ผ่าน");
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที

            COUNT_PCS_OK++;
            _result = "PASS";

            pcf8574.digitalWrite(P0, LOW);
            delay(200);
            pcf8574.digitalWrite(P0, HIGH);

            if (SET_PRINT_PCS) {
                printer.reset();

                printer.setAlign(ALIGN_LEFT);
                String currentDate = dt.date;
                String currentTime = dt.time;
                printer.println("Date: " + currentDate + " Time: " + currentTime);

                printer.print("Oper: " + EmployeeID1);
                printer.println(", Count: " + String(readInt) + " SET_PCS");
                printer.cut();
            }
        }

        updateCount(MODE_PCS);

        DataToSend item;
        item.jsonData["timestamp"] = dt.datetime;
        item.jsonData["serial_number"] = String(chipid);
        item.jsonData["operator1"] = EmployeeID1.toInt();
        item.jsonData["operator2"] = EmployeeID2.toInt();
        item.jsonData["primary_pcs"] = SET_PCS;
        item.jsonData["pcs"] = readInt;
        item.jsonData["result"] = _result;

        addDataToQueue(item);
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
    preferences.putBool(MEM_SET_PRINT_LOGO, false);
    preferences.putInt(MEM_SET_MODE, 0);
    preferences.putBool(MEM_SET_PRINT_LOGO, false);
    preferences.putBool(MEM_SET_PRINT_PCS, false);
    preferences.putFloat(MEM_SET_MIN_WEIGHT, 0);
    preferences.putFloat(MEM_SET_MAX_WEIGHT, 0);
    preferences.putInt(MEM_SET_PCS, 0);

    preferences.putULong(MEM_COUNT_GRAM_OK, 0);
    preferences.putULong(MEM_COUNT_GRAM_NG, 0);
    preferences.putULong(MEM_COUNT_PCS_OK, 0);
    preferences.putULong(MEM_COUNT_PCS_NG, 0);

    preferences.putString(MEM_WIFI_SSID, DEFAULT_WIFI_SSID);
    preferences.putString(MEM_WIFI_PASSWORD, DEFAULT_WIFI_PASSWORD);
    preferences.putString(MEM_SERVER_URL, DEFAULT_SERVER_URL);
    preferences.putString(MEM_NTP_SERVER, DEFAULT_NTP_SERVER);
    preferences.end();
    delay(500);
}

void confirmFactoryReset(lv_event_t *e) {
    factoryReset();
    ESP.restart();
}

// โหลดข้อมูลการตั้งค่า
void loadConfiguration() {
    // เปิด Namespace "polipharm" ในโหมดอ่าน-เขียน
    preferences.begin(NAME_SPACE, true);
    IS_FIRST_RUN = preferences.getBool(MEM_FIRST_RUN, false);
    if (IS_FIRST_RUN) {
        factoryReset();
    }

    unsigned int GET_MODE = preferences.getInt(MEM_SET_MODE, 0);
    float GET_MIN_WEIGHT = preferences.getFloat(MEM_SET_MIN_WEIGHT, 0.00);
    float GET_MAX_WEIGHT = preferences.getFloat(MEM_SET_MAX_WEIGHT, 0.00);
    bool GET_PRINT_LOGO = preferences.getBool(MEM_SET_PRINT_LOGO, false);
    bool GET_PRINT_PCS = preferences.getBool(MEM_SET_PRINT_PCS, false);
    unsigned int GET_PCS = preferences.getInt(MEM_SET_PCS, 0);

    COUNT_GRAM_OK = preferences.getULong(MEM_COUNT_GRAM_OK, 0);
    COUNT_GRAM_NG = preferences.getULong(MEM_COUNT_GRAM_NG, 0);
    COUNT_PCS_OK = preferences.getULong(MEM_COUNT_PCS_OK, 0);
    COUNT_PCS_NG = preferences.getULong(MEM_COUNT_PCS_NG, 0);

    SET_MODE = GET_MODE < 0 ? 0 : GET_MODE;
    SET_MIN_WEIGHT = GET_MIN_WEIGHT < 0 ? 0.00 : GET_MIN_WEIGHT;
    SET_MAX_WEIGHT = GET_MAX_WEIGHT < 0 ? 0.00 : GET_MAX_WEIGHT;
    SET_PRINT_LOGO = GET_PRINT_LOGO;
    SET_PRINT_PCS = GET_PRINT_PCS;
    SET_PCS = GET_PCS < 0 ? 0 : GET_PCS;

    Serial.println("Read EEPROM settings:");
    Serial.printf("IS_FIRST_RUN: %d\n", IS_FIRST_RUN);
    Serial.printf("SET_MODE: %d\n", SET_MODE);
    Serial.printf("SET_MIN_WEIGHT: %.2f\n", SET_MIN_WEIGHT);
    Serial.printf("SET_MAX_WEIGHT: %.2f\n", SET_MAX_WEIGHT);
    Serial.printf("SET_PRINT_LOGO: %d\n", SET_PRINT_LOGO);
    Serial.printf("SET_PRINT_PCS: %d\n", SET_PRINT_PCS);
    Serial.printf("SET_PCS: %d\n", SET_PCS);
    Serial.printf("COUNT_GRAM_OK: %u\n", COUNT_GRAM_OK);
    Serial.printf("COUNT_GRAM_NG: %u\n", COUNT_GRAM_NG);
    Serial.printf("COUNT_PCS_OK: %u\n", COUNT_PCS_OK);
    Serial.printf("COUNT_PCS_NG: %u\n", COUNT_PCS_NG);
    Serial.println("================================");

    // ข้อมูล Wi-Fi
    ssidString = preferences.getString(MEM_WIFI_SSID, DEFAULT_WIFI_SSID);
    passwordString = preferences.getString(MEM_WIFI_PASSWORD, DEFAULT_WIFI_PASSWORD);
    apiServer = preferences.getString(MEM_SERVER_URL, DEFAULT_SERVER_URL);
    ntpUDPServerString = preferences.getString(MEM_NTP_SERVER, DEFAULT_NTP_SERVER);
    preferences.end();

    Serial.println("SSID: " + ssidString);
    Serial.println("PASS: " + passwordString);
    Serial.println("SERVER URL: " + apiServer);
    Serial.println("NTP SERVER: " + ntpUDPServerString);
    Serial.println("================================");

    const char *ssid = ssidString.c_str();
    const char *password = passwordString.c_str();
    const char *ntpUDPServer = ntpUDPServerString.c_str();

    WiFi.begin(ssid, password);
    timeClient.setPoolServerName(ntpUDPServer);
    timeClient.setTimeOffset(7 * 3600);
    timeClient.setUpdateInterval(60000);

    lv_obj_add_flag(ui_LowBattery, LV_OBJ_FLAG_HIDDEN);

    // อัพเดทค่าที่หน้าจอ
    lv_label_set_text(ui_WiFiSSID, ssid);
    lv_label_set_text(ui_WiFiPassWord, password);
    lv_label_set_text(ui_WiFiServerIP, apiServer.c_str());
    lv_label_set_text(ui_WiFiNtpServer, ntpUDPServer);

    if (SET_MODE)
        lv_obj_add_state(ui_Mode, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_Mode, LV_STATE_DEFAULT);

    selectMode(NULL);
    lv_label_set_text_fmt(ui_MinWeight, "%.2f", SET_MIN_WEIGHT);
    lv_label_set_text_fmt(ui_MaxWeight, "%.2f", SET_MAX_WEIGHT);
    lv_label_set_text_fmt(ui_PcsMonitor, "%d", SET_PCS);
    if (SET_PRINT_LOGO)
        lv_obj_add_state(ui_PrintLogo, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_PrintLogo, LV_STATE_DEFAULT);

    if (SET_PRINT_PCS)
        lv_obj_add_state(ui_PrintPcs, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_PrintPcs, LV_STATE_DEFAULT);

    // Update count
    lv_label_set_text_fmt(ui_OkGramCount, "%05u", COUNT_GRAM_OK);
    lv_label_set_text_fmt(ui_NgGramCount, "%05u", COUNT_GRAM_NG);
    lv_label_set_text_fmt(ui_OkPcsCount, "%05u", COUNT_PCS_OK);
    lv_label_set_text_fmt(ui_NgPcsCount, "%05u", COUNT_PCS_NG);

    // สร้าง Qr code chip id
    lv_label_set_text(ui_SerialNumber, chipid);
    lv_label_set_text(ui_SerialNumber2, chipid);

    lv_color_t bg_color = lv_palette_lighten(LV_PALETTE_LIGHT_BLUE, 5);
    lv_color_t fg_color = lv_palette_darken(LV_PALETTE_BLUE, 4);
    lv_obj_t *qr = lv_qrcode_create(ui_QrCodeImg, 300, fg_color, bg_color);

    lv_qrcode_update(qr, chipid, strlen(chipid));
    lv_obj_center(qr);
}

// อ่านข้อมูลจาก Serial
String readSerial(HardwareSerial &serial) {
    String readString;
    static char receivedData[50]; // Increased buffer size
    static int dataIndex = 0;

    while (serial.available() > 0) {
        char incomingByte = serial.read();

        if (incomingByte != '\n') {
            if (dataIndex < sizeof(receivedData) - 1) {
                receivedData[dataIndex++] = incomingByte;
            } else {
                Serial.println("Buffer overflow!");
                dataIndex = 0;
                memset(receivedData, 0, sizeof(receivedData));
                continue;
            }

            delay(10);
        }
    }

    receivedData[dataIndex] = '\0';
    readString = receivedData;
    dataIndex = 0;
    memset(receivedData, 0, sizeof(receivedData));

    Serial.printf("\n(Received data) => %s\n", readString);
    return readString;
}

static lv_obj_t *CURRENT_LABEL = NULL;
static void settings(lv_event_t *e) {
    _ui_flag_modify(ui_PNKEYBOARD, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
    lv_keyboard_mode_t mode = (int)lv_event_get_user_data(e);
    lv_keyboard_set_mode(ui_Keyboard, mode);

    lv_obj_t *target = lv_event_get_target(e);
    lv_obj_t *label = lv_obj_get_child(target, 0);
    const char *value = lv_label_get_text(label);
    if (value[0])
        lv_textarea_set_text(ui_input, value);

    CURRENT_LABEL = label;
}

void setPrinLogo(lv_event_t *e) {
    preferences.begin(NAME_SPACE, false);
    SET_PRINT_LOGO = lv_obj_has_state(ui_PrintLogo, LV_STATE_CHECKED);
    Serial.printf("SET_PRINT_LOGO: %s\n", SET_PRINT_LOGO ? "ON" : "OFF");
    Serial.printf("================================\n");
    preferences.putBool(MEM_SET_PRINT_LOGO, SET_PRINT_LOGO);
    preferences.end();
}

void setPrinPcs(lv_event_t *e) {
    preferences.begin(NAME_SPACE, false);
    SET_PRINT_PCS = lv_obj_has_state(ui_PrintPcs, LV_STATE_CHECKED);
    Serial.printf("SET_PRINT_PCS: %s\n", SET_PRINT_PCS ? "ON" : "OFF");
    Serial.printf("================================\n");
    preferences.putBool(MEM_SET_PRINT_PCS, SET_PRINT_PCS);
    preferences.end();
}

void saveSettings(lv_event_t *e) {
    _ui_flag_modify(ui_PNKEYBOARD, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
    const char *value = lv_textarea_get_text(ui_input);
    if (CURRENT_LABEL != NULL) {
        preferences.begin(NAME_SPACE, false);

        if (SET_MODE == MODE_GRAM) {
            lv_label_set_text_fmt(CURRENT_LABEL, "%.2f", String(value).toFloat());
            SET_MIN_WEIGHT = String(lv_label_get_text(ui_MinWeight)).toFloat();
            SET_MAX_WEIGHT = String(lv_label_get_text(ui_MaxWeight)).toFloat();

            preferences.putFloat(MEM_SET_MIN_WEIGHT, SET_MIN_WEIGHT);
            preferences.putFloat(MEM_SET_MAX_WEIGHT, SET_MAX_WEIGHT);
            Serial.printf("SET_MIN_WEIGHT: %.2f, ", SET_MIN_WEIGHT);
            Serial.printf("SET_MAX_WEIGHT: %.2f\n", SET_MAX_WEIGHT);
        } else if (SET_MODE == MODE_PCS) {
            lv_label_set_text_fmt(CURRENT_LABEL, "%d", String(value).toInt());
            SET_PCS = String(lv_label_get_text(ui_PcsMonitor)).toInt();
            preferences.putInt(MEM_SET_PCS, SET_PCS);
            Serial.printf("SET_PCS: %.d\n", SET_PCS);
        } else if (SET_MODE == MODE_SETTING) {
            lv_label_set_text_fmt(CURRENT_LABEL, "%s", value);
        }

        preferences.end();

        lv_textarea_set_text(ui_input, "");
        Serial.printf("================================\n");
    }
}

void saveWiFiSetting(lv_event_t *e) {
    preferences.begin(NAME_SPACE, false);

    preferences.putString(MEM_WIFI_SSID, lv_label_get_text(ui_WiFiSSID));
    preferences.putString(MEM_WIFI_PASSWORD, lv_label_get_text(ui_WiFiPassWord));
    preferences.putString(MEM_SERVER_URL, lv_label_get_text(ui_WiFiServerIP));
    preferences.putString(MEM_NTP_SERVER, lv_label_get_text(ui_WiFiNtpServer));

    preferences.end();

    Serial.printf("================================\n");
    ESP.restart();
}

void homePage(lv_event_t *e) { _ui_screen_change(&ui_LoginPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_LoginPage_screen_init); }

void detailsPage(lv_event_t *e) { _ui_screen_change(&ui_DetailsPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_DetailsPage_screen_init); }

void settingPage(lv_event_t *e) {
    if (EmployeeID1 == MEM_PASSWORD_SETTING) {
        _ui_flag_modify(ui_GramPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_PcsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_SettingPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
        SET_MODE = MODE_SETTING;
    }
}

int LOGIN_LABEL_ID = 0;
static lv_obj_t *CURRENT_LOGIN_LABEL = NULL;
void loginKeyboard(lv_event_t *e) {
    _ui_flag_modify(ui_PnLoginKeyboard, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
    lv_obj_t *target = lv_event_get_target(e);
    lv_obj_t *label = lv_obj_get_child(target, 0);
    CURRENT_LOGIN_LABEL = label;

    int labelID = (int)lv_event_get_user_data(e);
    LOGIN_LABEL_ID = labelID;
}

void setEmployeeID(lv_event_t *e) {
    _ui_flag_modify(ui_PnLoginKeyboard, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
    String _EmployeeID = String(lv_textarea_get_text(ui_LoginInput));

    if (_EmployeeID != "") {
        lv_label_set_text(CURRENT_LOGIN_LABEL, _EmployeeID.c_str());
        lv_textarea_set_text(ui_LoginInput, "");

        if (LOGIN_LABEL_ID == SET_EMPLOYEE_ID1) {
            EmployeeID1 = _EmployeeID;
        } else if (LOGIN_LABEL_ID == SET_EMPLOYEE_ID2) {
            EmployeeID2 = _EmployeeID;
        }
    }
}

bool isLogin = false;
void login(lv_event_t *e) {
    if (EmployeeID1 != "") {
        _ui_screen_change(&ui_MainPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_MainPage_screen_init);
        lv_label_set_text(ui_EmployeeID1, EmployeeID1.c_str());
        lv_label_set_text(ui_EmployeeID2, (EmployeeID2.length() > 0 ? EmployeeID2 : "-").c_str());
        isLogin = true;

        SET_MODE = lv_obj_has_state(ui_Mode, LV_STATE_CHECKED);
        setCurrentPage();
    }
}

void logout(lv_event_t *e) {
    _ui_screen_change(&ui_LoginPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_MainPage_screen_init);
    lv_label_set_text(ui_EmployeeIDValue1, "XXXX");
    lv_label_set_text(ui_EmployeeID1, "");
    EmployeeID1 = "";

    lv_label_set_text(ui_EmployeeIDValue2, "XXXX");
    lv_label_set_text(ui_EmployeeID2, "");
    EmployeeID2 = "";

    isLogin = false;

    // รีเซ็ตหน้าหลัก
    lv_label_set_text(ui_CurrentWeight, "000.00");
    lv_obj_set_style_text_color(ui_CurrentWeight, lv_color_hex(0x4D4A4A), LV_PART_MAIN);
    lv_label_set_text(ui_GramResult, "ผ่าน/ไม่ผ่าน");
    lv_obj_set_style_bg_color(ui_LedGramResult, lv_color_hex(0x0C5107), LV_PART_MAIN);

    lv_label_set_text(ui_CurrentPcs, "000");
    lv_obj_set_style_text_color(ui_CurrentPcs, lv_color_hex(0x4D4A4A), LV_PART_MAIN);
    lv_label_set_text(ui_PcsResult, "ผ่าน/ไม่ผ่าน");
    lv_obj_set_style_bg_color(ui_LedPcsResult, lv_color_hex(0x0C5107), LV_PART_MAIN);
}

void balanceTest(String weight) {
    weight.replace("+", "");
    weight.replace("-", "");
    weight.replace("g", "");
    weight.replace("pcs", "");
    weight.trim();

    for (int i = 0; i < weight.length(); i++) {
        if (!isDigit(weight[i]) && weight[i] != '.') {
            lv_obj_set_style_text_color(ui_TestBalanceValue, lv_color_hex(COLOR_RED), LV_PART_MAIN);
            lv_label_set_text(ui_TestBalanceValue, "ERROR");
            isAlert = true;
            return;
        }
    }

    lv_obj_set_style_text_color(ui_TestBalanceValue, lv_color_hex(COLOR_GREEN), LV_PART_MAIN);
    lv_label_set_text(ui_TestBalanceValue, weight.c_str());
    pcf8574.digitalWrite(P0, LOW);
    delay(200);
    pcf8574.digitalWrite(P0, HIGH);
}

void printTest() {
    pcf8574.digitalWrite(P0, LOW);
    delay(200);
    pcf8574.digitalWrite(P0, HIGH);

    printer.setFontSize(LARGE);
    printer.setBold(BOLD_ON);
    printer.setAlign(ALIGN_CENTER);
    printer.highlight(HIGHLIGHT_VERTICAL_HORIZONTALLY_EXPANDED);
    printer.println("PRINT TEST");
    printer.feed(2);

    DateTimeInfo dt = getDateTime();
    printer.setFontSize(NOMAL);
    printer.setBold(BOLD_OFF);
    printer.setAlign(ALIGN_LEFT);
    printer.highlight(HIGHLIGHT_OFF);
    String currentDate = dt.date;
    String currentTime = dt.time;
    printer.println("Date: " + currentDate);
    printer.println("Time: " + currentTime);

    String testPrinterInput = String(lv_label_get_text(ui_TestPrinterInput));
    Serial.println("Test Printer Input: " + testPrinterInput);
    Serial.println("--------------------------------");
    printer.println("Weight Range: " + String(SET_MIN_WEIGHT, 2) + " - " + String(SET_MAX_WEIGHT, 2) + " g.");
    printer.println("Weight:            " + String(testPrinterInput) + " g.");
    printer.println("Operator id 1: " + EmployeeID1);
    printer.println("Operator id 2: " + EmployeeID2);

    printer.feed(1);
    printer.setFontSize(LARGE);
    printer.setBold(BOLD_ON);
    printer.setAlign(ALIGN_CENTER);
    printer.highlight(HIGHLIGHT_VERTICAL_HORIZONTALLY_EXPANDED);
    printer.println("PASS");
    printer.cut();
}

void testing(lv_event_t *e) {
    TestType testType = static_cast<TestType>(reinterpret_cast<int>(lv_event_get_user_data(e)));

    switch (testType) {
    case TEST_ALARM:
        isAlert = true;
        Serial.println("Testing Alarm...");
        break;
    case PRINT_TEST:
        Serial.println("Testing Print...");
        printTest();
        break;
    default:
        Serial.println("Unknown test type!");
        break;
    }
}

void addEventListener() {
    // หน้า Login
    lv_obj_add_event_cb(ui_PnEmployeeID1, loginKeyboard, LV_EVENT_CLICKED, (void *)SET_EMPLOYEE_ID1);
    lv_obj_add_event_cb(ui_PnEmployeeID2, loginKeyboard, LV_EVENT_CLICKED, (void *)SET_EMPLOYEE_ID2);
    lv_obj_add_event_cb(ui_LoginKeyboard, setEmployeeID, LV_EVENT_READY, NULL);
    lv_obj_add_event_cb(ui_Login, login, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Logout, logout, LV_EVENT_CLICKED, NULL);

    lv_obj_add_event_cb(ui_UpdateDetails, updateDetails, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Home, homePage, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Details, detailsPage, LV_EVENT_CLICKED, NULL);

    updateMachineNameTimer = lv_timer_create(updateUiMachine, 100, NULL);

    // หน้าหลัก
    lv_obj_add_event_cb(ui_Mode, selectMode, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_SettingMode, settingPage, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_SetMinWeight, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_NUMBER);
    lv_obj_add_event_cb(ui_SetMaxWeight, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_NUMBER);
    lv_obj_add_event_cb(ui_Keyboard, saveSettings, LV_EVENT_READY, NULL);
    lv_obj_add_event_cb(ui_PrintLogo, setPrinLogo, LV_EVENT_VALUE_CHANGED, NULL);

    lv_obj_add_event_cb(ui_SetPcs, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_NUMBER);
    lv_obj_add_event_cb(ui_PrintPcs, setPrinPcs, LV_EVENT_VALUE_CHANGED, NULL);

    lv_obj_add_event_cb(ui_SetWiFiSSID, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_TEXT_LOWER);
    lv_obj_add_event_cb(ui_SetWiFiPassWord, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_TEXT_LOWER);
    lv_obj_add_event_cb(ui_SetWiFiServerIP, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_TEXT_LOWER);
    lv_obj_add_event_cb(ui_SetWiFiNtpServer, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_TEXT_LOWER);
    lv_obj_add_event_cb(ui_ConfirmWiFiSettings, saveWiFiSetting, LV_EVENT_CLICKED, NULL);

    // Reset count
    lv_obj_add_event_cb(ui_ResetGramCount, resetCount, LV_EVENT_CLICKED, (void *)MODE_GRAM);
    lv_obj_add_event_cb(ui_ResetPcsCount, resetCount, LV_EVENT_CLICKED, (void *)MODE_PCS);

    // Testing
    lv_obj_add_event_cb(ui_TestAlarm1, testing, LV_EVENT_CLICKED, (void *)TEST_ALARM);
    lv_obj_add_event_cb(ui_TestAlarm2, testing, LV_EVENT_CLICKED, (void *)TEST_ALARM);
    lv_obj_add_event_cb(ui_PrintTest, testing, LV_EVENT_CLICKED, (void *)PRINT_TEST);
    lv_obj_add_event_cb(ui_TestPrinterPanel, settings, LV_EVENT_CLICKED, (void *)LV_KEYBOARD_MODE_NUMBER);

    // Factory reset
    lv_obj_add_event_cb(ui_ConfirmFactoryReset, confirmFactoryReset, LV_EVENT_CLICKED, NULL);
}

void copyright() {
    lv_label_set_text(ui_Copyright1, COPYRIGHT);
    lv_label_set_text(ui_Copyright2, COPYRIGHT);
    lv_label_set_text(ui_Copyright3, COPYRIGHT);
    lv_label_set_text(ui_Copyright4, COPYRIGHT);
    lv_label_set_text(ui_Copyright5, COPYRIGHT);
    lv_label_set_text(ui_Copyright6, COPYRIGHT);
    lv_label_set_text(ui_Copyright7, COPYRIGHT);
}

void setup() {
    // ห้ามลบ
    gui_start();
    gfx.setBrightness(244);

    // เริ่มต้นการทำงานของเครื่องพิมพ์
    Serial.begin(115200);
    Serial2.begin(9600, SERIAL_8N1, 17, 18);
    printer.begin();

    snprintf(chipid, 23, "ESP32-%llX", ESP.getEfuseMac());
    Serial.println(chipid);

    loadConfiguration();

    pcf8574.pinMode(P0, OUTPUT);
    copyright();

    // เพิ่ม events
    addEventListener();
    lv_label_set_long_mode(ui_MachineName, LV_LABEL_LONG_SCROLL_CIRCULAR); /*Circular scroll*/

    // เริ่มต้น I2C โดยใช้ SDA = GPIO 19 และ SCL = GPIO 20
    Wire.begin(19, 20);
    rtc.begin();
    xTaskCreatePinnedToCore(wifiConnectTask, "Wifi connect Task", 8000, NULL, 1, NULL, 1);
    xTaskCreatePinnedToCore(handShakeTask, "Handshaking Task", 4096, NULL, 1, &handShakeTaskHandle, 1);
    xTaskCreatePinnedToCore(syncTimeTask, "Sync Time Task", 8000, NULL, 1, &syncTimeTaskHandle, 1);

    // สร้าง Queue ที่สามารถเก็บได้ 5 ชุดข้อมูล
    xSendDataQueue = xQueueCreate(5, sizeof(DataToSend));
    if (xSendDataQueue == NULL) {
        Serial.println("Error creating the queue");
        ESP.restart(); // หรือจัดการ error อย่างเหมาะสม
    }

    dataQueue = xQueueCreate(MAX_QUEUE_SIZE, sizeof(DataToSend *));
    if (dataQueue == NULL) {
        Serial.println("Failed to create queue!");
        while (true)
            ; // Stop the program
    }

    // สร้าง Task สำหรับส่งข้อมูล
    xTaskCreate(processQueueTask, "QueueProcessor", 10000, NULL, 1, &processQueueTaskHandle);

    if (rtc.lostPower()) {
        Serial.println("RTC lost power, setting the time!");
        lv_obj_clear_flag(ui_LowBattery, LV_OBJ_FLAG_HIDDEN);
    }
}

unsigned long printTime = 0;
void loop() {
    lv_timer_handler();
    delay(5);

    if (!runTaskComplete) {
        if (syncWifi) {
            lv_label_set_text_fmt(ui_LoadingLabel, "WiFi connect to ssid: %s", WiFi.SSID());
        }
        if (syncTime) {
            lv_label_set_text(ui_LoadingLabel, "Sync time success");
        }
        if (switchToDetailsPage) {
            _ui_screen_change(&ui_DetailsPage, LV_SCR_LOAD_ANIM_FADE_ON, 500, 0, &ui_DetailsPage_screen_init);
        }
    } else if (isLogin && EmployeeID1 != "") {
        if (Serial.available() && devMode) {
            if (SET_MODE == MODE_GRAM) {
                printWeight(readSerial(Serial));
            } else if (SET_MODE == MODE_PCS) {
                printPcs(readSerial(Serial));
            } else if (SET_MODE == MODE_SETTING) {
                balanceTest(readSerial(Serial));
            } else {
                Serial2.read();
            }
        } else if (Serial2.available()) {
            if (SET_MODE == MODE_GRAM) {
                printWeight(readSerial(Serial2));
            } else if (SET_MODE == MODE_PCS) {
                printPcs(readSerial(Serial2));
            } else if (SET_MODE == MODE_SETTING) {
                balanceTest(readSerial(Serial2));
            } else {
                Serial2.read();
            }
        }

        // แสดงวันที่, เวลา
        if (millis() - printTime >= 1000) {
            DateTimeInfo dt = getDateTime();
            lv_label_set_text(ui_Date, dt.date.c_str());
            lv_label_set_text(ui_Time, dt.time.c_str());
            printTime = millis();
        }
    } else {
        if (Serial.available()) {
            char cmd = Serial.read();
            switch (cmd) {
            case 'D':
                devMode = Serial.parseInt();
                Serial.printf("(DEV SET_MODE)=> %s\n", devMode ? "ON" : "OFF");
                break;
            case 'R':
                Serial.printf("(RESTART)=> .......\n");
                ESP.restart();
                break;
            case 'F':
                Serial.printf("(FACTORY RESET)=> .......\n");
                factoryReset();
                ESP.restart();
                break;
            default:
                break;
            }
        }

        if (Serial2.available()) {
            Serial2.read();
        }
    }

    // แจ้งเตือนเมื่อออกนอกช่วง
    if (isAlert) {
        if (millis() - alertTime >= 500) {
            alertState = !alertState;
            alertTime = millis();
            alertRounds++;
        }

        if (alertRounds == 10) {
            isAlert = false;
            alertState = true;
            alertRounds = 0;
        }

        pcf8574.digitalWrite(P0, alertState);
    }
}
