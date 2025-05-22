#ifndef PRINTER_H
#define PRINTER_H

#include <Arduino.h>

enum PrinterCommands { LF = 0x0A, GS = 0x1D, DLE = 0x10, EOT = 0x04, ESC = 0x1B };

// จัดตำแหน่งข้อความ
enum TextAlign {
    ALIGN_LEFT = 0x00,   // จัดข้อความชิดซ้าย
    ALIGN_CENTER = 0x01, // จัดข้อความให้อยู่กลาง
    ALIGN_RIGHT = 0x02   // จัดข้อความชิดขวา
};

// เปิด,ปิด ใช้งานตัวหนา
enum SetBoldStyle {
    BOLD_ON = 0x00, // เปิดใช้งานตัวหนา
    BOLD_OFF = 0x01   // ปิดใช้งานตัวหนา
};

// ขนาดตัวอักษร
enum SetFontSize {
    NOMAL = 0x00, // เลือกขนาดตัวอักษรปกติ
    LARGE = 0x01, // เลือกขนาดตัวอักษรใหญ่
};

// เน้นข้อความ
enum HighlightText {
    HIGHLIGHT_OFF = 0x00,               // ปกติ (ไม่มีการเน้น)
    HIGHLIGHT_UNDERLINE = 0x08,         // เน้น (ขีดเส้นใต้)
    HIGHLIGHT_LARGER = 0x10,            // เน้น (ตัวอักษรใหญ่ขึ้น)
    HIGHLIGHT_VERTICAL_EXPANDED = 0x20, // เน้น (ตัวอักษรขยายแนวตั้ง)
    HIGHLIGHT_VERTICAL_HORIZONTALLY_EXPANDED = 0x30, // เน้น (ตัวอักษรขยายทั้งแนวตั้งและแนวนอน)
};

class Printer {
  public:
    Printer();
    void begin();
    void write(u_int8_t command);
    void reset();
    void setFontSize(SetFontSize size);
    void highlight(HighlightText style);
    void setBold(SetBoldStyle style);
    void print(const String &text);
    void println(const String &text);
    void feed(uint8_t n);
    void cut();
    void printLogo();
    void printAndCut(const String &text);
    void setAlign(TextAlign align = ALIGN_CENTER);

  private:
    HardwareSerial &printer;
    long baudRate;
    uint32_t config;
    int8_t rxPin;
    int8_t txPin;
    void sendCommand(PrinterCommands command);
};

#endif // PRINTER_H
