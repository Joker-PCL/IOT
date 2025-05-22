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
#include <LoRaWan_APP.h>
#include <CayenneLPP.h>
#include <ModbusMaster.h>

// กำหนดพิน RX, TX ของ RS485 Module
#define RS485_TX 3
#define RS485_RX 2
#define RS485_DE 4  // DE และ RE ควบคุมทิศทางการส่งข้อมูล

ModbusMaster node;

/* OTAA para*/
uint8_t devEui[] = { 0x7C, 0xB4, 0x9E, 0xE3, 0x4D, 0x22, 0x8E, 0xE8 };
uint8_t appEui[] = { 0x7A, 0x3E, 0x76, 0x8A, 0xF6, 0x78, 0x52, 0xF4 };
uint8_t appKey[] = { 0x61, 0x12, 0x34, 0xA0, 0xDC, 0x0C, 0xD7, 0x67, 0xE1, 0x07, 0x42, 0x3D, 0x3C, 0x07, 0xCC, 0x94 };

/* ABP para*/
uint8_t nwkSKey[] = { 0x15, 0xb1, 0xd0, 0xef, 0xa4, 0x63, 0xdf, 0xbe, 0x3d, 0x11, 0x18, 0x1e, 0x1e, 0xc7, 0xda, 0x85 };
uint8_t appSKey[] = { 0xd7, 0x2c, 0x78, 0x75, 0x8c, 0xdc, 0xca, 0xbf, 0x55, 0xee, 0x4a, 0x77, 0x8d, 0x16, 0xef, 0x67 };
uint32_t devAddr = (uint32_t)0x007e6ae1;

/*LoraWan channelsmask*/
uint16_t userChannelsMask[6] = { 0x00FF, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000 };

/*LoraWan region, select in arduino IDE tools*/
LoRaMacRegion_t loraWanRegion = ACTIVE_REGION;

/*LoraWan Class, Class A and Class C are supported*/
DeviceClass_t loraWanClass = CLASS_C;

/*the application data transmission duty cycle.  value in [ms].*/
uint32_t appTxDutyCycle = 15000;

/*OTAA or ABP*/
bool overTheAirActivation = true;

/*ADR enable*/
bool loraWanAdr = true;


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

void preTransmission() {
  digitalWrite(RS485_DE, HIGH);  // เปิดโหมดส่งข้อมูล
}

void postTransmission() {
  digitalWrite(RS485_DE, LOW);  // กลับไปโหมดรับข้อมูล
}

float readVoltage(uint16_t reg) {
  uint8_t result = node.readHoldingRegisters(reg - 1, 2);  // อ่าน 2 รีจิสเตอร์

  if (result == node.ku8MBSuccess) {
    uint16_t rawData[2];
    rawData[0] = node.getResponseBuffer(0);
    rawData[1] = node.getResponseBuffer(1);

    uint32_t combined = (rawData[0] << 16) | rawData[1];  // รวมข้อมูลเป็น 32-bit
    float voltage;
    memcpy(&voltage, &combined, sizeof(voltage));  // แปลงเป็น float

    return voltage;
  } else {
    Serial.println("Error reading voltage!");
    return -1.0;
  }
}

int64_t readEnergy(uint16_t reg) {
  uint8_t result = node.readHoldingRegisters(reg - 1, 4);  // อ่าน 4 รีจิสเตอร์

  if (result == node.ku8MBSuccess) {
    uint16_t rawData[4];
    rawData[0] = node.getResponseBuffer(0);
    rawData[1] = node.getResponseBuffer(1);
    rawData[2] = node.getResponseBuffer(2);
    rawData[3] = node.getResponseBuffer(3);

    uint64_t combined = ((uint64_t)rawData[0] << 48) | ((uint64_t)rawData[1] << 32) | ((uint64_t)rawData[2] << 16) | (uint64_t)rawData[3];  // รวมเป็น 64-bit

    return (int64_t)combined;
  } else {
    Serial.println("Error reading energy!");
    return -1;
  }
}

