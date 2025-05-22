/* Heltec Automation LoRaWAN communication example
 *
 * Function:
 * 1. Upload node data to the server using the standard LoRaWAN protocol.
 * 2. The network access status of LoRaWAN is displayed on the screen.
 *
 * Description:
 * 1. Communicate using LoRaWAN protocol.
 *
 * HelTec AutoMation, Chengdu, China
 * 成都惠利特自动化科技有限公司
 * www.heltec.org
 *
 * this project also realess in GitHub:
 * https://github.com/Heltec-Aaron-Lee/WiFi_Kit_series
 * */
#include "HT_SSD1306Wire.h"
#include <LoRaWan_APP.h>
#include <ModbusMaster.h>
#include <Wire.h>

// กำหนดพิน RX, TX ของ RS485 Module
#define RS485_TX 3
#define RS485_RX 2
#define RS485_DE 4 // DE และ RE ควบคุมทิศทางการส่งข้อมูล

// ตำแหน่งทศนิยม
#define DECIMAL_GWH 6
#define DECIMAL_KWH 2
#define DECIMAL_VOLTAGE 2
#define DECIMAL_AMP 3
#define DECIMAL_HZ 2

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64,
                           RST_OLED); // addr , freq , i2c group , resolution , rst

ModbusMaster node;

/* OTAA para*/
// อาคาร 5
// uint8_t devEui[] = {0x6A, 0x34, 0xBD, 0x69, 0x5B, 0x27, 0x5C, 0x93};
// uint8_t appEui[] = {0x29, 0x30, 0x93, 0xD6, 0x66, 0x2C, 0xBB, 0x60};
// uint8_t appKey[] = {0xBB, 0xB0, 0xDA, 0x25, 0x87, 0x5A, 0x54, 0xA4,
//                     0xE0, 0x2A, 0x19, 0x3E, 0xF8, 0x68, 0x3B, 0x86};

// uint8_t devEui[] = {0xB6, 0x98, 0x92, 0xE9, 0x55, 0xEA, 0x6A, 0xA5};
// uint8_t appEui[] = {0xA2, 0xB3, 0x27, 0x54, 0x77, 0x48, 0xD1, 0xB9};
// uint8_t appKey[] = {0x4A, 0xAC, 0x69, 0x0A, 0xC5, 0x5A, 0x86, 0x0C,
//                     0xC9, 0x26, 0xAC, 0x77, 0x7B, 0xD8, 0xA5, 0x36};

// uint8_t devEui[] = {0xD3, 0xBF, 0x7D, 0x27, 0xDF, 0x06, 0x45, 0xB6};
// uint8_t appEui[] = {0x58, 0x4A, 0x0D, 0x23, 0x2F, 0x98, 0x10, 0x4B};
// uint8_t appKey[] = {0xB9, 0x4A, 0x32, 0xDE, 0x16, 0xC8, 0x1B, 0x96,
//                     0x66, 0xBE, 0xC1, 0x0D, 0x6C, 0x37, 0x89, 0x4E};

// TEST-SIGNAL
uint8_t devEui[] = {0xE7, 0x11, 0xC0, 0x76, 0x3E, 0x35, 0x45, 0xF8};
uint8_t appEui[] = {0xAE, 0x60, 0xDE, 0x92, 0x7D, 0x7D, 0x69, 0xCC};
uint8_t appKey[] = {0x92, 0x8E, 0xF7, 0xC7, 0xB9, 0x7F, 0x3C, 0xD1,
                    0xAF, 0xE4, 0xE7, 0xE4, 0xFA, 0x47, 0xE2, 0x5C};

/* ABP para*/
uint8_t nwkSKey[] = {0x15, 0xb1, 0xd0, 0xef, 0xa4, 0x63, 0xdf, 0xbe,
                     0x3d, 0x11, 0x18, 0x1e, 0x1e, 0xc7, 0xda, 0x85};
