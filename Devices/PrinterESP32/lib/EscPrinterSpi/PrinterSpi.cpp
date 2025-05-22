#include "PrinterSpi.h"
#include <SPI.h>

PrinterSpi::PrinterSpi() {}

void PrinterSpi::begin(int csPin) {
    this->csPin = csPin;
    this->reset();
}

void PrinterSpi::write(uint8_t command) {
    digitalWrite(this->csPin , LOW); // เลือกเครื่องพิมพ์ (Slave)
    SPI.transfer(command); // ส่งคำสั่งผ่าน SPI
    digitalWrite(this->csPin , HIGH); // ปล่อยเครื่องพิมพ์
}

void PrinterSpi::reset() {
    this->write(ESC);
    this->write('@');
    delay(100); // หน่วงเวลา 100 มิลลิวินาที
}

void PrinterSpi::setFontSize(SetFontSize size) {
    this->write(ESC);
    this->write('M');
    this->write(size);
}

void PrinterSpi::highlight(HighlightText style) {
    this->write(ESC);
    this->write('!');
    this->write(style);
}

void PrinterSpi::setBold(SetBoldStyle style) {
    this->write(ESC);
    this->write('!');
    this->write(style);
}

void PrinterSpi::print(const String &text) {
    digitalWrite(this->csPin , LOW); // เลือกเครื่องพิมพ์ (Slave)
    for (size_t i = 0; i < text.length(); i++) {
        SPI.transfer(text[i]); // ส่งแต่ละตัวอักษรผ่าน SPI
    }
    digitalWrite(this->csPin , HIGH); // ปล่อยเครื่องพิมพ์
}

void PrinterSpi::println(const String &text) {
    this->print(text); // ส่งข้อความ
    this->write('\n'); // ส่ง newline เพื่อขึ้นบรรทัดใหม่
}

void PrinterSpi::feed(uint8_t n) {
    this->write(ESC);
    this->write('d');
    this->write(n);
}

void PrinterSpi::cut() {
    this->write(GS);
    this->write('V');
    this->write(65);
    this->write(42);
}

void PrinterSpi::printLogo() {
    this->write(0x1C);
    this->write(0x70);
    this->write(0x01);
    this->write(0x00);
}

void PrinterSpi::printAndCut(const String &text) {
    this->write(ESC);
    this->write('M');
    this->write(0x00);

    this->print(text);
    this->feed(3);
    this->cut();
}

void PrinterSpi::setAlign(TextAlign align) {
    this->write(ESC);
    this->write('a');
    this->write(align);
}

void PrinterSpi::sendCommand(PrinterCommands command) {
    this->write(command);
}