static void prepareTxFrame(uint8_t port) {
  DynamicJsonDocument jsonBuffer(4096);
  CayenneLPP lpp(160);

  JsonArray root = jsonBuffer.to<JsonArray>();
  lpp.reset();

  struct {
    const char* name;
    uint16_t reg;
  } registers_float4[] = {
    { "Active Energy Delivered Phase A", 50056 }, 
    { "Active Energy Delivered Phase B", 50060 }, 
    { "Active Energy Delivered Phase C", 50064 }, 
    { "Active Energy Delivered (Into Load)", 50068 }, 
    { "Reactive Energy Delivered Phase A", 50072 }, 
    { "Reactive Energy Delivered Phase B", 50076 }, 
    { "Reactive Energy Delivered Phase C", 50080 }, 
    { "Reactive Energy Delivered", 50084 }
  };

  struct {
    const char* name;
    uint16_t reg;
  } registers_float2[] = {
    { "Voltage A-B", 50016 }, 
    { "Voltage B-C", 50018 }, 
    { "Voltage C-A", 50020 }, 
    { "Voltage A-N", 50022 }, 
    { "Voltage B-N", 50024 }, 
    { "Voltage C-N", 50026 }, 
    { "Voltage L-L Avg", 50028 }, 
    { "Voltage L-N Avg", 50030 }, 
    { "Current A", 50000 }, 
    { "Current B", 50002 }, 
    { "Current C", 50004 }, 
    { "Current N", 50006 }, 
    { "Current Avg", 50008 }
  };


  Serial.println("Reading Modbus Registers...");
  int analogInputNumber = 1;
  for (int i = 0; i < sizeof(registers_float4) / sizeof(registers_float4[0]); i++) {
    int64_t value = readEnergy(registers_float4[i].reg);
    lpp.addVoltage(analogInputNumber, float(value / 1000000000.0));  // ผลลัพธ์จะได้ 1.735612098
    analogInputNumber++; 
    Serial.print(registers_float4[i].name);
    Serial.print(": ");
    Serial.println(value);
  }

  for (int i = 0; i < sizeof(registers_float2) / sizeof(registers_float2[0]); i++) {
    float value = readVoltage(registers_float2[i].reg);
    lpp.addVoltage(analogInputNumber, value);
    analogInputNumber++;
    Serial.print(registers_float2[i].name);
    Serial.print(": ");
    Serial.println(value, 2);
  }

  // คัดลอกข้อมูลไปยัง appData เพื่อส่งผ่าน LoRaWAN
  appDataSize = lpp.getSize();
  memcpy(appData, lpp.getBuffer(), appDataSize);
}

RTC_DATA_ATTR bool firstrun = true;
void setup() {
  Serial.begin(115200);                                 // สำหรับ Debugging
  Serial1.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX);  // UART สำหรับ RS485

  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);

  if (firstrun) {
    LoRaWAN.displayMcuInit();
    firstrun = false;
  }

  pinMode(RS485_DE, OUTPUT);
  digitalWrite(RS485_DE, LOW);

  node.begin(1, Serial1);  // ตั้งค่า Modbus Slave ID = 1
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

void loop() {
  switch (deviceState) {
    case DEVICE_STATE_INIT:
      {
#if (LORAWAN_DEVEUI_AUTO)
        LoRaWAN.generateDeveuiByChipID();
#endif
        LoRaWAN.init(loraWanClass, loraWanRegion);
        //both set join DR and DR when ADR off
        LoRaWAN.setDefaultDR(3);
        break;
      }
    case DEVICE_STATE_JOIN:
      {
        LoRaWAN.displayJoining();
        LoRaWAN.join();
        break;
      }
    case DEVICE_STATE_SEND:
      {
        LoRaWAN.displaySending();
        prepareTxFrame(appPort);
        LoRaWAN.send();
        deviceState = DEVICE_STATE_CYCLE;
        break;
      }
    case DEVICE_STATE_CYCLE:
      {
        // Schedule next packet transmission
        txDutyCycleTime = appTxDutyCycle + randr(-APP_TX_DUTYCYCLE_RND, APP_TX_DUTYCYCLE_RND);
        LoRaWAN.cycle(txDutyCycleTime);
        deviceState = DEVICE_STATE_SLEEP;
        break;
      }
    case DEVICE_STATE_SLEEP:
      {
        LoRaWAN.displayAck();
        LoRaWAN.sleep(loraWanClass);
        break;
      }
    default:
      {
        deviceState = DEVICE_STATE_INIT;
        break;
      }
  }
}
