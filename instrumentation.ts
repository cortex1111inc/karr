import type { Instrumentation } from "next";

// Every unhandled server error (render, action, route handler) lands here.
// Logged as one scrubbed JSON line. To forward to an error tracker such as
// Sentry, call it from here — see db/OPERATIONS.md.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { log } = await import("@/lib/log");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  log.error("request_error", {
    message: err instanceof Error ? err.message : String(err),
    digest,
    // Path only — the query string can carry tokens and phone numbers.
    path: request.path.split("?")[0],
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
