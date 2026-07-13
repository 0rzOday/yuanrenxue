const CryptoJS = require('crypto-js');

function encryptByTs(ts, plaintext) {
    // 1. 时间戳 -> 十六进制 -> 重复拼接 -> 截取前16位
    var hex = ts.toString(16);
    var doubled = hex + hex;
    var result = doubled.slice(0, 16);

    // 2. 密钥和 IV 都使用这个16位十六进制串的 UTF-8 解析
    var key = CryptoJS.enc.Utf8.parse(result);
    var iv  = CryptoJS.enc.Utf8.parse(result);

    // 3. AES-128-CBC 加密
    var encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // 4. 返回 Base64 密文（不要在这里 console.log）
    return encodeURIComponent(encrypted.toString());
}

// 5. 接收命令行参数并调用
const ts = parseInt(process.argv[2]);
const plaintext = process.argv[3];
console.log(encryptByTs(ts, plaintext));  // 这一行输出会被 Python 捕获