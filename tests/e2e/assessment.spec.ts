import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role: "hr" | "viewer") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${role}@acme.example`);
  await page.getByLabel("Password", { exact: true }).fill("AssessmentDemo42!");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your people. The bigger picture." }),
  ).toBeVisible();
}
test("HR analytics, filters, precise salary CRUD, audit and Swagger", async ({
  page,
}) => {
  await login(page, "hr");
  await expect(
    page.getByRole("heading", { name: "Pay versus tenure" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Minimum" }).first(),
  ).toBeVisible();
  await page.getByLabel("Salary view").selectOption("usd");
  await expect(page.getByText(/Approximate USD conversion/)).toBeVisible();
  await page.getByLabel("Group salaries by").selectOption("employmentType");
  await expect(
    page.getByText("Full-time", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Employees", exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/employees$/);
  await page
    .getByLabel("Job title", { exact: true })
    .selectOption("Software Engineer");
  await expect(page.getByRole("table")).toContainText("Software Engineer");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("acme-employees.csv");
  await page.getByLabel("Job title", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog");
  const name = `Browser Employee ${test.info().project.name}`;
  await dialog.getByLabel("Full name").fill(name);
  await dialog
    .getByLabel("Work email")
    .fill(`browser-${test.info().project.name}@acme.example`);
  await dialog
    .getByLabel("Annual base salary", { exact: false })
    .fill("123456.78");
  await dialog.getByLabel("Joining date").fill("2020-01-01");
  await dialog
    .getByRole("button", { name: "Add employee", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Search employees").fill(name);
  await expect(page.getByRole("table")).toContainText(name);
  await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  await expect(
    dialog.getByLabel("Annual base salary", { exact: false }),
  ).toHaveValue("123456.78");
  await dialog
    .getByLabel("Annual base salary", { exact: false })
    .fill("123456.79");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: `Delete ${name}`, exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Delete employee", exact: true })
    .click();
  await expect(
    page.getByText("No employees found.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activity log" }).click();
  const auditTable = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "Changed by" }) });
  await expect(auditTable).toContainText(name);
  await expect(
    auditTable.getByRole("columnheader", { name: "Request ID" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Application logs" }),
  ).toBeVisible();
  await page.goto("/api/docs/");
  await expect(
    page.getByRole("heading", {
      name: "ACME Salary Management API",
      exact: false,
    }),
  ).toBeVisible();
});
test("Viewer privacy enforced in UI and API; protected URL and logout", async ({
  page,
}) => {
  await login(page, "viewer");
  await expect(page.getByRole("columnheader", { name: "Minimum" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Compensation review" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Employees", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "Add employee" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("columnheader", { name: "Annual salary" }),
  ).toHaveCount(0);
  const data = await (await page.request.get("/api/employees")).json();
  expect(data.items[0]).not.toHaveProperty("salaryMinor");
  expect((await page.request.get("/api/audit")).status()).toBe(403);
  await page.goto("/app/audit");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to workspace" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/app/employees");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
test("Registration, refresh routing and unknown page", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("New Demo Viewer");
  await page
    .getByLabel("Email address")
    .fill(`register-${test.info().project.name}@acme.example`);
  await page.getByLabel("Password", { exact: true }).fill("NewDemoPassword42!");
  await page.getByRole("button", { name: "Create account →" }).click();
  await expect(
    page.getByRole("heading", { name: "Your people. The bigger picture." }),
  ).toBeVisible();
  await page.goto("/app/employees");
  await expect(
    page.getByRole("heading", { name: "Good decisions start with good data." }),
  ).toBeVisible();
  await page.goto("/not-a-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
