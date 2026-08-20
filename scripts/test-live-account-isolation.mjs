import assert from "node:assert/strict";

const baseUrl = process.env.OFFERMAP_URL?.replace(/\/$/, "");
const ownerToken = process.env.OFFERMAP_OWNER_TOKEN;
const otherToken = process.env.OFFERMAP_OTHER_TOKEN;
const ownerPositionId = process.env.OFFERMAP_OWNER_POSITION_ID;
if (!baseUrl || !ownerToken || !otherToken || !ownerPositionId) {
  throw new Error("需要 OFFERMAP_URL、两个测试账号 Token 和账号 A 的岗位 ID 才能执行线上双账号隔离测试");
}

async function request(token) {
  return fetch(`${baseUrl}/api/positions/${ownerPositionId}/analysis`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

const owner = await request(ownerToken);
const other = await request(otherToken);
const anonymous = await request("");
assert.equal(owner.status, 200, "账号 A 应能读取自己的岗位分析");
assert.ok([403, 404].includes(other.status), `账号 B 不应读取账号 A 的岗位，实际状态 ${other.status}`);
assert.equal(anonymous.status, 401, "未登录访问必须被拒绝");
console.log("OfferMap 线上双账号隔离测试通过：本人可读、其他账号不可读、匿名访问被拒绝。");
