const { Client } = require("pg");
require("dotenv").config();

exports.connectMainDB = function () {
  return new Client({
    host: process.env.HOST_NAME,
    database: process.env.DB_MAIN_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
};

exports.connectModeGramDB = function () {
  return new Client({
    host: process.env.HOST_NAME,
    database: process.env.DB_MODE_GRAM_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
};

exports.connectModePcsDB = function () {
  return new Client({
    host: process.env.HOST_NAME,
    database: process.env.DB_MODE_PCS_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
};
