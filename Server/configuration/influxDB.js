require("dotenv").config();
const { InfluxDB } = require("@influxdata/influxdb-client");
const INFLUX_HOST = process.env.NODE_ENV === 'production' ? process.env.INFLUX_PRODUCTION_HOST : process.env.INFLUX_TEST_HOST;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;

const influxDB = new InfluxDB({ url: INFLUX_HOST, token: INFLUX_TOKEN });
const influxApi = influxDB.getQueryApi({org: INFLUX_ORG});

module.exports = influxApi;
