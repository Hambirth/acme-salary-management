import type { DB } from "./db.ts";
import {
  AppError,
  countries,
  employeeSchema,
  minorUnits,
  type Role,
} from "./domain.ts";
import { z } from "zod";
export type Employee = {
  id: number;
  name: string;
  email: string;
  country: string;
  currency: string;
  department: string;
  jobTitle: string;
  employmentType: string;
  salaryMinor?: number;
  joiningDate: string;
  version: number;
};
const columns =
  "id,name,email,country,currency,department,job_title AS jobTitle,employment_type AS employmentType,salary_minor AS salaryMinor,joining_date AS joiningDate,version";
const querySchema = z.object({
  search: z.string().max(100).default(""),
  country: z.string().max(60).default(""),
  department: z.string().max(60).default(""),
  currency: z.enum(["", "INR", "USD", "GBP", "EUR", "SGD", "CAD"]).default(""),
  jobTitle: z.string().max(80).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "salary", "joiningDate"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});
export function parseQuery(raw: unknown, role: Role = "HR_MANAGER") {
  const q = querySchema.parse(raw);
  if (role === "VIEWER" && q.sort === "salary")
    throw new AppError(403, "Salary sorting is restricted to HR.");
  return q;
}
export function filterSql(q: ReturnType<typeof parseQuery>) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (q.search) {
    clauses.push(
      "(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR job_title LIKE ? ESCAPE '\\')",
    );
    const term = "%" + q.search.replace(/[\\%_]/g, "\\$&") + "%";
    params.push(term, term, term);
  }
  for (const [column, value] of [
    ["country", q.country],
    ["department", q.department],
    ["currency", q.currency],
    ["job_title", q.jobTitle],
  ])
    if (value) {
      clauses.push(`${column}=?`);
      params.push(value);
    }
  return {
    where: clauses.length ? " WHERE " + clauses.join(" AND ") : "",
    params,
  };
}
export function redact(employee: Employee, role: Role) {
  if (role === "HR_MANAGER") return employee;
  const { salaryMinor: _salary, ...safe } = employee;
  return safe;
}
export async function listEmployees(
  db: DB,
  raw: unknown,
  role: Role,
  exportAll = false,
) {
  const q = parseQuery(raw, role);
  const { where, params } = filterSql(q);
  const order = {
    name: "name",
    salary: "salary_minor",
    joiningDate: "joining_date",
  }[q.sort];
  const total = Number(
    (
      (await db
        .prepare("SELECT count(*) AS count FROM employees" + where)
        .get(...params)) as {
        count: number;
      }
    ).count,
  );
  const rows = (await db
    .prepare(
      `SELECT ${columns} FROM employees${where} ORDER BY ${order} ${q.direction},id ${q.direction}${exportAll ? "" : " LIMIT ? OFFSET ?"}`,
    )
    .all(
      ...params,
      ...(exportAll ? [] : [q.pageSize, (q.page - 1) * q.pageSize]),
    )) as Employee[];
  return {
    items: rows.map((e) => redact(e, role)),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function getEmployee(db: DB, id: number) {
  const row = (await db
    .prepare(`SELECT ${columns} FROM employees WHERE id=?`)
    .get(id)) as Employee | undefined;
  if (!row) throw new AppError(404, "Employee not found.");
  return row;
}
export async function saveEmployee(
  db: DB,
  body: unknown,
  actor: string,
  id?: number,
  requestId?: string,
) {
  const input = employeeSchema.parse(body);
  const values = [
    input.name,
    input.email,
    input.country,
    countries[input.country],
    input.department,
    input.jobTitle,
    input.employmentType,
    minorUnits(input.salary),
    input.joiningDate,
  ];
  const transaction = await db.transaction();
  const tx = transaction.db;
  try {
    const before = id ? await getEmployee(tx, id) : null;
    if (id) {
      const version = z
        .object({ version: z.number().int().positive() })
        .parse(body).version;
      const result = await tx
        .prepare(
          "UPDATE employees SET name=?,email=?,country=?,currency=?,department=?,job_title=?,employment_type=?,salary_minor=?,joining_date=?,version=version+1 WHERE id=? AND version=?",
        )
        .run(...values, id, version);
      if (!result.changes)
        throw new AppError(
          409,
          "This employee changed since you opened it. Reload and try again.",
        );
    } else
      id = Number(
        (
          await tx
            .prepare(
              "INSERT INTO employees(name,email,country,currency,department,job_title,employment_type,salary_minor,joining_date) VALUES(?,?,?,?,?,?,?,?,?)",
            )
            .run(...values)
        ).lastInsertRowid,
      );
    const after = await getEmployee(tx, id);
    await tx
      .prepare(
        "INSERT INTO audit(actor,action,employee_id,employee_name,details) VALUES(?,?,?,?,?)",
      )
      .run(
        actor,
        before ? "Updated" : "Created",
        id,
        input.name,
        JSON.stringify({ before, after }),
      );
    if (requestId)
      await tx
        .prepare(
          "INSERT INTO audit_requests(audit_id,request_id) VALUES((SELECT max(id) FROM audit),?)",
        )
        .run(requestId);
    await transaction.commit();
    return after;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
export async function deleteEmployee(
  db: DB,
  id: number,
  version: number,
  actor: string,
  requestId?: string,
) {
  const transaction = await db.transaction();
  const tx = transaction.db;
  try {
    const before = await getEmployee(tx, id);
    const result = await tx
      .prepare("DELETE FROM employees WHERE id=? AND version=?")
      .run(id, version);
    if (!result.changes)
      throw new AppError(
        409,
        "This employee has changed. Reload before deleting.",
      );
    await tx
      .prepare(
        "INSERT INTO audit(actor,action,employee_id,employee_name,details) VALUES(?,?,?,?,?)",
      )
      .run(actor, "Deleted", id, before.name, JSON.stringify({ before }));
    if (requestId)
      await tx
        .prepare(
          "INSERT INTO audit_requests(audit_id,request_id) VALUES((SELECT max(id) FROM audit),?)",
        )
        .run(requestId);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
