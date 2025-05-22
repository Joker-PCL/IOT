#define MAX_QUEUE_SIZE 250
#define ALERT_ROUNDS 10
#define SYNC_WIFI_TASK_TIMEOUT 10000
#define SYNC_TIME_TASK_TIMEOUT 5000

// Preferences
#define NAME_SPACE "alarm_box"
#define MEM_SET_MODE "set_mode"
#define MEM_SET_PRINT_LOGO "set_print_logo"
#define MEM_SET_PRINT_PCS "set_print_pcs"
#define MEM_SET_MIN_WEIGHT "set_min_weight"
#define MEM_SET_MAX_WEIGHT "set_max_weight"
#define MEM_SET_PCS "set_pcs"

#define MEM_COUNT_GRAM_OK "count_gram_ok"
#define MEM_COUNT_GRAM_NG "count_gram_ng"
#define MEM_COUNT_PCS_OK "count_pcs_ok"
#define MEM_COUNT_PCS_NG "count_pcs_ng"

#define MEM_PASSWORD_SETTING "2077" // Password สำหรับเข้าไปตั้งค่า
#define MEM_FIRST_RUN "first_run"
#define MEM_WIFI_SSID "wifi_ssid"
#define MEM_WIFI_PASSWORD "wifi_password"
#define MEM_SERVER_URL "server_url"
#define MEM_NTP_SERVER "ntp_server"

// ตั้งค่าเริ่มต้นสำหรับการตั้งค่า Server
bool IS_FIRST_RUN = true;
#define DEFAULT_WIFI_SSID "polipharm-AT7"
#define DEFAULT_WIFI_PASSWORD "511897000"
#define DEFAULT_SERVER_URL "https://192.168.0.250/api"
#define DEFAULT_NTP_SERVER "192.168.0.1"

#define COPYRIGHT "CREATE BY NATTAPON PONDONKO"

enum ServerStatus { INITIAL = 0, REGISTERED = 200, NOT_REGISTERED = 400, OFFLINE = 404, ERROR = -1 };

// โหมดการใช้งาน
enum ModeType { MODE_GRAM, MODE_PCS, MODE_SETTING };

enum SetEmployeeIdType { SET_EMPLOYEE_ID1, SET_EMPLOYEE_ID2 };

// Testing
enum TestType { TEST_ALARM, PRINT_TEST };

// ค่าสี
enum ColorCode {
    COLOR_RED = 0xE50202,
    COLOR_ORANGE = 0xF4660A,
    COLOR_GREEN = 0x0FB301,
    COLOR_GRAY = 0x695C62,
};
