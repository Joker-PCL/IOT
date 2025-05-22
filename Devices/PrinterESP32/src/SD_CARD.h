#include "FS.h"
#include "SD.h"
#include "SPI.h"
#include <Arduino.h>
#include <ArduinoJson.h>

class SDCard {
  public:
    int csPin;
    const char *path;

    SDCard(int csPin, const char *path) {
        this->csPin = csPin;
        this->path = path;
    }

    bool begin() {
        if (!SD.begin(this->csPin)) {
            Serial.println("(Failed!!) => Mounting SD card failed!");
            return false;
        }
        Serial.println("SD card mounted successfully!");
        return true;
    }

    bool writeFile(const char *message) {
        if (!this->begin()) {
            Serial.println(
                "(Failed!!) => SD card not connected and failed to reconnect!");
            return false;
        }

        Serial.printf("Writing file: %s ", this->path);
        File file = SD.open(path, FILE_WRITE);
        if (!file) {
            Serial.println("(Failed!!) => Open file");
            return false;
        }
        if (file.print(message)) {
            Serial.println("<<Successfully>>");
            return true;
        } else {
            Serial.println("(Failed!!) => Write");
            return false;
        }
        file.close();
    }

    String readFile() {
        if (!this->begin()) {
            Serial.println(
                "(Failed!!) => SD card not connected and failed to reconnect!");
            return "";
        }

        Serial.printf("Reading file: %s ", this->path);
        File file = SD.open(this->path);
        if (!file) {
            Serial.println("(Failed!!) => File not found");
            return ""; // Return an empty string for a newly created file
        }
        String fileContent;
        while (file.available()) {
            fileContent += (char)file.read();
        }
        file.close();
        return fileContent;
    }

    bool writeJson(const JsonDocument &doc) {
        if (!this->begin()) {
            Serial.println("(Failed!!) => SD card not connected and failed to reconnect!");
            return false;
        }

        Serial.printf("Writing JSON file: %s ", this->path);
        File file = SD.open(this->path, FILE_WRITE);
        if (!file) {
            Serial.println("(Failed!!) => Open file for writing");
            return false;
        }
        if (serializeJson(doc, file) > 0) {
            Serial.println("<<Successfully>>");
            file.close();
            return true;
        } else {
            Serial.println("(Failed!!) => Write failed");
            file.close();
            return false;
        }
    }

    bool updateJson(const char *key, const char *value ) {
        if (!this->begin()) {
            Serial.println(
                "(Failed!!) => SD card not connected and failed to reconnect!");
            return false;
        }

        JsonDocument doc;
        File file = SD.open(this->path);
        if (!file) {
            Serial.println("(Failed!!) => File not found");
        }
        else {
            DeserializationError error = deserializeJson(doc, file);
        }

        doc[key] = value;

        Serial.printf("Writing JSON file: %s ", this->path);
        file = SD.open(this->path, FILE_WRITE);
        if (!file) {
            Serial.println("(Failed!!) =>  Open file for writing");
            return false;
        }
        if (serializeJson(doc, file) > 0) {
            Serial.printf("(Successfully) => %s: %s, %s\n", this->path, key, value);
            return true;
        } else {
            Serial.println("(Failed!!) => Write failed");
            return false;
        }
        file.close();
    }

    JsonDocument readJson() {
        JsonDocument doc;
        if (!this->begin()) {
            Serial.println(
                "(Failed!!) => SD card not connected and failed to reconnect!");
            return doc; // Returning an empty document
        }

        Serial.printf("Reading JSON file: %s ", this->path);
        File file = SD.open(this->path);
        if (!file) {
            Serial.println("(Failed!!) => File not found");
            return doc;
        }
        DeserializationError error = deserializeJson(doc, file);
        if (error) {
            Serial.printf("(Failed!!) => %s\n", error.c_str());
            return doc;
        }
        file.close();
        return doc;
    }
};
