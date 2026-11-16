import type { APIRoute } from "astro";
import { currentUser } from "../../../lib/auth";
import { listEventsForUser } from "../../../lib/db";
import { buildIcsCalendar } from "../../../lib/ics";

export const GET: APIRoute = async ({ request }) => {
  const user = await currentUser(request);
  if (!user || user.status !== "active") {
    return new Response("Sign in required.", { status: 401 });
  }

  const events = await listEventsForUser(user.id);
  const body = buildIcsCalendar(
    events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      location: e.location,
    })),
  );

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="weall-stewards-events.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
};