uint8_t appSKey[] = {0xd7, 0x2c, 0x78, 0x75, 0x8c, 0xdc, 0xca, 0xbf,
                     0x55, 0xee, 0x4a, 0x77, 0x8d, 0x16, 0xef, 0x67};
uint32_t devAddr = (uint32_t)0x007e6ae1;

/*LoraWan channelsmask*/
uint16_t userChannelsMask[6] = {0x00FF, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000};

/*LoraWan region, select in arduino IDE tools*/
LoRaMacRegion_t loraWanRegion = ACTIVE_REGION;

/*LoraWan Class, Class A and Class C are supported*/
DeviceClass_t loraWanClass = CLASS_C;

/*the application data transmission duty cycle.  value in [ms].*/
uint32_t appTxDutyCycle = 60000;

/*OTAA or ABP*/
bool overTheAirActivation = true;

/*ADR enable*/
bool loraWanAdr = false;

/* Indicates if the node is sending confirmed or unconfirmed messages */
bool isTxConfirmed = true;

/* Application port */
uint8_t appPort = 2;
/*!
 * Number of trials to transmit the frame, if the LoRaMAC layer did not
 * receive an acknowledgment. The MAC performs a datarate adaptation,
 * according to the LoRaWAN Specification V1.0.2, chapter 18.4, according
 * to the following table:
 *
 * Transmission nb | Data Rate
 * ----------------|-----------
 * 1 (first)       | DR
 * 2               | DR
 * 3               | max(DR-1,0)
 * 4               | max(DR-1,0)
 * 5               | max(DR-2,0)
 * 6               | max(DR-2,0)
 * 7               | max(DR-3,0)
 * 8               | max(DR-3,0)
 *
 * Note, that if NbTrials is set to 1 or 2, the MAC will not decrease
 * the datarate, in case the LoRaMAC layer did not receive an acknowledgment
 */
uint8_t confirmedNbTrials = 4;

struct {
    const char *name;
    uint16_t reg;
    uint8_t numberByte;
    uint8_t decimal;
} registers_2byte_member[] = {
    {"Max Voltage A-B", 0x402c, 2, DECIMAL_VOLTAGE},
    {"Max Voltage B-C", 0x402e, 2, DECIMAL_VOLTAGE},
    {"Max Voltage C-A", 0x4030, 2, DECIMAL_VOLTAGE},
    {"Max Voltage A-N", 0x4000, 2, DECIMAL_VOLTAGE},
    {"Max Voltage B-N", 0x4002, 2, DECIMAL_VOLTAGE},
    {"Max Voltage C-N", 0x4004, 2, DECIMAL_VOLTAGE},
    {"Max Voltage L-L Avg", 0x4034, 2, DECIMAL_VOLTAGE},
    {"Max Voltage L-N Avg", 0x4032, 2, DECIMAL_VOLTAGE},
    // {"Current A", 0x4006, 2, DECIMAL_AMP},
    // {"Current B", 0x4008, 2, DECIMAL_AMP},
    // {"Current C", 0x400a, 2, DECIMAL_AMP},
    {"Current N", 0x4094, 2, DECIMAL_AMP},
    {"Current Avg", 0x400c, 2, DECIMAL_AMP},
    // {"Active Power A", 0x400e, 2, DECIMAL_KWH},
    // {"Active Power B", 0x4010, 2, DECIMAL_KWH},
    // {"Active Power C", 0x4012, 2, DECIMAL_KWH},
    {"Active Power Total", 0x4038, 2, DECIMAL_KWH},
    {"Frequency", 0x4036, 2, DECIMAL_HZ},
};

struct {
    const char *name;
    uint16_t reg;
    uint8_t numberByte;
    uint8_t decimal;
} registers_4byte_member[] = {
    {"Active Energy Delivered (Into Load)", 0x4078, 4, 0},
};

