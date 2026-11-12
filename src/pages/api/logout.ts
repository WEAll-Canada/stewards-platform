import type { APIRoute } from "astro";
import { endSession } from "../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const header = await endSession(request);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/stewards",
      "Set-Cookie": header,
    },
  });
};
