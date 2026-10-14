import type { Request } from "express";
export function browserOrigin(
  req: Pick<Request, "get" | "protocol">,
  vercel = Boolean(process.env.VERCEL),
  configured = process.env.APP_ORIGIN,
) {
  if (configured) return configured;
  // Vercel rewrites may use an internal Host; its gateway supplies the public origin.
  // Never trust forwarded headers when running outside that gateway.
  const host = vercel
    ? (req.get("x-forwarded-host") ?? req.get("host"))
    : req.get("host");
  const protocol = vercel
    ? (req.get("x-forwarded-proto") ?? req.protocol)
    : req.protocol;
  return `${protocol}://${host}`;
}