// ฟังก์ชันอ่านค่าแรงดันและเข้ารหัส
uint16_t readAndEncode2byteRegisters(uint16_t reg) {
    uint8_t result = node.readHoldingRegisters(reg, 2); // อ่าน 2 รีจิสเตอร์

    if (result == node.ku8MBSuccess) {
        uint16_t rawData[2];
        rawData[0] = node.getResponseBuffer(0);
        rawData[1] = node.getResponseBuffer(1);

        uint32_t combined = (rawData[0] << 16) | rawData[1]; // รวมข้อมูลเป็น 32-bit

        return (uint16_t)combined;
    } else {
        Serial.println("Error reading registers!");
        return 0; // คืนค่าเริ่มต้น
    }
}

// ฟังก์ชันอ่านค่าแรงดันและเข้ารหัส
uint32_t readAndEncode4byteRegisters(uint16_t reg) {
    uint8_t result = node.readHoldingRegisters(reg, 2); // อ่าน 2 รีจิสเตอร์

    if (result == node.ku8MBSuccess) {
        uint16_t rawData[2];
        rawData[0] = node.getResponseBuffer(0);
        rawData[1] = node.getResponseBuffer(1);

        uint32_t combined = (rawData[0] << 16) | rawData[1]; // รวมข้อมูลเป็น 32-bit

        return (uint32_t)combined;
    } else {
        Serial.println("Error reading registers!");
        return 0; // คืนค่าเริ่มต้น
    }
}

// ฟังก์ชันสำหรับเตรียมข้อมูลที่จะส่ง
static void prepareTxFrame(uint8_t port) {
    /*appData size is LORAWAN_APP_DATA_MAX_SIZE which is defined in "commissioning.h".
     *appDataSize max value is LORAWAN_APP_DATA_MAX_SIZE.
     *if enabled AT, don't modify LORAWAN_APP_DATA_MAX_SIZE, it may cause system hanging or failure.
     *if disabled AT, LORAWAN_APP_DATA_MAX_SIZE can be modified, the max value is reference to
     *lorawan region and SF. for example, if use REGION_CN470, the max value for different DR can be
     *found in MaxPayloadOfDatarateCN470 refer to DataratesCN470 and BandwidthsCN470 in
     *"RegionCN470.h".
     */
    appDataSize = 50;
    for (int i = 0; i < appDataSize; i++) {
        appData[i] = i;
    }
}

static void prepareTxFrameTest(uint8_t port) {
    Serial.println("Reading Modbus Registers...");
    uint8_t index = 0;
    uint8_t reg_number = 1;

    // อ่านค่าพลังงานไฟฟ้า
    for (int i = 0; i < (sizeof(registers_4byte_member) / sizeof(registers_4byte_member[0])); i++) {
        // ใช้ฟังก์ชัน readAndEncode4byteRegisters ที่ถูกต้อง
        uint32_t encodedValue = readAndEncode4byteRegisters(registers_4byte_member[i].reg);

        // ปริ้นค่าของ data
        Serial.printf("%d=> name: %s, encodedValue: %d\n", reg_number,
                      registers_4byte_member[i].name, encodedValue);

        // เก็บค่าใน appData
        appData[index++] = registers_4byte_member[i].numberByte; // บิตแรกเป็น numberByte
        appData[index++] = registers_4byte_member[i].decimal;    // บิตที่สองเป็น decimal

        // แยก encodedValue (32-bit) ออกเป็น 4 ไบต์และเก็บลงใน appData
        appData[index++] = (encodedValue >> 24) & 0xFF; // ไบต์ที่ 1 (MSB)
        appData[index++] = (encodedValue >> 16) & 0xFF; // ไบต์ที่ 2
        appData[index++] = (encodedValue >> 8) & 0xFF;  // ไบต์ที่ 3
        appData[index++] = encodedValue & 0xFF;         // ไบต์ที่ 4 (LSB)
        reg_number++;
    }

    // อ่านค่า แรงดันไฟฟ้าแต่ละเฟส, กระแสไฟฟ้าแต่ละเฟส
    for (int i = 0; i < (sizeof(registers_2byte_member) / sizeof(registers_2byte_member[0])); i++) {
        // ใช้ฟังก์ชัน readAndEncode2byteRegisters ที่ถูกต้อง
        uint16_t encodedValue = readAndEncode2byteRegisters(registers_2byte_member[i].reg);

        // ปริ้นค่าของ data
        Serial.printf("%d=> name: %s, encodedValue: %d\n", reg_number,
                      registers_2byte_member[i].name, encodedValue);

        // เก็บค่าใน appData
        appData[index++] = registers_2byte_member[i].numberByte; // บิตแรกเป็น numberByte
        appData[index++] = registers_2byte_member[i].decimal;    // บิตที่สองเป็น decimal

        // แยก encodedValue (16-bit) ออกเป็น 2 ไบต์และเก็บลงใน appData
        appData[index++] = (encodedValue >> 8) & 0xFF; // ไบต์ที่ 3 (MSB)
        appData[index++] = encodedValue & 0xFF;        // ไบต์ที่ 4 (LSB)
        reg_number++;
    }

    appDataSize = index; // ขนาดข้อมูล payload
    Serial.printf("Data size: %d Byte\n", appDataSize);
}

