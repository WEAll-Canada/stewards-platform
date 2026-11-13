import { expect, test } from "@playwright/test";

let visitor = 0;
const asVisitor = () => ({ "cf-connecting-ip": `10.2.${process.pid % 250}.${++visitor}` });
const TOKEN = "test-token";

async function login(request: any, email: string, password = "local-admin-pass") {
  const res = await request.post("/api/login", {
    headers: asVisitor(),
    data: { email, password, turnstileToken: TOKEN },
  });
  expect(res.status()).toBe(200);
  return res.headers()["set-cookie"]?.split(";")[0] ?? "";
}

test("active steward can update profile preferences", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const res = await request.post("/api/profile", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      display_name: "Alex Steward Updated",
      bio: "Updated bio for tests.",
      location: "Montreal",
      partner_org: "Local hub",
      visibility: "stewards",
      allow_directory: true,
      allow_messages: true,
      email_updates: true,
      profile_type: "steward",
      contact_links: "alex@weallcanada.local",
      regions: "Quebec",
      map_address: "",
      sector: "Network",
      sector_other: "",
      interests: ["Community Economics", "Leadership"],
      interest_other: "",
      about: "Updated about for tests.",
    },
  });
  expect(res.status()).toBe(200);
});

test("account menu opens profile and settings tabs on one page", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const dash = await request.get("/stewards/dashboard", { headers: { cookie } });
  expect(dash.status()).toBe(200);
  const dashHtml = await dash.text();
  expect(dashHtml).toContain("account-menu");
  expect(dashHtml).toContain("/stewards/profile?tab=profile");
  expect(dashHtml).toContain("/stewards/profile?tab=settings");
  expect(dashHtml).toMatch(/account-menu__with-icon[\s\S]*?>Edit profile</);
  expect(dashHtml).not.toMatch(/site-header__nav[\s\S]*?>Profile</);
  expect(dashHtml).toMatch(/account-menu__panel[\s\S]*?>Log out</);
  expect(dashHtml).not.toMatch(/site-header__actions[\s\S]*?<form method="post" action="\/api\/logout">\s*<button class="btn/);

  const profile = await request.get("/stewards/profile?tab=profile", { headers: { cookie } });
  expect(profile.status()).toBe(200);
  const profileHtml = await profile.text();
  expect(profileHtml).toContain('aria-selected="true"');
  expect(profileHtml).toContain("Save profile");

  const settings = await request.get("/stewards/profile?tab=settings", { headers: { cookie } });
  expect(settings.status()).toBe(200);
  const settingsHtml = await settings.text();
  expect(settingsHtml).toContain("Save settings");
  expect(settingsHtml).toContain("Email updates and campaigns");
});

test("steward can request a circle join and admin can approve", async ({ request }) => {
  const stewardCookie = await login(request, "alex@weallcanada.local");
  const join = await request.post("/api/circles/join", {
    headers: { cookie: stewardCookie, "Content-Type": "application/json", ...asVisitor() },
    data: { circleId: 4 }, // Liberating Tools
  });
  expect([200, 400]).toContain(join.status()); // 400 if already pending/member from prior run

  const adminCookie = await login(request, "admin@weallcanada.local");
  const adminPage = await request.get("/stewards/admin", { headers: { cookie: adminCookie } });
  expect(adminPage.status()).toBe(200);
  const html = await adminPage.text();
  if (html.includes("Liberating Tools")) {
    const sliceStart = html.indexOf("Liberating Tools");
    const slice = html.slice(Math.max(0, sliceStart - 500), sliceStart);
    const requestId = Number(slice.match(/data-kind="circle" data-id="(\d+)"/)?.[1]);
    if (requestId) {
      const review = await request.post("/api/admin/circle-joins", {
        headers: { cookie: adminCookie, "Content-Type": "application/json", ...asVisitor() },
        data: { requestId, decision: "approved" },
      });
      expect(review.status()).toBe(200);
    }
  }
});

test("directory connection and messaging work", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const connect = await request.post("/api/connections", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: { toUserId: 1, strength: 2, reasons: ["work", "learning"] },
  });
  expect(connect.status()).toBe(200);

  const dir = await request.get("/stewards/directory", { headers: { cookie } });
  expect(dir.status()).toBe(200);
  const dirHtml = await dir.text();
  expect(dirHtml).toContain("dir-grid");
  expect(dirHtml).toContain("Share connection");
  expect(dirHtml).toContain('aria-label="Message');
  expect(dirHtml).toContain("steward-avatar");

  const message = await request.post("/api/messages/steward", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: { toUserId: 1, body: "Hello from the platform test." },
  });
  expect(message.status()).toBe(200);
  const { threadId } = await message.json();
  expect(threadId).toBeTruthy();

  const messagesPage = await request.get(`/stewards/messages?thread=${threadId}`, { headers: { cookie } });
  expect(messagesPage.status()).toBe(200);
  const msgHtml = await messagesPage.text();
  expect(msgHtml).toContain("Platform Admin");
  expect(msgHtml).toContain("steward-avatar");
  // Thread list shows only the other person as the conversation title.
  const listSlice = msgHtml.match(/class="thread-list"[\s\S]*?<\/aside>/)?.[0] ?? "";
  expect(listSlice).toContain("<strong");
  expect(listSlice).toContain("Platform Admin");
  expect(listSlice).not.toContain("Alex Steward");
});

test("steward can RSVP to an event", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const res = await request.post("/api/events/rsvp", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: { eventId: 1, status: "going" },
  });
  expect(res.status()).toBe(200);
});

