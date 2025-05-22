
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";
const char* mqtt_server = "192.168.0.250";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
int okCount = 0;
int ngCount = 0;
bool machineOn = true;

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Client")) break;
    delay(5000);
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;
    String payload = "{"machineId":"M01","status":"" + String(machineOn ? "ON" : "OFF") + "","okCount":" + String(okCount) + ","ngCount":" + String(ngCount) + "}";
    client.publish("factory/machine/M01", payload.c_str());
    okCount += random(0, 5);
    ngCount += random(0, 2);
    machineOn = !machineOn;
  }
}
