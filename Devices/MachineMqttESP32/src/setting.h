#define NAME_SPACE "machine_mqtt"

// Pins for input signals
#define LED_STATUS 2
int CYCLE_TIME_PIN = 34;
int REJECT_NUMBER_PIN = 4;
const int REJECT_PINS[] = {12, 22, 14, 15};

// Preferences
#define MEM_FIRST_RUN "first_run"
#define MEM_MACHINE_ID "machine_id"
#define MEM_WIFI_SSID "wifi_ssid"
#define MEM_WIFI_PASSWORD "wifi_password"
#define MEM_MQTT_MQTT_SERVER "mqtt_server"
#define MEM_MQTT_MQTT_PORT "mqtt_port"
#define MEM_MQTT_MQTT_TOPIC_LIVEDATA "mqtt_topic_liveData"
#define MEM_MQTT_MQTT_TOPIC_RECORD "mqtt_topic_record"
#define MEM_MQTT_TOPIC_STATUS "mqtt_topic_status"

#define MEM_CYCLE_TIME_NUMBER_PIN "cycle_time_pin"
#define MEM_REJECT_NUMBER_PIN "reject_number_pin"

#define MEM_DEBOUNDE_DELAY "debounce_delay"
#define MEM_TIMEOUT "timeout"

// ตั้งค่าเริ่มต้นสำหรับการตั้งค่า Server
#define DEFAULT_WIFI_SSID "polipharm-AT7"
#define DEFAULT_WIFI_PASSWORD "511897000"
#define DEFAULT_MQTT_SERVER "192.168.0.250"
#define DEFAULT_MQTT_PORT 1884
#define DEFAULT_MQTT_TOPIC_LIVEDATA "machine/livedata/"
#define DEFAULT_MQTT_TOPIC_RECORD "machine/record/"
#define DEFAULT_MQTT_TOPIC_STATUS "machine/status/"

#define DEFAULT_DEBOUNDE_DELAY 50
#define DEFAULT_TIMEOUT 3000

#define DEFAULT_CYCLE_TIME_PIN 34
#define DEFAULT_REJECT_NUMBER_PIN 1


// โหมดการใช้งาน
enum ModeType { MODE_GRAM, MODE_PCS, MODE_SETTING };
