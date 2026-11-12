import { expect, test } from "@playwright/test";

let visitor = 0;
const asVisitor = () => ({ "cf-connecting-ip": `10.1.${process.pid % 250}.${++visitor}` });
const TOKEN = "test-token";

test("POST /api/login signs in the seeded admin", async ({ request }) => {
  const res = await request.post("/api/login", {
    headers: asVisitor(),
    data: {
      email: "admin@weallcanada.local",
      password: "local-admin-pass",
      turnstileToken: TOKEN,
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.redirect).toBe("/stewards/admin");
  const cookie = res.headers()["set-cookie"] ?? "";
  expect(cookie).toContain("steward_session=");
});

test("POST /api/login rejects a bad password", async ({ request }) => {
  const res = await request.post("/api/login", {
    headers: asVisitor(),
    data: {
      email: "admin@weallcanada.local",
      password: "wrong-password",
      turnstileToken: TOKEN,
    },
  });
  expect(res.status()).toBe(401);
});

test("admin can approve a pending application", async ({ request }) => {
  const email = `applicant-${Date.now()}@example.com`;
  const applied = await request.post("/api/apply", {
    headers: asVisitor(),
    data: {
      name: "New Applicant",
      email,
      password: "password123",
      profile_type: "steward",
      contact_links: "https://example.com · hello@example.com",
      regions: "Canada (national)",
      map_address: "Queen St. & Bathurst St., Toronto",
      sector: "NGO",
      sector_other: "",
      interests: ["Community Economics", "Climate", "Justice & Equity"],
      interest_other: "",
      about: "I want to join the alliance and learn with stewards.",
      charter_agreed: true,
      turnstileToken: TOKEN,
    },
  });
  expect(applied.status()).toBe(201);
  const { applicationId } = await applied.json();
  expect(applicationId).toBeTruthy();

  const login = await request.post("/api/login", {
    headers: asVisitor(),
    data: {
      email: "admin@weallcanada.local",
      password: "local-admin-pass",
      turnstileToken: TOKEN,
    },
  });
  expect(login.status()).toBe(200);
  const cookie = login.headers()["set-cookie"]?.split(";")[0] ?? "";

  const review = await request.post("/api/admin/applications", {
    headers: { ...asVisitor(), cookie, "Content-Type": "application/json" },
    data: { applicationId: Number(applicationId), decision: "approved" },
  });
  expect(review.status()).toBe(200);

  const stewardLogin = await request.post("/api/login", {
    headers: asVisitor(),
    data: { email, password: "password123", turnstileToken: TOKEN },
  });
  expect(stewardLogin.status()).toBe(200);
  expect((await stewardLogin.json()).redirect).toBe("/stewards/dashboard");
});

test("migrating steward can activate without the full survey", async ({ request }) => {
  const email = `activate-${Date.now()}@example.com`;
  const landing = await request.get("/stewards/login");
  expect(landing.status()).toBe(200);
  const landingHtml = await landing.text();
  expect(landingHtml).toContain("/stewards/activate");
  expect(landingHtml).toContain("Activate your account");

  const activated = await request.post("/api/activate", {
    headers: asVisitor(),
    data: {
      name: "Returning Steward",
      email,
      password: "password123",
      note: "Was in Central Circle on the old site.",
      confirm_existing: true,
      charter_agreed: true,
      turnstileToken: TOKEN,
    },
  });
  expect(activated.status()).toBe(201);
  const { applicationId } = await activated.json();
  expect(applicationId).toBeTruthy();

  const cookie = activated.headers()["set-cookie"]?.split(";")[0] ?? "";
  const pending = await request.get("/stewards/pending", { headers: { cookie } });
  expect(pending.status()).toBe(200);

  const adminLogin = await request.post("/api/login", {
    headers: asVisitor(),
    data: {
      email: "admin@weallcanada.local",
      password: "local-admin-pass",
      turnstileToken: TOKEN,
    },
  });
  const adminCookie = adminLogin.headers()["set-cookie"]?.split(";")[0] ?? "";
  const adminPage = await request.get("/stewards/admin", { headers: { cookie: adminCookie } });
  expect(adminPage.status()).toBe(200);
  const adminHtml = await adminPage.text();
  expect(adminHtml).toContain("Activation");
  expect(adminHtml).toContain(email);

  const review = await request.post("/api/admin/applications", {
    headers: { ...asVisitor(), cookie: adminCookie, "Content-Type": "application/json" },
    data: { applicationId: Number(applicationId), decision: "approved" },
  });
  expect(review.status()).toBe(200);
});
