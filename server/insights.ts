import type { DB } from "./db.ts";
import { filterSql, parseQuery } from "./employees.ts";
import { summarize, type Role } from "./domain.ts";
import { z } from "zod";
type Row = {
  id: number;
  name: string;
  salary: number;
  department: string;
  jobTitle: string;
  country: string;
  employmentType: string;
  currency: string;
  joiningDate: string;
};
export const fxRates: Record<string, number> = {
  INR: 0.012,
  USD: 1,
  GBP: 1.27,
  EUR: 1.09,
  SGD: 0.74,
  CAD: 0.73,
};
export const tenureAsOf = "2026-10-14";
export function tenureBand(joiningDate: string, asOf = tenureAsOf) {
  const start = new Date(joiningDate + "T00:00:00Z"),
    end = new Date(asOf + "T00:00:00Z");
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  if (
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() &&
      end.getUTCDate() < start.getUTCDate())
  )
    years--;
  return years < 1
    ? "Under 1 year"
    : years < 3
      ? "1–2 years"
      : years < 5
        ? "3–4 years"
        : years < 10
          ? "5–9 years"
          : "10+ years";
}
export async function insights(db: DB, raw: unknown, role: Role) {
  const q = parseQuery(raw, role);
  const view = z
    .object({ view: z.enum(["local", "usd"]).default("local") })
    .parse(raw).view;
  const normalized = view === "usd";
  const currency = normalized ? "USD" : q.currency || "INR";
  const groupBy = z
    .object({
      groupBy: z
        .enum(["department", "country", "jobTitle", "employmentType"])
        .default("department"),
    })
    .parse(raw).groupBy;
  const { where, params } = filterSql({
    ...q,
    currency: normalized ? q.currency : currency,
  });
  const rows = (await db
    .prepare(
      "SELECT id,name,salary_minor AS salary,department,job_title AS jobTitle,country,employment_type AS employmentType,currency,joining_date AS joiningDate FROM employees" +
        where,
    )
    .all(...params)) as Row[];
  const originalRows = rows.map((row) => ({ ...row }));
  if (normalized)
    for (const row of rows)
      row.salary = Math.round(row.salary * fxRates[row.currency]);
  const grouped = new Map<string, number[]>();
  const peers = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row[groupBy];
    const values = grouped.get(key) ?? [];
    values.push(row.salary);
    grouped.set(key, values);
  }
  for (const row of originalRows) {
    const peerKey = `${row.country}|${row.currency}|${row.jobTitle}|${row.employmentType}`;
    const values = peers.get(peerKey) ?? [];
    values.push(row);
    peers.set(peerKey, values);
  }
  const safe = (values: number[]) => {
    const s = summarize(values);
    if (!s.count) return null;
    if (role === "HR_MANAGER") return s;
    if (s.count < 5) return null;
    const { min: _min, max: _max, ...aggregate } = s;
    return aggregate;
  };
  const groups = [...grouped]
    .map(([name, values]) => ({ name, stats: safe(values) }))
    .filter((g) => g.stats !== null)
    .sort((a, b) => b.stats!.count - a.stats!.count);
  const summary = safe(rows.map((r) => r.salary));
  const outliers: {
    id: number;
    name: string;
    salary: number;
    jobTitle: string;
    country: string;
    kind: string;
  }[] = [];
  if (role === "HR_MANAGER")
    for (const group of peers.values()) {
      if (group.length < 5) continue;
      const s = summarize(group.map((r) => r.salary));
      const iqr = s.p75 - s.p25;
      if (iqr === 0) continue;
      for (const row of group)
        if (row.salary < s.p25 - 1.5 * iqr || row.salary > s.p75 + 1.5 * iqr)
          outliers.push({
            id: row.id,
            name: row.name,
            salary: normalized
              ? Math.round(row.salary * fxRates[row.currency])
              : row.salary,
            jobTitle: row.jobTitle,
            country: row.country,
            kind: row.salary < s.median ? "Below range" : "Above range",
          });
    }
  // Fixed edges for each currency avoid revealing individual salaries through bin edges.
  const step = currency === "INR" ? 100000000 : 2500000;
  const bands = Array.from({ length: 6 }, (_, i) => ({
    label:
      i === 5
        ? `${(step * i) / 100}+`
        : `${(step * i) / 100}–${(step * (i + 1)) / 100}`,
    count: rows.filter(
      (r) => r.salary >= step * i && (i === 5 || r.salary < step * (i + 1)),
    ).length,
  }));
  const tenure = [
    "Under 1 year",
    "1–2 years",
    "3–4 years",
    "5–9 years",
    "10+ years",
  ]
    .map((name) => ({
      name,
      stats: safe(
        rows
          .filter((row) => tenureBand(row.joiningDate) === name)
          .map((row) => row.salary),
      ),
    }))
    .filter((group) => group.stats !== null);
  return {
    view,
    approximate: normalized,
    fx: normalized
      ? {
          rates: fxRates,
          description:
            "Illustrative static USD rates; not live or suitable for payroll.",
        }
      : null,
    tenureAsOf,
    tenure,
    currency,
    groupBy,
    summary,
    groups,
    bands: role === "HR_MANAGER" ? bands : [],
    outliers: role === "HR_MANAGER" ? outliers.slice(0, 20) : [],
    outlierCount: role === "HR_MANAGER" ? outliers.length : 0,
    filteredHeadcount: rows.length,
    organizationHeadcount: (
      (await db.prepare("SELECT count(*) AS n FROM employees").get()) as {
        n: number;
      }
    ).n,
  };
}
