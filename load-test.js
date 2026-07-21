import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },  // warm up
    { duration: "1m",  target: 200 }, // target: 200 concurrent users
    { duration: "30s", target: 200 }, // hold
    { duration: "30s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% ตอบใน 3s
    http_req_failed:   ["rate<0.05"],  // error < 5%
  },
};

const BASE = "https://odoo-issue-log.scg.com";

export default function () {
  // Login page
  let r = http.get(`${BASE}/login`);
  check(r, { "login page 200": (res) => res.status === 200 });
  sleep(1);

  // Dashboard (redirect to login ถ้าไม่มี session = ปกติ)
  r = http.get(`${BASE}/dashboard`);
  check(r, { "dashboard reachable": (res) => res.status < 500 });
  sleep(1);

  // Issues list
  r = http.get(`${BASE}/issues`);
  check(r, { "issues reachable": (res) => res.status < 500 });
  sleep(1);
}
