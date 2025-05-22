function base64ToUint8Array(base64) {
    let binaryString = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function decodeUplink(input) {
    let byte = input.bytes;
    let inputNumber = 1;
    let data = {};
    
    for (let i = 0; i < byte.length; ) {
        if (i + 1 >= byte.length) {
            console.error("Insufficient data for numberByte and decimal");
            return { errors: ["Invalid data format"] };
        }

        let numberByte = byte[i];   // ขนาดข้อมูล (2 หรือ 4)
        let decimal = byte[i + 1];  // จำนวนทศนิยม
        i += 2;

        let rawValue = 0;

        if (numberByte === 2) {
            if (i + 1 >= byte.length) {
                console.error("Insufficient data for 16-bit value");
                return { errors: ["Invalid data format"] };
            }
            rawValue = (byte[i] << 8) | byte[i + 1];
            i += 2;
        } else if (numberByte === 4) {
            if (i + 3 >= byte.length) {
                console.error("Insufficient data for 32-bit value");
                return { errors: ["Invalid data format"] };
            }
            rawValue = (byte[i] << 24) | (byte[i + 1] << 16) | (byte[i + 2] << 8) | byte[i + 3];
            i += 4;
        } else {
            console.error("Unknown numberByte:", numberByte);
            return { errors: ["Unknown numberByte: " + numberByte] };
        }

        let value = rawValue / Math.pow(10, decimal);
        let key = "input_" + (inputNumber++);
        data[key] = value;
    }

    return { data };
}

// ทดสอบด้วย Base64 ที่ให้มา
let base64Data = "AgKZsAICmosCAprrAgJZDgICWNACAlmHAgKaYgICWSICAjYkAgI0uwICM2kCAgR8AgI0wwYDAAjR3AYDAAhoaQYDAAlJwgYDABqDbgYDAAAB2QYDAAABaQYDAAABugYDAAtCig==";
let bytes = base64ToUint8Array(base64Data);

let result = decodeUplink({ bytes: bytes });
console.log(result);