void preTransmission() {
    digitalWrite(RS485_DE, HIGH); // เปิดโหมดส่งข้อมูล
}

void postTransmission() {
    digitalWrite(RS485_DE, LOW); // กลับไปโหมดรับข้อมูล
}

// Vext default ON
void VextON(void) {
    pinMode(Vext, OUTPUT);
    digitalWrite(Vext, LOW);
}

// Vext default OFF
void VextOFF(void) {
    pinMode(Vext, OUTPUT);
    digitalWrite(Vext, HIGH);
}

RTC_DATA_ATTR bool firstrun = true;
void setup() {
    Serial.begin(115200);                                // สำหรับ Debugging
    Serial1.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX); // UART สำหรับ RS485

    Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);

    if (firstrun) {
        LoRaWAN.displayMcuInit();
        firstrun = false;
    }

    VextON();
    delay(100);

    // Initialising the UI will init the display too.
    display.init();
    // Font Demo1
    // create more fonts at http://oleddisplay.squix.ch/
    display.setFont(ArialMT_Plain_16);
    display.drawString(15, 5, "POLIPHARM");
    display.setFont(ArialMT_Plain_10);
    display.drawString(5, 50, "CREATE BY ENGENEER");
    display.display();
    delay(5000);
    display.resetDisplay();

    pinMode(RS485_DE, OUTPUT);
    digitalWrite(RS485_DE, LOW);

    node.begin(1, Serial1); // ตั้งค่า Modbus Slave ID = 1
    node.preTransmission(preTransmission);
    node.postTransmission(postTransmission);
}

void loop() {
    switch (deviceState) {
    case DEVICE_STATE_INIT: {
#if (LORAWAN_DEVEUI_AUTO)
        LoRaWAN.generateDeveuiByChipID();
#endif
        LoRaWAN.init(loraWanClass, loraWanRegion);
        // both set join DR and DR when ADR off
        LoRaWAN.setDefaultDR(0);
        break;
    }
    case DEVICE_STATE_JOIN: {
        LoRaWAN.displayJoining();
        LoRaWAN.join();
        break;
    }
    case DEVICE_STATE_SEND: {
        LoRaWAN.displaySending();
        prepareTxFrame(appPort);
        LoRaWAN.send();
        deviceState = DEVICE_STATE_CYCLE;
        break;
    }
    case DEVICE_STATE_CYCLE: {
        // Schedule next packet transmission
        txDutyCycleTime = appTxDutyCycle + randr(-APP_TX_DUTYCYCLE_RND, APP_TX_DUTYCYCLE_RND);
        LoRaWAN.cycle(txDutyCycleTime);
        deviceState = DEVICE_STATE_SLEEP;
        break;
    }
    case DEVICE_STATE_SLEEP: {
        LoRaWAN.displayAck();
        LoRaWAN.sleep(loraWanClass);
        break;
    }
    default: {
        deviceState = DEVICE_STATE_INIT;
        break;
    }
    }
}
