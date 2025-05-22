/**
 * Decode uplink function
 *
 * @param {object} input
 * @param {number[]} input.bytes Byte array containing the uplink payload, e.g. [255, 230, 255, 0]
 * @param {number} input.fPort Uplink fPort.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 *
 * @returns {{data: object}} Object representing the decoded payload.
 */
function decodeUplink(input) {
  let byte = input.bytes;
  let inputNumber = 1;
  let data = {};

  for (let i = 0; i < byte.length; ) {
    if (i + 1 >= byte.length) {
      return { errors: ["Invalid data format"] };
    }

    let numberByte = byte[i]; // ขนาดข้อมูล (2 หรือ 4)
    let decimal = byte[i + 1]; // จำนวนทศนิยม
    i += 2;

    let rawValue = 0;

    if (numberByte === 2) {
      if (i + 1 >= byte.length) {
        return { errors: ["Invalid data format"] };
      }
      rawValue = (byte[i] << 8) | byte[i + 1];
      i += 2;
    } else if (numberByte === 4) {
      if (i + 3 >= byte.length) {
        return { errors: ["Invalid data format"] };
      }
      rawValue =
        (byte[i] << 24) |
        (byte[i + 1] << 16) |
        (byte[i + 2] << 8) |
        byte[i + 3];
      i += 4;
    } else {
      return { errors: ["Unknown numberByte: " + numberByte] };
    }

    let value = rawValue / Math.pow(10, decimal);
    let key = "value_" + inputNumber++;
    data[key] = value;
  }

  return { data };
}

/**
 * Encode downlink function.
 *
 * @param {object} input
 * @param {object} input.data Object representing the payload that must be encoded.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 *
 * @returns {{bytes: number[]}} Byte array containing the downlink payload.
 */
function encodeDownlink(input) {
  return {
    // bytes: [225, 230, 255, 0]
  };
}
