#include "Printer.h"

Printer::Printer() : printer(Serial2) {}

void Printer::begin() {
    this->reset();
}

void Printer::write(u_int8_t command) { this->printer.write(command); }

void Printer::reset() {
    this->printer.write(ESC);
    this->printer.write('@');
    delay(100); // หน่วงเวลา 100 มิลลิวินาที
}

// ขนาดตัวอักษร
void Printer::setFontSize(SetFontSize size) {
    this->write(ESC);
    this->write('M');
    this->write(size);
}

// เน้นข้อความ
void Printer::highlight(HighlightText style) {
    this->write(ESC);
    this->write('!');
    this->write(style);
}

// เปิด,ปิด ใช้งานตัวหนา
void Printer::setBold(SetBoldStyle style) {
    this->write(ESC);
    this->write('!');
    this->write(style);
}

void Printer::print(const String &text) {
    this->printer.print(text); // ส่งข้อความไปยังเครื่องพิมพ์
}

void Printer::println(const String &text) {
    this->printer.print(text); // ส่งข้อความ
    this->printer.write('\n'); // ส่ง newline เพื่อขึ้นบรรทัดใหม่
}

void Printer::feed(uint8_t n) {
    this->write(ESC);
    this->write('d');
    this->write(n);
}

// GS V 0 - ตัดกระดาษทั้งหมด
void Printer::cut() {
    this->write(GS);
    this->write('V');
    this->write(65);
    this->write(42);
}

void Printer::printLogo() {
    this->write(0x1C);
    this->write(0x70);
    this->write(0x01);
    this->write(0x00);
}

void Printer::printAndCut(const String &text) {
    // # เน้น (เลือกขนาดตัวอักษรปกติ)
    this->printer.write(ESC);
    this->printer.write('M');
    this->printer.write(0x00);

    this->printer.print(text); // ส่งข้อความ
    this->feed(3); // เลื่อนกระดาษขึ้น 3 บรรทัดเพื่อให้มีพื้นที่ก่อนตัด
    this->cut(); // ตัดกระดาษ
}

void Printer::setAlign(TextAlign align) {
    this->printer.write(ESC);
    this->printer.write('a');
    this->printer.write(align);
}

void Printer::sendCommand(PrinterCommands command) { this->printer.write(command); }
