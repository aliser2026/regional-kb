// 用法: node encrypt_data.js [密码]
// 把 data.json 加密成 data.enc（CryptoJS.AES 可直接解密的 OpenSSL "Salted__" 格式）
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const CryptoJS = require("/Users/lifanxue/.workbuddy/binaries/node/workspace/node_modules/crypto-js");

const PASS = process.argv[2] || "liaoshantuandui";
const dir = __dirname;
const src = path.join(dir, "data.json");
const dst = path.join(dir, "data.enc");

const plaintext = fs.readFileSync(src, "utf8");

// CryptoJS 兼容的 EVP_BytesToKey（MD5）派生 key(32)+iv(16)
function evpBytesToKey(password, salt, keyLen, ivLen) {
  const data = Buffer.concat([Buffer.from(password, "utf8"), salt]);
  const hashes = [];
  let prev = Buffer.alloc(0);
  while (Buffer.concat(hashes).length < keyLen + ivLen) {
    prev = crypto.createHash("md5").update(Buffer.concat([prev, data])).digest();
    hashes.push(prev);
  }
  const all = Buffer.concat(hashes);
  return { key: all.slice(0, keyLen), iv: all.slice(keyLen, keyLen + ivLen) };
}

const salt = crypto.randomBytes(8);
const { key, iv } = evpBytesToKey(PASS, salt, 32, 16);
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
const out = Buffer.concat([Buffer.from("Salted__", "utf8"), salt, ct]).toString("base64");

fs.writeFileSync(dst, out, "utf8");
console.log("已生成 data.enc，大小:", fs.statSync(dst).size, "字节");

// —— 回环自检：用 CryptoJS 按浏览器同样的方式解开，确认一致 ——
const bytes = CryptoJS.AES.decrypt(out, PASS);
const dec = bytes.toString(CryptoJS.enc.Utf8);
if (dec === plaintext) {
  console.log("✅ 回环验证通过：CryptoJS 解密结果与原 data.json 完全一致");
} else {
  console.error("❌ 回环验证失败！");
  process.exit(1);
}