test("circles nav lists memberships and circle detail pages open", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const dash = await request.get("/stewards/dashboard", { headers: { cookie } });
  expect(dash.status()).toBe(200);
  const html = await dash.text();
  expect(html).toContain('data-circles-nav');
  expect(html).toMatch(/\/stewards\/circles\/[a-z0-9-]+/);
  expect(html).toContain("Events today");
  expect(html).toContain("Upcoming");

  const circle = await request.get("/stewards/circles/central", { headers: { cookie } });
  expect(circle.status()).toBe(200);
  const circleHtml = await circle.text();
  expect(circleHtml).toContain("Central Circle");
  expect(circleHtml).toContain("Members");
});

test("directory supports search and sector filter", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  // Keep this test self-contained — other tests may have changed Alex's sector.
  const prep = await request.post("/api/profile", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      display_name: "Alex Steward",
      bio: "Sample active steward in the directory.",
      location: "Montreal",
      partner_org: "Local hub",
      visibility: "stewards",
      allow_directory: true,
      allow_messages: true,
      email_updates: true,
      profile_type: "steward",
      contact_links: "alex@weallcanada.local",
      regions: "Quebec",
      map_address: "",
      sector: "NGO",
      sector_other: "",
      interests: ["Climate", "Justice & Equity", "Food & Agriculture"],
      interest_other: "",
      about: "Sample steward for local testing.",
    },
  });
  expect(prep.status()).toBe(200);

  const all = await request.get("/stewards/directory", { headers: { cookie } });
  expect(all.status()).toBe(200);
  const allHtml = await all.text();
  expect(allHtml).toContain('name="q"');
  expect(allHtml).toContain('name="sector"');
  expect(allHtml).toContain("Alex Steward");

  const filtered = await request.get("/stewards/directory?q=Alex&sector=NGO", { headers: { cookie } });
  expect(filtered.status()).toBe(200);
  const filteredHtml = await filtered.text();
  expect(filteredHtml).toContain("Alex Steward");
  expect(filteredHtml).toContain("Quebec");
  expect(filteredHtml).toMatch(/1 steward/);
});

test("events page has list/calendar views and collapsed add form", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const res = await request.get("/stewards/events", { headers: { cookie } });
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('data-view="list"');
  expect(html).toContain('data-view="calendar"');
  expect(html).toContain("data-add-event");
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Add an event");
});

test("admin can add an FAQ item", async ({ request }) => {
  const cookie = await login(request, "admin@weallcanada.local");
  const res = await request.post("/api/faq", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      question: "How do events work?",
      answer: "Open Events, RSVP, or create a new gathering for stewards.",
    },
  });
  expect(res.status()).toBe(200);
});

test("steward can ask an FAQ without an answer", async ({ request }) => {
  const cookie = await login(request, "alex@weallcanada.local");
  const res = await request.post("/api/faq", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      question: `Where do I find circle resources? ${Date.now()}`,
      answer: "",
    },
  });
  expect(res.status()).toBe(200);

  const page = await request.get("/stewards/faq", { headers: { cookie } });
  expect(page.status()).toBe(200);
  const html = await page.text();
  expect(html).toContain("Ask a question");
  expect(html).toContain("leave it blank to flag this to admins");
  expect(html).toContain("Needs an answer");
});

test("admin can reply to email and simulate a campaign", async ({ request }) => {
  const cookie = await login(request, "admin@weallcanada.local");
  const inbox = await request.get("/stewards/email?tab=inbox", { headers: { cookie } });
  expect(inbox.status()).toBe(200);
  const inboxHtml = await inbox.text();
  expect(inboxHtml).toContain('aria-selected="true"');
  expect(inboxHtml).toContain("Workshop follow-up");
  expect(inboxHtml).toContain('name="q"');

  const filtered = await request.get("/stewards/email?tab=inbox&q=Halifax", { headers: { cookie } });
  expect(filtered.status()).toBe(200);
  const filteredHtml = await filtered.text();
  expect(filteredHtml).toContain("Volunteer offer from Halifax");
  expect(filteredHtml).not.toContain("Workshop follow-up");

  const campaigns = await request.get("/stewards/email?tab=campaigns", { headers: { cookie } });
  expect(campaigns.status()).toBe(200);
  const campaignsHtml = await campaigns.text();
  expect(campaignsHtml).toContain("New campaign");
  expect(campaignsHtml).toContain('id="tab-campaigns"');

  const reply = await request.post("/api/email/reply", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: { threadId: 1, body: "Thanks again — simulated reply from tests." },
  });
  expect(reply.status()).toBe(200);
  expect((await reply.json()).mode).toBe("simulated");

  // Discover opt-in count via mismatch
  const probe = await request.post("/api/email/campaigns", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      name: "Test campaign",
      subject: "Hello stewards",
      body: "This is a simulated campaign.",
      confirmCount: -1,
    },
  });
  expect(probe.status()).toBe(400);
  const { recipientCount } = await probe.json();
  expect(recipientCount).toBeGreaterThan(0);

  const send = await request.post("/api/email/campaigns", {
    headers: { cookie, "Content-Type": "application/json", ...asVisitor() },
    data: {
      name: "Test campaign",
      subject: "Hello stewards",
      body: "This is a simulated campaign.",
      confirmCount: recipientCount,
    },
  });
  expect(send.status()).toBe(200);
  expect((await send.json()).mode).toBe("simulated");
});
