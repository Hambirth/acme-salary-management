import type { IncomingMessage, ServerResponse } from "node:http";
import { openDatabase } from "../server/db.ts";
import { createApp } from "../server/app.ts";

// Reuse the connection and Express app within a warm Vercel instance.
// The database is external and durable; no /tmp database or runtime seed is used.
const application = openDatabase().then(createApp);
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const app = await application;
  return app(request, response);
}
