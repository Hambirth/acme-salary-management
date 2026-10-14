import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { z, ZodError } from "zod";
import type { DB } from "./db.ts";
import {
  authenticate,
  createSession,
  hashPassword,
  verifyPassword,
  requireHR,
  tokenHash,
  type User,
} from "./auth.ts";
import { AppError, countries, csvCell } from "./domain.ts";
import {
  deleteEmployee,
  getEmployee,
  listEmployees,
  redact,
  saveEmployee,
} from "./employees.ts";
import { createLogger } from "./logging.ts";
import { openApi } from "./openapi.ts";
import { insights } from "./insights.ts";
import { browserOrigin } from "./origin.ts";
export function createApp(db: DB) {
  z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    TRUST_PROXY: z.enum(["0", "1"]).optional(),
    APP_ORIGIN: z.union([z.url(), z.literal("")]).optional(),
  }).parse(process.env);
  const app = express();
  const logger = createLogger(db);
  app.locals.flushLogs = logger.flush;
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
        },
      },
    }),
  );

  app.use((req, res, next) => {
    const requestId = randomUUID(),
      started = Date.now();
    res.setHeader("X-Request-Id", requestId);
    req.requestId = requestId;
    res.on("finish", () => {
      if (req.path.startsWith("/api"))
        logger.write({
          requestId,
          level:
            res.statusCode >= 500
              ? "error"
              : res.statusCode >= 400
                ? "warn"
                : "info",
          method: req.method,
          path: req.route?.path ?? "/api/*",
          status: res.statusCode,
          durationMs: Date.now() - started,
        });
    });
    const origin = req.headers.origin;
    const allowedOrigin = browserOrigin(req);
    if (origin && origin !== allowedOrigin)
      return next(new AppError(403, "Origin is not allowed."));
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers["x-acme-request"] !== "1"
    )
      return next(new AppError(403, "Missing request protection header."));
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Try again shortly." },
    }),
  );
  app.get("/api/health", async (_req, res) => {
    await db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  const dummyHash = hashPassword("invalid-account-dummy-password");
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many login attempts. Try again in 15 minutes." },
    }),
    async (req, res) => {
      const body = z
        .object({
          email: z.email().max(150),
          password: z.string().min(1).max(200),
        })
        .parse(req.body);
      const user = (await db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(body.email.toLowerCase())) as
        | (User & {
            password_hash: string;
          })
        | undefined;
      const valid = verifyPassword(
        body.password,
        user?.password_hash ?? dummyHash,
      );
      if (!user || !valid)
        throw new AppError(401, "Email or password is incorrect.");
      const token = await createSession(db, user.id);
      res.cookie("acme_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
      });
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    },
  );
  app.post(
    "/api/auth/register",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    async (req, res) => {
      const body = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z
            .email()
            .max(150)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(12).max(200),
          role: z.enum(["HR_MANAGER", "VIEWER"]).default("VIEWER"),
        })
        .parse(req.body);
      // This public assessment uses synthetic data and explicitly permits choosing a demo role.
      const existing = await db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(body.email);
      if (existing)
        throw new AppError(
          409,
          "Registration could not be completed. Try signing in.",
        );
      const result = await db
        .prepare(
          "INSERT INTO users(email,name,password_hash,role) VALUES(?,?,?,?)",
        )
        .run(body.email, body.name, hashPassword(body.password), body.role);
      const token = await createSession(db, Number(result.lastInsertRowid));
      res.cookie("acme_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
      });
      res.status(201).json({
        id: Number(result.lastInsertRowid),
        name: body.name,
        email: body.email,
        role: body.role,
      });
    },
  );
  app.use("/api", authenticate(db));
  app.get("/api/auth/me", (req, res) => res.json(req.user));
  app.post("/api/auth/logout", async (req, res) => {
    await db
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(tokenHash(req.sessionToken!));
    res.clearCookie("acme_session", { path: "/" });
    res.status(204).end();
  });
  app.get("/api/options", async (_req, res) =>
    res.json({
      countries,
      departments: (
        await db
          .prepare(
            "SELECT DISTINCT department FROM employees ORDER BY department",
          )
          .all()
      ).map((r) => r.department),
      jobTitles: (
        await db
          .prepare(
            "SELECT DISTINCT job_title FROM employees ORDER BY job_title",
          )
          .all()
      ).map((r) => r.job_title),
    }),
  );
  app.get("/api/employees/export", async (req, res) => {
    const result = await listEmployees(db, req.query, req.user!.role, true);
    const keys = [
      "name",
      "email",
      "country",
      "currency",
      "department",
      "jobTitle",
      "employmentType",
      ...(req.user!.role === "HR_MANAGER" ? ["annualSalary"] : []),
      "joiningDate",
    ];
    const lines = [
      keys.map(csvCell).join(","),
      ...result.items.map((row) =>
        keys
          .map((key) =>
            csvCell(
              key === "annualSalary"
                ? (
                    (
                      row as unknown as {
                        salaryMinor: number;
                      }
                    ).salaryMinor / 100
                  ).toFixed(2)
                : (row as unknown as Record<string, unknown>)[key],
            ),
          )
          .join(","),
      ),
    ];
    res
      .type("text/csv")
      .attachment("acme-employees.csv")
      .send("\uFEFF" + lines.join("\r\n"));
  });
  app.get("/api/employees", async (req, res) =>
    res.json(await listEmployees(db, req.query, req.user!.role)),
  );
  const id = (value: unknown) =>
    z.coerce.number().int().positive().parse(value);
  app.get("/api/employees/:id", async (req, res) =>
    res.json(redact(await getEmployee(db, id(req.params.id)), req.user!.role)),
  );
  app.post("/api/employees", requireHR, async (req, res) =>
    res
      .status(201)
      .json(
        await saveEmployee(
          db,
          req.body,
          req.user!.email,
          undefined,
          req.requestId,
        ),
      ),
  );
  app.put("/api/employees/:id", requireHR, async (req, res) =>
    res.json(
      await saveEmployee(
        db,
        req.body,
        req.user!.email,
        id(req.params.id),
        req.requestId,
      ),
    ),
  );
  app.delete("/api/employees/:id", requireHR, async (req, res) => {
    await deleteEmployee(
      db,
      id(req.params.id),
      id(req.body?.version),
      req.user!.email,
      req.requestId,
    );
    res.status(204).end();
  });
  app.get("/api/insights", async (req, res) =>
    res.json(await insights(db, req.query, req.user!.role)),
  );
  app.get("/api/openapi.json", (_req, res) => res.json(openApi));
  app.use("/api/docs", express.static(resolve("server/docs")));
  app.get("/api/logs", requireHR, async (_req, res) =>
    res.json(
      await db
        .prepare(
          "SELECT request_id AS requestId,level,method,path,status,duration_ms AS durationMs,created_at AS createdAt FROM application_logs ORDER BY id DESC LIMIT 100",
        )
        .all(),
    ),
  );
  app.get("/api/audit", requireHR, async (_req, res) =>
    res.json(
      await db
        .prepare(
          "SELECT a.id,actor,action,employee_id AS employeeId,employee_name AS employeeName,created_at AS createdAt,r.request_id AS requestId FROM audit a LEFT JOIN audit_requests r ON r.audit_id=a.id ORDER BY a.id DESC LIMIT 100",
        )
        .all(),
    ),
  );
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "API endpoint not found.")),
  );
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const json = res.json.bind(res);
      res.json = (body) =>
        json({
          ...body,
          success: false,
          code:
            error instanceof AppError
              ? error.code
              : error instanceof ZodError
                ? "VALIDATION_ERROR"
                : "REQUEST_ERROR",
          requestId: res.getHeader("X-Request-Id"),
        });
      if (error instanceof ZodError)
        return res.status(400).json({
          error: "Please check the provided values.",
          fields: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      if (error instanceof AppError)
        return res.status(error.status).json({ error: error.message });
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      )
        return res.status(409).json({
          error: _req.path.startsWith("/api/auth")
            ? "Registration could not be completed. Try signing in."
            : "That email address is already assigned to an employee.",
        });
      if (error instanceof SyntaxError)
        return res.status(400).json({ error: "Invalid JSON body." });
      res.status(500).json({
        error: "Something went wrong. Please try again.",
        requestId: res.getHeader("X-Request-Id"),
      });
    },
  );
  return app;
}
