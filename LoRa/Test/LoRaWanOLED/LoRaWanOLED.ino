#include <ModbusMaster.h>

// กำหนดพิน RX, TX ของ RS485 Module
#define RS485_TX 3
#define RS485_RX 2
#define RS485_DE 4  // DE และ RE ควบคุมทิศทางการส่งข้อมูล

ModbusMaster node;

void preTransmission() {
  digitalWrite(RS485_DE, HIGH); // เปิดโหมดส่งข้อมูล
}

void postTransmission() {
  digitalWrite(RS485_DE, LOW); // กลับไปโหมดรับข้อมูล
}

void setup() {
  Serial.begin(9600);  // สำหรับ Debugging
  Serial1.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX);  // UART สำหรับ RS485

  pinMode(RS485_DE, OUTPUT);
  digitalWrite(RS485_DE, LOW);

  node.begin(1, Serial1);  // ตั้งค่า Modbus Slave ID = 1
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

float readVoltage(uint16_t reg) {
  uint8_t result = node.readHoldingRegisters(reg - 1, 2);  // อ่าน 2 รีจิสเตอร์

  if (result == node.ku8MBSuccess) {
    uint16_t rawData[2];
    rawData[0] = node.getResponseBuffer(0);
    rawData[1] = node.getResponseBuffer(1);
    
    uint32_t combined = (rawData[0] << 16) | rawData[1]; // รวมข้อมูลเป็น 32-bit
    float voltage;
    memcpy(&voltage, &combined, sizeof(voltage)); // แปลงเป็น float
    
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
    
    uint64_t combined = ((uint64_t)rawData[0] << 48) | ((uint64_t)rawData[1] << 32) |
                        ((uint64_t)rawData[2] << 16) | (uint64_t)rawData[3]; // รวมเป็น 64-bit
    
    return (int64_t)combined;
  } else {
    Serial.println("Error reading energy!");
    return -1;
  }
}

void loop() {
  struct {
    const char* name;
    uint16_t reg;
  } registers_float2[] = {
    {"Voltage A-B", 50016}, {"Voltage B-C", 50018}, {"Voltage C-A", 50020},
    {"Voltage A-N", 50022}, {"Voltage B-N", 50024}, {"Voltage C-N", 50026},
    {"Voltage L-L Avg", 50028}, {"Voltage L-N Avg", 50030},
    {"Current A", 50000}, {"Current B", 50002}, {"Current C", 50004},
    {"Current N", 50006}, {"Current Avg", 50008}
  };

  struct {
    const char* name;
    uint16_t reg;
  } registers_float4[] = {
    {"Active Energy Delivered Phase A", 50056}, {"Active Energy Delivered Phase B", 50060},
    {"Active Energy Delivered Phase C", 50064}, {"Active Energy Delivered (Into Load)", 50068},
    {"Reactive Energy Delivered Phase A", 50072}, {"Reactive Energy Delivered Phase B", 50076},
    {"Reactive Energy Delivered Phase C", 50080}, {"Reactive Energy Delivered", 50084}
  };

  Serial.println("Reading Modbus Registers...");

  for (int i = 0; i < sizeof(registers_float2) / sizeof(registers_float2[0]); i++) {
    float value = readVoltage(registers_float2[i].reg);
    Serial.print(registers_float2[i].name);
    Serial.print(": ");
    Serial.println(value, 2);
  }

  for (int i = 0; i < sizeof(registers_float4) / sizeof(registers_float4[0]); i++) {
    int64_t value = readEnergy(registers_float4[i].reg);
    Serial.print(registers_float4[i].name);
    Serial.print(": ");
    Serial.println(value);
  }

  delay(5000); // อ่านค่าทุก ๆ 5 วินาที
}
