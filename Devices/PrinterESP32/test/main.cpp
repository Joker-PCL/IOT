#define LGFX_LCD4_3
// #define LGFX_LCD7_0
// #define TOUCH_DEBUG

#include "./gui/gui.h"
#include <Arduino.h>
#include <EEPROM.h>
#include <Wire.h>
#include <lv_conf.h>
#include <lvgl.h>

#include "Printer.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <NTPClient.h>
#include <PCF8574.h>
#include <RTClib.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiUdp.h>

bool devMode = false;

int runTaskTimeOut = 10000;
bool runTaskComplete = false;
bool syncWifi = false;
bool syncTime = false;
bool switchToDetailsPage = false;
TaskHandle_t syncWifiTaskHandle = NULL;      // ตัวแปรเก็บ handle ของ syncWifiTask
TaskHandle_t syncTimeTaskHandle = NULL;      // ตัวแปรเก็บ handle ของ syncTimeTask
TaskHandle_t handShakeTaskTaskHandle = NULL; // ตัวแปรเก็บ handle ของ handShakeTaskTask

char chipid[23];

// ข้อมูล Wi-Fi
WiFiMulti wifiMulti;
// const char *ssid1 = "pcl_plant1";
// const char *ssid2 = "pcl_plant2";
// const char *ssid3 = "pcl_plant3";
// const char *ssid4 = "pcl_plant4";
// const char *ssid5 = "Engineer";
// const char *password = "plant172839";
const char *ssidAT7 = "polipharm-AT7";
const char *passwordAT7 = "511897000";
const char *ssidJoker = "Joker";
const char *passwordJoker = "0992899476";

String EmployeeID1 = "";
String EmployeeID2 = "";
int MODE = 0;
float MIN_WEIGHT = 0.00;
float MAX_WEIGHT = 0.00;
bool PRINT_LOGO = false;
bool PRINT_PCS = false;
int PCS = 0;

// Count
unsigned long COUNT_GRAM_OK = 0;
unsigned long COUNT_GRAM_NG = 0;
unsigned long COUNT_PCS_OK = 0;
unsigned long COUNT_PCS_NG = 0;

// EEPROM
int MODE_ADDRESS = 0;
int MIN_WEIGHT_ADDRESS = 5;
int MAX_WEIGHT_ADDRESS = 10;
int PRINT_LOGO_ADDRESS = 15;
int PRINT_PCS_ADDRESS = 20;
int PCS_ADDRESS = 25;

int COUNT_GRAM_OK_ADDRESS = 30;
int COUNT_GRAM_NG_ADDRESS = 40;
int COUNT_PCS_OK_ADDRESS = 45;
int COUNT_PCS_NG_ADDRESS = 50;

PCF8574 pcf8574(0x20);
bool isAlert = false;
bool alertState = false;
int alertRounds = 0;
long alertTime = 0;

String apiServer = "http://192.168.0.3:3000"; // URL เซิร์ฟเวอร์
const char *ntpUDPServer = "192.168.0.1";     // URL เซิร์ฟเวอร์
String authorizationToken = "";
String machineName = "";

// โครงสร้างเพื่อเก็บข้อมูลที่ต้องการส่ง
struct DataToSend {
    int mode;
    JsonDocument jsonData;
};

// สร้างข้อมูลที่จะส่ง
DataToSend packGramData;
DataToSend packPcsData;

// NTP Client
WiFiUDP ntpUDP;
// ปรับโซนเวลาได้ตามต้องการ (7*3600 สำหรับ UTC+7)
// NTPClient timeClient(ntpUDP, "pool.ntp.org", 7 * 3600, 60000);
NTPClient timeClient(ntpUDP, ntpUDPServer, 7 * 3600, 60000);
RTC_DS3231 rtc;

Printer printer;

