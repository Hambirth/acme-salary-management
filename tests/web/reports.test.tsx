import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StatisticsTable } from "../../src/features/StatisticsTable";
import { Login } from "../../src/features/Login";
const groups = [
  {
    name: "Engineering",
    stats: {
      count: 10,
      total: 100000,
      average: 10000,
      median: 10000,
      p25: 9000,
      p75: 11000,
      min: 8000,
      max: 12000,
    },
  },
];
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
test("HR reports expose all salary statistics", () => {
  render(
    <StatisticsTable
      title="Detailed salary statistics"
      groups={groups}
      currency="USD"
      hr
    />,
  );
  for (const name of ["Minimum", "Maximum", "P25", "P75", "Average", "Median"])
    expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
});
test("Viewer reports omit individual extremes", () => {
  render(
    <StatisticsTable
      title="Pay versus tenure"
      groups={groups}
      currency="USD"
      hr={false}
    />,
  );
  expect(
    screen.queryByRole("columnheader", { name: "Minimum" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("columnheader", { name: "Maximum" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Groups of five/)).toBeInTheDocument();
});
test("No reportable groups has a useful empty state", () => {
  render(
    <StatisticsTable title="Report" groups={[]} currency="USD" hr={false} />,
  );
  expect(screen.getByText(/No reportable groups/)).toBeInTheDocument();
});
test("Registration defaults to viewer and sends the chosen form data", async () => {
  window.history.replaceState({}, "", "/register");
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({
      id: 3,
      role: "VIEWER",
      email: "new@example.com",
      name: "New User",
    }),
  });
  vi.stubGlobal("fetch", fetch);
  const onLogin = vi.fn();
  render(<Login onLogin={onLogin} />);
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "New User" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "LongPassword42!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account →" }));
  await waitFor(() => expect(onLogin).toHaveBeenCalled());
  expect(JSON.parse(fetch.mock.calls[0][1].body).role).toBe("VIEWER");
  expect(fetch.mock.calls[0][0]).toBe("/api/auth/register");
});
test("Login displays API errors without authenticating", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Email or password is incorrect." }),
    }),
  );
  const onLogin = vi.fn();
  render(<Login onLogin={onLogin} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Sign in to workspace →" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect.",
  );
  expect(onLogin).not.toHaveBeenCalled();
});
test("A non-JSON hosting error shows a readable retry message", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }),
  );
  const onLogin = vi.fn();
  render(<Login onLogin={onLogin} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Sign in to workspace →" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The service is temporarily unavailable. Please try again.",
  );
  expect(onLogin).not.toHaveBeenCalled();
});
