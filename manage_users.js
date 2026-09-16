#!/usr/bin/env node
/**
 * 区域库 · 一人一码 管理脚本
 *
 * 架构：随机主密钥 MK 加密 data.json -> data.enc
 *       每个人的专属口令只用来「包裹」MK，存入 users.json（可公开，无明文）
 *       => 剔除某人 = 删掉他那条包裹记录，其他人的码完全不受影响
 *
 * 用法：
 *   node manage_users.js init              初始化/补齐（幂等，已有用户不动）
 *   node manage_users.js list              列出当前有权限的人
 *   node manage_users.js add 姓名 标识     新增一人（自动生成随机口令）
 *   node manage_users.js remove 姓名       剔除某人（立即失效）
 *   node manage_users.js reset 姓名        重置某人口令（换码）
 *   node manage_users.js regen             data.json 变更后重新加密 data.enc
 *
 * 注意：master.key / passwords.txt 绝不能提交（已在 .gitignore 屏蔽）
 */
const fs = require("fs");
const path = require("path");
const CryptoJS = require("/Users/lifanxue/.workbuddy/binaries/node/workspace/node_modules/crypto-js");

const DIR = __dirname;
const MK_FILE = path.join(DIR, "master.key");
const PW_FILE = path.join(DIR, "passwords.txt");
const USERS_FILE = path.join(DIR, "users.json");

// 初始团队名单（区域经理 + 辽宁小组 + 陕西小组），可按实际增减
const ROSTER = [
  { name: "李范学", tag: "区域经理", pinyin: "lifanxue" },
  { name: "曲红巍", tag: "辽宁", pinyin: "quhongwei" },
  { name: "王浩田", tag: "辽宁", pinyin: "wanghaotian" },
  { name: "付琨",   tag: "辽宁", pinyin: "fukun" },
  { name: "邹奇",   tag: "辽宁", pinyin: "zouqi" },
  { name: "王锦瑜", tag: "陕西", pinyin: "wangjinyu" },
  { name: "刘昊鑫", tag: "陕西", pinyin: "liuhaoxin" },
  { name: "张恒",   tag: "陕西", pinyin: "zhangheng" },
  { name: "杜宇翔", tag: "陕西", pinyin: "duyuxiang" },
  { name: "段景译", tag: "陕西", pinyin: "duanjingyi" },
];

function loadMK() {
  if (fs.existsSync(MK_FILE)) return fs.readFileSync(MK_FILE, "utf8").trim();
  const mk = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  fs.writeFileSync(MK_FILE, mk);
  console.log("已生成新的主密钥 -> master.key（切勿提交/外传）");
  return mk;
}
const wrapMK = (mk, pass) => CryptoJS.AES.encrypt("MK1:" + mk, pass).toString();

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return { version: 1, users: [] };
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
  catch { return { version: 1, users: [] }; }
}
function writeUsers(u) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 1));
}
function readPW() {
  if (!fs.existsSync(PW_FILE)) return [];
  return fs.readFileSync(PW_FILE, "utf8").split("\n").filter(Boolean);
}
function savePW(list) {
  fs.writeFileSync(PW_FILE, list.join("\n") + "\n");
}
function genPass(pinyin) {
  const r = CryptoJS.lib.WordArray.random(3).toString(CryptoJS.enc.Hex).slice(0, 4);
  return (pinyin || "user") + "-" + r;
}
function encryptData(mk) {
  const raw = fs.readFileSync(path.join(DIR, "data.json"), "utf8");
  const enc = CryptoJS.AES.encrypt(raw, mk).toString();
  fs.writeFileSync(path.join(DIR, "data.enc"), enc);
  console.log("已加密 data.json -> data.enc (" + enc.length + " 字节)");
}

const cmd = process.argv[2] || "init";
const mk = loadMK();
const db = readUsers();

if (cmd === "init") {
  let added = 0;
  const pw = readPW();
  for (const r of ROSTER) {
    if (db.users.some(u => u.name === r.name)) continue;
    const p = genPass(r.pinyin);
    db.users.push({ name: r.name, tag: r.tag, wrapped: wrapMK(mk, p) });
    pw.push(r.name + "\t" + p);
    added++;
  }
  writeUsers(db);
  savePW(pw);
  encryptData(mk);
  console.log("新增 " + added + " 人，当前共 " + db.users.length + " 人");
  console.log("明文口令已写入 passwords.txt（仅供分发，切勿提交）");
} else if (cmd === "list") {
  console.log("当前有权限访问（共 " + db.users.length + " 人）：");
  db.users.forEach((u, i) => console.log("  " + (i + 1) + ". " + u.name + "（" + (u.tag || "-") + "）"));
} else if (cmd === "add") {
  const name = process.argv[3], tag = process.argv[4] || "";
  if (!name) { console.log("用法：node manage_users.js add 姓名 标识"); process.exit(1); }
  if (db.users.some(u => u.name === name)) { console.log("该姓名已存在，如需换码请用 reset"); process.exit(1); }
  const p = genPass();
  db.users.push({ name, tag, wrapped: wrapMK(mk, p) });
  writeUsers(db);
  const pw = readPW().filter(l => !l.startsWith(name + "\t"));
  pw.push(name + "\t" + p);
  savePW(pw);
  console.log("已新增：" + name + "  口令：" + p);
} else if (cmd === "remove") {
  const name = process.argv[3];
  if (!name) { console.log("用法：node manage_users.js remove 姓名"); process.exit(1); }
  const before = db.users.length;
  db.users = db.users.filter(u => u.name !== name);
  writeUsers(db);
  savePW(readPW().filter(l => !l.startsWith(name + "\t")));
  console.log(db.users.length < before
    ? "已剔除：" + name + "（其口令立即失效，需重新推送 users.json 生效）"
    : "未找到该姓名");
} else if (cmd === "reset") {
  const name = process.argv[3];
  const u = db.users.find(x => x.name === name);
  if (!u) { console.log("未找到该姓名"); process.exit(1); }
  const p = genPass();
  u.wrapped = wrapMK(mk, p);
  writeUsers(db);
  const pw = readPW().filter(l => !l.startsWith(name + "\t"));
  pw.push(name + "\t" + p);
  savePW(pw);
  console.log("已换码：" + name + "  新口令：" + p);
} else if (cmd === "regen") {
  encryptData(mk);
} else {
  console.log("未知命令：" + cmd);
}
