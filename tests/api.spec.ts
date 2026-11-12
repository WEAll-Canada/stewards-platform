import { expect, test } from "@playwright/test";

// Each test acts as its own visitor so rate limits don't carry over between tests.
// (Locally the Worker reads the visitor from this header; Cloudflare sets it in production.)
let visitor = 0;
const asVisitor = () => ({ "cf-connecting-ip": `10.0.${process.pid % 250}.${++visitor}` });
// Locally, any non-empty token passes Turnstile's always-pass test secret.
const TOKEN = "test-token";

test("GET /api/messages returns seed data", async ({ request }) => {
  const res = await request.get("/api/messages");
  expect(res.status()).toBe(200);
  const { messages } = await res.json();
  expect(messages.map((m: { name: string }) => m.name)).toContain("Sample Visitor");
});

test("POST /api/messages saves a message to the database", async ({ request }) => {
  const body = `Hello from the API test ${Date.now()}`;
  const created = await request.post("/api/messages", {
    headers: asVisitor(),
    data: { name: "API Test", body, turnstileToken: TOKEN },
  });
  expect(created.status()).toBe(201);

  const { messages } = await (await request.get("/api/messages")).json();
  expect(messages.map((m: { body: string }) => m.body)).toContain(body);
});

test("POST /api/messages rejects a blank name", async ({ request }) => {
  const res = await request.post("/api/messages", {
    headers: asVisitor(),
    data: { name: "  ", body: "hi", turnstileToken: TOKEN },
  });
  expect(res.status()).toBe(400);
});

test("POST /api/messages rejects a submission without the spam check", async ({ request }) => {
  const res = await request.post("/api/messages", {
    headers: asVisitor(),
    data: { name: "No Token", body: "hi" },
  });
  expect(res.status()).toBe(400);
});

test("POST /api/messages limits each visitor to 5 submissions a minute", async ({ request }) => {
  const headers = asVisitor();
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await request.post("/api/messages", {
      headers,
      data: { name: "Rate Test", body: `try ${i}`, turnstileToken: TOKEN },
    });
    statuses.push(res.status());
  }
  expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
  expect(statuses[5]).toBe(429);
});
