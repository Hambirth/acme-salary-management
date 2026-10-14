import { z } from "zod";
export const countries = {
  India: "INR",
  "United States": "USD",
  "United Kingdom": "GBP",
  Germany: "EUR",
  Singapore: "SGD",
  Canada: "CAD",
} as const;
export type Role = "HR_MANAGER" | "VIEWER";
export const employeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(150)
    .transform((x) => x.toLowerCase()),
  country: z.enum(
    Object.keys(countries) as [
      keyof typeof countries,
      ...(keyof typeof countries)[],
    ],
  ),
  department: z.string().trim().min(2).max(60),
  jobTitle: z.string().trim().min(2).max(80),
  employmentType: z.enum(["Full-time", "Part-time", "Contract"]),
  salary: z
    .string()
    .regex(
      /^\d{1,9}(\.\d{1,2})?$/,
      "Enter a positive amount with up to two decimal places",
    )
    .refine((x) => Number(x) > 0),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (x) =>
        !Number.isNaN(Date.parse(x)) &&
        new Date(x).toISOString().slice(0, 10) === x &&
        x <= new Date().toISOString().slice(0, 10),
      "Enter a valid joining date that is not in the future",
    ),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
export function minorUnits(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  return (
    sorted[lower] +
    (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower)
  );
}
export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    total,
    average: sorted.length ? total / sorted.length : 0,
    median: quantile(sorted, 0.5),
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
  };
}
export function csvCell(value: unknown): string {
  let str = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(str)) str = "'" + str;
  return '"' + str.replaceAll('"', '""') + '"';
}
export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
