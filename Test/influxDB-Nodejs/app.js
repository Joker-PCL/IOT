const { InfluxDB } = require("@influxdata/influxdb-client");

const token = "vds22S_6diIyfNWytLO2t7yKNVek91sGIzXHQknztfRv9L-sMNiUqaQhoXi9HzCBGaL6JfKpTDYDDoWIPS8gQQ==";
const url = "http://192.168.12.77:8086";
let org = `chirpstack`;
let bucket = `energy-production`;

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

const fluxQuery = `
  from(bucket: "${bucket}")
    |> range(start: -2d)
    |> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_value_18" or 
                            r["_measurement"] == "device_frmpayload_data_value_19" or 
                            r["_measurement"] == "device_frmpayload_data_value_20")
    |> filter(fn: (r) => r["_field"] == "value")
    |> aggregateWindow(every: 15m, fn: mean, createEmpty: false)
    |> map(fn: (r) => ({ 
            r with 
            _field: if r._measurement == "device_frmpayload_data_value_18" then "พลังงานไฟฟ้า L1 (kWh)"
                    else if r._measurement == "device_frmpayload_data_value_19" then "พลังงานไฟฟ้า L2 (kWh)"
                    else if r._measurement == "device_frmpayload_data_value_20" then "พลังงานไฟฟ้า L3 (kWh)"
                    else r._field 
    }))
    |> keep(columns: ["_time", "_value", "_field"])
    |> yield(name: "mean")
`;

async function fetchData() {
  try {
    const rows = await queryApi.collectRows(fluxQuery);
    for (const row of rows) {
      console.log(rows);
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
  }
}

fetchData();