struct DateTimeInfo {
    String datetime;
    String date;
    String time;
};

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
#define MODE_GRAM 0
#define MODE_PCS 1
void selectMode(lv_event_t *e) {
    if (e) {
        lv_event_code_t event_code = lv_event_get_code(e);
        lv_obj_t *target = lv_event_get_target(e);
        MODE = lv_obj_has_state(target, LV_STATE_CHECKED);
        EEPROM.writeInt(MODE_ADDRESS, MODE);
        EEPROM.commit();
    }

    if (MODE == MODE_GRAM) {
        lv_label_set_text(ui_ModeLabel, "กรัม");
        _ui_flag_modify(ui_GramPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
        _ui_flag_modify(ui_PcsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
    } else if (MODE == MODE_PCS) {
        _ui_flag_modify(ui_GramPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
        _ui_flag_modify(ui_PcsPanel, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
        lv_label_set_text(ui_ModeLabel, "นับจำนวน");
    }
}

void wifiConnectTask(void *parameter) {
    const TickType_t timeout = pdMS_TO_TICKS(runTaskTimeOut); // Timeout
    TickType_t startTime = xTaskGetTickCount();               // เวลาที่เริ่มต้น task

    WiFi.begin(ssidAT7, passwordAT7);

    Serial.print("Connecting to wifi");
    while (WiFi.status() != WL_CONNECTED) {
        // ตรวจสอบว่า task ทำงานเกิน timeout หรือไม่
        if (xTaskGetTickCount() - startTime > timeout) {
            Serial.println("Timeout: Wifi connect failed!");
            switchToDetailsPage = true; // ตั้งค่าว่า tasks ทั้งหมดเสร็จสิ้น
            vTaskDelay(100 / portTICK_PERIOD_MS);
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
    xTaskNotifyGive(handShakeTaskTaskHandle); // เมื่อเชื่อมต่อสำเร็จแล้ว ให้แจ้ง syncTimeTask
    xTaskNotifyGive(syncTimeTaskHandle);      // เมื่อเชื่อมต่อสำเร็จแล้ว ให้แจ้ง syncTimeTask
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

    // if (rtc.begin())
    //     rtc.adjust(DateTime(timeClient.getEpochTime()));

    if (rtc.lostPower()) {
        Serial.println("RTC lost power, setting the time!");
        timeClient.update();
        rtc.adjust(DateTime(timeClient.getEpochTime()));
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

int updateMachineName = 0;
lv_timer_t *updateMachineNameTimer = NULL;
void updateUiMachine(lv_timer_t *timer) {
    if (updateMachineName == 0) {
        lv_label_set_text(ui_MachineName, "XXXXXXXX");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(0x695C62), 0);
        updateMachineName = -1;
    } else if (updateMachineName == 200) {
        lv_label_set_text(ui_MachineName, machineName.c_str());
        updateMachineName = -1;
    } else if (updateMachineName == 400) {
        lv_label_set_text(ui_MachineName, "Device not registered!");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(0xF4660A), 0);
        updateMachineName = -1;
    } else if (updateMachineName == 404) {
        lv_label_set_text(ui_MachineName, "...OFFLINE...");
        lv_obj_set_style_text_color(ui_MachineName, lv_color_hex(0xF4660A), 0);
        updateMachineName = -1;
    }
}

void handShakeTask(void *parameter) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

    while (true) {
        updateMachineName = 0;

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("Handshaking...");
            // ส่ง GET request ไปที่ server เพื่อส่ง Authorization Token
            HTTPClient http;
            http.begin(apiServer + "/handshake");
            http.addHeader("Content-Type", "application/json");
            // สร้างข้อมูล JSON ที่จะส่ง
            String jsonData = "{\"serial_number\":\"" + String(chipid) + "\"}";

            int httpResponseCode = http.POST(jsonData);

            if (httpResponseCode == 200) {
                String payload = http.getString();
                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, payload);

                // Test if parsing succeeds
                if (error) {
                    Serial.print(F("deserializeJson() failed: "));
                    Serial.println(error.f_str());
                } else {
                    const char *_machineName = doc["machineName"];
                    const char *_authorizationToken = doc["accessToken"];
                    machineName = _machineName;
                    machineName.toUpperCase();
                    authorizationToken = _authorizationToken;
                    updateMachineName = 200;

                    Serial.println("Machine Name: " + machineName);
                    Serial.println("Authorization Token: " + authorizationToken);
                    http.end(); // ปิดการเชื่อมต่อ HTTP
                }

                break;

            } else if (httpResponseCode == 400) {
                updateMachineName = 400;
                Serial.print("Error on sending POST: ");
                Serial.println(httpResponseCode);

                if (handShakeTaskTaskHandle != NULL) {
                    Serial.println("Deleting task...");
                    vTaskDelete(handShakeTaskTaskHandle);
                    handShakeTaskTaskHandle = NULL; // ตั้งค่าเป็น NULL เพื่อป้องกันการใช้ handle ซ้ำ
                }

                break;
            } else {
                continue;
            }
        } else {
            updateMachineName = 404;
            break;
        }
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }

    vTaskDelete(NULL); // ลบ Task นี้หลังจากส่งข้อมูลเสร็จสิ้น
}

// ฟังก์ชัน task สำหรับอัพเดทข้อมูล
void updateDetails(lv_event_t *e) {
    Serial.println("Update details...");
    xTaskCreatePinnedToCore(handShakeTask, "Handshaking Task", 5000, NULL, 1, &handShakeTaskTaskHandle, 1);
    xTaskNotifyGive(handShakeTaskTaskHandle); // เมื่อเชื่อมต่อสำเร็จแล้ว ให้แจ้ง syncTimeTask
}

// ฟังก์ชัน task สำหรับการส่งข้อมูล
void sendDataTask(void *parameter) {
    DataToSend *data = (DataToSend *)parameter; // แปลงพารามิเตอร์ที่ส่งเข้ามาเป็น struct

    if (WiFi.status() == WL_CONNECTED && authorizationToken != "") {
        HTTPClient http;

        // เริ่มการเชื่อมต่อกับ server
        if (data->mode == MODE_GRAM) {
            http.begin(apiServer + "/api/modeGram");
        } else if (data->mode == MODE_PCS) {
            http.begin(apiServer + "/api/modePcs");
        } else {
            http.end();        // ปิดการเชื่อมต่อ HTTP
            vTaskDelete(NULL); // ลบ Task นี้หลังจากส่งข้อมูลเสร็จสิ้น
        }

        // กำหนด header Authorization
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Authorization", String("Bearer ") + authorizationToken);

        // สร้างข้อมูล JSON ที่จะส่ง
        String jsonString;
        serializeJson(data->jsonData, jsonString);
        Serial.println("(Packing data)=> " + jsonString);

        // ส่ง POST request
        int httpResponseCode = http.POST(jsonString);

        // ตรวจสอบผลลัพธ์
        if (httpResponseCode) {
            String response = http.getString();
            Serial.printf("(Status)=> %d\n", httpResponseCode);
            Serial.println("(Response)=> " + response);
        }

        http.end(); // ปิดการเชื่อมต่อ HTTP
    }

    vTaskDelete(NULL); // ลบ Task นี้หลังจากส่งข้อมูลเสร็จสิ้น
}

// อัพเดท Counter
void updateCount(int _mode) {
    if (_mode == MODE_GRAM) {
        lv_label_set_text_fmt(ui_OkGramCount, "%05u", COUNT_GRAM_OK);
        lv_label_set_text_fmt(ui_NgGramCount, "%05u", COUNT_GRAM_NG);
        EEPROM.writeLong(COUNT_GRAM_OK_ADDRESS, COUNT_GRAM_OK);
        EEPROM.writeLong(COUNT_GRAM_NG_ADDRESS, COUNT_GRAM_NG);
        Serial.printf("(COUNT_GRAM)=> OK: %u, NG: %u\n", COUNT_GRAM_OK, COUNT_GRAM_NG);
    } else if (_mode == MODE_PCS) {
        lv_label_set_text_fmt(ui_OkPcsCount, "%05u", COUNT_PCS_OK);
        lv_label_set_text_fmt(ui_NgPcsCount, "%05u", COUNT_PCS_NG);
        EEPROM.writeLong(COUNT_PCS_OK_ADDRESS, COUNT_PCS_OK);
        EEPROM.writeLong(COUNT_PCS_NG_ADDRESS, COUNT_PCS_NG);
        Serial.printf("(COUNT_PCS)=> OK: %u, NG: %u\n", COUNT_PCS_OK, COUNT_PCS_NG);
    }

    lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที
    EEPROM.commit();
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
        if (readFloat < MIN_WEIGHT || readFloat > MAX_WEIGHT) {
            lv_obj_set_style_bg_color(ui_LedGramResult, lv_color_hex(0xE50202), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentWeight, lv_color_hex(0xE50202), LV_PART_MAIN);
            lv_label_set_text(ui_GramResult, "ไม่ผ่าน");
            isAlert = true;
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที
            COUNT_GRAM_NG++;
            _result = "FAIL";
        } else {
            lv_obj_set_style_bg_color(ui_LedGramResult, lv_color_hex(0x0FB301), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentWeight, lv_color_hex(0x0FB301), LV_PART_MAIN);
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

            printer.println("Weight Range: " + String(MIN_WEIGHT, 2) + " - " + String(MAX_WEIGHT, 2) + " g.");
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
        JsonDocument doc;
        doc["timestamp"] = dt.datetime;
        doc["serial_number"] = String(chipid);
        doc["operator1"] = EmployeeID1.toInt();
        doc["operator2"] = EmployeeID2.toInt();
        doc["min_weight"] = MIN_WEIGHT;
        doc["max_weight"] = MAX_WEIGHT;
        doc["weight"] = readFloat;
        doc["result"] = _result;

        packPcsData.mode = MODE;
        packGramData.jsonData = doc;

        // สร้าง Task แยกเพื่อส่งข้อมูล
        xTaskCreate(sendDataTask,   // ฟังก์ชัน task ที่จะเรียก
                    "SendDataTask", // ชื่อของ task
                    5000,           // ขนาด stack (สามารถปรับขนาดได้ตามความเหมาะสม)
                    &packGramData,  // ส่ง struct data ไปเป็นพารามิเตอร์
                    1,              // ระดับความสำคัญของ task
                    NULL            // Handle ของ task (ไม่จำเป็นต้องใช้)
        );
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
        if (readInt != PCS) {
            lv_obj_set_style_bg_color(ui_LedPcsResult, lv_color_hex(0xE50202), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentPcs, lv_color_hex(0xE50202), LV_PART_MAIN);
            lv_label_set_text(ui_PcsResult, "ไม่ผ่าน");
            isAlert = true;
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที

            COUNT_PCS_NG++;
            _result = "FAIL";
        } else {
            lv_obj_set_style_bg_color(ui_LedPcsResult, lv_color_hex(0x0FB301), LV_PART_MAIN);
            lv_obj_set_style_text_color(ui_CurrentPcs, lv_color_hex(0x0FB301), LV_PART_MAIN);
            lv_label_set_text(ui_PcsResult, "ผ่าน");
            lv_refr_now(NULL); // อัพเดทหน้าจอทั้งหมดทันที

            COUNT_PCS_OK++;
            _result = "PASS";

            pcf8574.digitalWrite(P0, LOW);
            delay(200);
            pcf8574.digitalWrite(P0, HIGH);

            if (PRINT_PCS) {
                printer.reset();

                printer.setAlign(ALIGN_LEFT);
                String currentDate = dt.date;
                String currentTime = dt.time;
                printer.println("Date: " + currentDate + " Time: " + currentTime);

                printer.print("Oper: " + EmployeeID1);
                printer.println(", Count: " + String(readInt) + " PCS");
                printer.cut();

                // printer.println("Date: " + currentDate);
                // printer.println("Time: " + currentTime);
                // printer.println("Operator id 1: " + EmployeeID1);
                // printer.println("Operator id 2: " + EmployeeID2);

                // printer.feed(1);
                // printer.setFontSize(LARGE);
                // printer.setBold(BOLD_ON);
                // printer.setAlign(ALIGN_CENTER);
                // printer.highlight(HIGHLIGHT_VERTICAL_HORIZONTALLY_EXPANDED);
                // printer.println(String(readInt) + " PCS");
                // printer.cut();
            }
        }

        updateCount(MODE_PCS);

        JsonDocument doc;
        doc["timestamp"] = dt.datetime;
        doc["serial_number"] = String(chipid);
        doc["operator1"] = EmployeeID1.toInt();
        doc["operator2"] = EmployeeID2.toInt();
        doc["primary_pcs"] = PCS;
        doc["pcs"] = readInt;
        doc["result"] = _result;

        packPcsData.mode = MODE;
        packPcsData.jsonData = doc;

        // สร้าง Task แยกเพื่อส่งข้อมูล
        xTaskCreatePinnedToCore(sendDataTask, "SendDataTask", 5000, &packPcsData, 1, NULL, 1);
    }
}

// โหลดข้อมูลการตั้งค่า
void loadConfiguration() {
    int GET_MODE = EEPROM.readInt(MODE_ADDRESS);
    float GET_MIN_WEIGHT = EEPROM.readFloat(MIN_WEIGHT_ADDRESS);
    float GET_MAX_WEIGHT = EEPROM.readFloat(MAX_WEIGHT_ADDRESS);
    bool GET_PRINT_LOGO = EEPROM.readBool(PRINT_LOGO_ADDRESS);
    bool GET_PRINT_PCS = EEPROM.readBool(PRINT_PCS_ADDRESS);
    int GET_PCS = EEPROM.readInt(PCS_ADDRESS);

    COUNT_GRAM_OK = EEPROM.readULong(COUNT_GRAM_OK_ADDRESS);
    COUNT_GRAM_NG = EEPROM.readULong(COUNT_GRAM_NG_ADDRESS);
    COUNT_PCS_OK = EEPROM.readULong(COUNT_PCS_OK_ADDRESS);
    COUNT_PCS_NG = EEPROM.readULong(COUNT_PCS_NG_ADDRESS);

    MODE = GET_MODE < 0 ? 0 : GET_MODE;
    MIN_WEIGHT = GET_MIN_WEIGHT < 0 ? 0.00 : GET_MIN_WEIGHT;
    MAX_WEIGHT = GET_MAX_WEIGHT < 0 ? 0.00 : GET_MAX_WEIGHT;
    PRINT_LOGO = GET_PRINT_LOGO;
    PRINT_PCS = GET_PRINT_PCS;
    PCS = GET_PCS < 0 ? 0 : GET_PCS;

    Serial.println("Read EEPROM settings:");
    Serial.printf("MODE: %d\n", MODE);
    Serial.printf("MIN_WEIGHT: %.2f\n", MIN_WEIGHT);
    Serial.printf("MAX_WEIGHT: %.2f\n", MAX_WEIGHT);
    Serial.printf("PRINT_LOGO: %d\n", PRINT_LOGO);
    Serial.printf("PRINT_PCS: %d\n", PRINT_PCS);
    Serial.printf("PCS: %d\n", PCS);
    Serial.printf("COUNT_GRAM_OK: %u\n", COUNT_GRAM_OK);
    Serial.printf("COUNT_GRAM_NG: %u\n", COUNT_GRAM_NG);
    Serial.printf("COUNT_PCS_OK: %u\n", COUNT_PCS_OK);
    Serial.printf("COUNT_PCS_NG: %u\n", COUNT_PCS_NG);
    Serial.printf("================================\n");

    if (MODE)
        lv_obj_add_state(ui_Mode, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_Mode, LV_STATE_DEFAULT);

    selectMode(NULL);
    lv_label_set_text_fmt(ui_MinWeight, "%.2f", MIN_WEIGHT);
    lv_label_set_text_fmt(ui_MaxWeight, "%.2f", MAX_WEIGHT);
    lv_label_set_text_fmt(ui_PcsMonitor, "%d", PCS);
    if (PRINT_LOGO)
        lv_obj_add_state(ui_PrintLogo, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_PrintLogo, LV_STATE_DEFAULT);

    if (PRINT_PCS)
        lv_obj_add_state(ui_PrintPcs, LV_STATE_CHECKED);
    else
        lv_obj_add_state(ui_PrintPcs, LV_STATE_DEFAULT);

    // Update count
    lv_label_set_text_fmt(ui_OkGramCount, "%05u", COUNT_GRAM_OK);
    lv_label_set_text_fmt(ui_NgGramCount, "%05u", COUNT_GRAM_NG);
    lv_label_set_text_fmt(ui_OkPcsCount, "%05u", COUNT_PCS_OK);
    lv_label_set_text_fmt(ui_NgPcsCount, "%05u", COUNT_PCS_NG);
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

    Serial.printf("(Received data) => %s\n", readString);
    return readString;
}

static lv_obj_t *CURRENT_LABEL = NULL;
static void settings(lv_event_t *e) {
    _ui_flag_modify(ui_PNKEYBOARD, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_REMOVE);
    lv_obj_t *target = lv_event_get_target(e);
    lv_obj_t *label = lv_obj_get_child(target, 0);
    const char *value = lv_label_get_text(label);
    if (value[0])
        lv_textarea_set_text(ui_input, value);

    CURRENT_LABEL = label;
}

void setPrinLogo(lv_event_t *e) {
    PRINT_LOGO = lv_obj_has_state(ui_PrintLogo, LV_STATE_CHECKED);
    Serial.printf("PRINT_LOGO: %s\n", PRINT_LOGO ? "ON" : "OFF");
    Serial.printf("================================\n");
    EEPROM.writeBool(PRINT_LOGO_ADDRESS, PRINT_LOGO);
    EEPROM.commit();
}

void setPrinPcs(lv_event_t *e) {
    PRINT_PCS = lv_obj_has_state(ui_PrintPcs, LV_STATE_CHECKED);
    Serial.printf("PRINT_PCS: %s\n", PRINT_PCS ? "ON" : "OFF");
    Serial.printf("================================\n");
    EEPROM.writeBool(PRINT_PCS_ADDRESS, PRINT_PCS);
    EEPROM.commit();
}

void saveSettings(lv_event_t *e) {
    _ui_flag_modify(ui_PNKEYBOARD, LV_OBJ_FLAG_HIDDEN, _UI_MODIFY_FLAG_ADD);
    const char *value = lv_textarea_get_text(ui_input);
    if (CURRENT_LABEL != NULL) {
        if (MODE == MODE_GRAM) {
            lv_label_set_text_fmt(CURRENT_LABEL, "%.2f", String(value).toFloat());
            MIN_WEIGHT = String(lv_label_get_text(ui_MinWeight)).toFloat();
            MAX_WEIGHT = String(lv_label_get_text(ui_MaxWeight)).toFloat();

            EEPROM.writeFloat(MIN_WEIGHT_ADDRESS, MIN_WEIGHT);
            EEPROM.writeFloat(MAX_WEIGHT_ADDRESS, MAX_WEIGHT);
            Serial.printf("MIN_WEIGHT: %.2f, ", MIN_WEIGHT);
            Serial.printf("MAX_WEIGHT: %.2f\n", MAX_WEIGHT);
        } else if (MODE == MODE_PCS) {
            lv_label_set_text_fmt(CURRENT_LABEL, "%d", String(value).toInt());
            PCS = String(lv_label_get_text(ui_PcsMonitor)).toInt();
            EEPROM.writeInt(PCS_ADDRESS, PCS);
            Serial.printf("PCS: %.d\n", PCS);
        }

        lv_textarea_set_text(ui_input, "");
        Serial.printf("================================\n");
        EEPROM.commit();
    }
}

void homePage(lv_event_t *e) {
    lv_timer_del(updateMachineNameTimer);
    _ui_screen_change(&ui_LoginPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_LoginPage_screen_init);
}

#define EMPLOYEE_ID1 0
#define EMPLOYEE_ID2 1
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

        if (LOGIN_LABEL_ID == EMPLOYEE_ID1) {
            EmployeeID1 = _EmployeeID;
        } else if (LOGIN_LABEL_ID == EMPLOYEE_ID2) {
            EmployeeID2 = _EmployeeID;
        }
    }
}

bool isLogin = false;
void login(lv_event_t *e) {
    if (EmployeeID1 != "") {
        _ui_screen_change(&ui_MainPage, LV_SCR_LOAD_ANIM_NONE, 0, 0, &ui_MainPage_screen_init);
        lv_label_set_text(ui_EmployeeID1, EmployeeID1.c_str());
        lv_label_set_text(ui_EmployeeID2, EmployeeID2.c_str());
        isLogin = true;
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

void addEventListener() {
    // หน้า Login
    lv_obj_add_event_cb(ui_PnEmployeeID1, loginKeyboard, LV_EVENT_CLICKED, (void *)EMPLOYEE_ID1);
    lv_obj_add_event_cb(ui_PnEmployeeID2, loginKeyboard, LV_EVENT_CLICKED, (void *)EMPLOYEE_ID2);
    lv_obj_add_event_cb(ui_LoginKeyboard, setEmployeeID, LV_EVENT_READY, NULL);
    lv_obj_add_event_cb(ui_Login, login, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Logout, logout, LV_EVENT_CLICKED, NULL);

    lv_obj_add_event_cb(ui_UpdateDetails, updateDetails, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Home, homePage, LV_EVENT_CLICKED, NULL);

    // หน้าหลัก
    lv_obj_add_event_cb(ui_Mode, selectMode, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_SetMinWeight, settings, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_SetMaxWeight, settings, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_Keyboard, saveSettings, LV_EVENT_READY, NULL);
    lv_obj_add_event_cb(ui_PrintLogo, setPrinLogo, LV_EVENT_VALUE_CHANGED, NULL);

    lv_obj_add_event_cb(ui_SetPcs, settings, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(ui_PrintPcs, setPrinPcs, LV_EVENT_VALUE_CHANGED, NULL);

    // Reset count
    lv_obj_add_event_cb(ui_ResetGramCount, resetCount, LV_EVENT_CLICKED, (void *)MODE_GRAM);
    lv_obj_add_event_cb(ui_ResetPcsCount, resetCount, LV_EVENT_CLICKED, (void *)MODE_PCS);
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

    EEPROM.begin(50);
    loadConfiguration();

    pcf8574.pinMode(P0, OUTPUT);

    // เพิ่ม events
    addEventListener();
    lv_label_set_long_mode(ui_MachineName, LV_LABEL_LONG_SCROLL_CIRCULAR); /*Circular scroll*/
    updateMachineNameTimer = lv_timer_create(updateUiMachine, 100, NULL);

    // เริ่มต้น I2C โดยใช้ SDA = GPIO 19 และ SCL = GPIO 20
    Wire.begin(19, 20);
    rtc.begin();
    xTaskCreatePinnedToCore(wifiConnectTask, "Wifi connect Task", 5000, NULL, 1, NULL, 1);
    xTaskCreatePinnedToCore(handShakeTask, "Handshaking Task", 5000, NULL, 1, &handShakeTaskTaskHandle, 1);
    xTaskCreatePinnedToCore(syncTimeTask, "Sync Time Task", 5000, NULL, 1, &syncTimeTaskHandle, 1);
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
            lv_label_set_text(ui_SerialNumber, chipid);
            _ui_screen_change(&ui_DetailsPage, LV_SCR_LOAD_ANIM_FADE_ON, 500, 0, &ui_DetailsPage_screen_init);
        }
    } else if (isLogin && EmployeeID1 != "") {
        if (Serial.available() && devMode) {
            if (MODE == MODE_GRAM) {
                printWeight(readSerial(Serial));
            } else if (MODE == MODE_PCS) {
                printPcs(readSerial(Serial));
            }
        } else if (Serial2.available()) {
            if (MODE == MODE_GRAM) {
                printWeight(readSerial(Serial2));
            } else if (MODE == MODE_PCS) {
                printPcs(readSerial(Serial2));
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
                Serial.printf("(DEV MODE)=> %s\n", devMode ? "ON" : "OFF");
                break;
            case 'R':
                Serial.printf("(RESTART)=> .......");
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
