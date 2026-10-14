import React, { useEffect, useState } from "react";
import {
  api,
  money,
  number,
  type User,
  type Insights,
  type Options,
} from "../api";
import { Heading, Select, Metric } from "../components";
import { StatisticsTable } from "./StatisticsTable";
export function Dashboard({
  options,
  revision,
  user,
  onEmployees,
}: {
  options: Options;
  revision: number;
  user: User;
  onEmployees: () => void;
}) {
  const [currency, setCurrency] = useState("INR"),
    [view, setView] = useState("local"),
    [jobTitle, setJobTitle] = useState(""),
    [country, setCountry] = useState(""),
    [department, setDepartment] = useState(""),
    [groupBy, setGroupBy] = useState("department"),
    [data, setData] = useState<Insights | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<Insights>(
      "/insights?" +
        new URLSearchParams({
          currency: view === "usd" ? "" : currency,
          country,
          department,
          jobTitle,
          groupBy,
          view,
        }),
    )
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currency, country, department, jobTitle, groupBy, view, revision]);
  const summary = data?.summary;
  const reportCurrency = data?.currency ?? (view === "usd" ? "USD" : currency);
  const maxAverage = Math.max(
    ...(data?.groups.map((g) => g.stats.average) ?? [1]),
    1,
  );
  return (
    <>
      <Heading
        eyebrow="COMPENSATION AT A GLANCE"
        title="Your people. The bigger picture."
        description="Understand your workforce and make more informed pay decisions."
      >
        <button className="secondary" onClick={onEmployees}>
          View employees ↗
        </button>
      </Heading>
      <div className="filterbar">
        <Select
          label="Salary view"
          value={view}
          onChange={setView}
          values={["local", "usd"]}
        />
        <span className="filter-icon">
          ☷ <strong>Explore your data</strong>
        </span>
        {view === "local" && (
          <Select
            label="Currency"
            value={currency}
            onChange={setCurrency}
            values={["INR", "USD", "GBP", "EUR", "SGD", "CAD"]}
          />
        )}
        <Select
          label="Country"
          value={country}
          onChange={setCountry}
          values={Object.keys(options.countries)}
          all="All countries"
        />
        <Select
          label="Department"
          value={department}
          onChange={setDepartment}
          values={options.departments}
          all="All departments"
        />
        <Select
          label="Job title"
          value={jobTitle}
          onChange={setJobTitle}
          values={options.jobTitles}
          all="All job titles"
        />
        <button
          className="text-button"
          onClick={() => {
            setView("local");
            setJobTitle("");
            setCountry("");
            setDepartment("");
            setCurrency("INR");
          }}
        >
          Reset
        </button>
      </div>
      <div className="currency-note">
        <span>ⓘ</span>{" "}
        {view === "usd" ? (
          "Approximate USD conversion using illustrative static rates. This is not a live exchange-rate or payroll calculation."
        ) : (
          <>
            Salary insights use <strong>{currency} only</strong>. Different
            currencies are never combined.
          </>
        )}{" "}
        {loading && <span className="loading-inline">Updating…</span>}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className={"metrics " + (loading ? "updating" : "")}>
        <Metric
          title="Organization headcount"
          value={number(data?.organizationHeadcount ?? 0)}
          detail="Across all countries and currencies"
          icon="♙"
        />
        <Metric
          title="Annual salary budget"
          value={summary ? money(summary.total, reportCurrency, true) : "—"}
          detail={`${number(summary?.count ?? 0)} employees in selected scope`}
          icon="↗"
        />
        <Metric
          title="Median annual salary"
          value={summary ? money(summary.median, reportCurrency, true) : "—"}
          detail="The midpoint of your salary range"
          icon="≋"
        />
        <Metric
          title="Average annual salary"
          value={summary ? money(summary.average, reportCurrency, true) : "—"}
          detail="Annual base pay per employee"
          icon="◈"
        />
      </div>
      {!loading && !summary && (
        <div className="empty">
          No reportable compensation data. Adjust your filters.
          {user.role === "VIEWER" &&
            " Groups need at least five employees for viewer reports."}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel comparison">
          <div className="panel-heading">
            <div>
              <h2>How pay compares</h2>
              <p>
                Average and median annual salary by{" "}
                {groupBy === "jobTitle"
                  ? "job title"
                  : groupBy === "employmentType"
                    ? "employment type"
                    : groupBy}
              </p>
            </div>
            <select
              aria-label="Group salaries by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="department">Department</option>
              <option value="country">Country</option>
              <option value="jobTitle">Job title</option>
              <option value="employmentType">Employment type</option>
            </select>
          </div>
          <div className="legend">
            <span>
              <i className="average-dot" /> Average salary
            </span>
            <span>
              <i className="median-dot" /> Median salary
            </span>
            <small>{reportCurrency} / year</small>
          </div>
          <div className="bar-chart">
            {data?.groups.map((group, i) => (
              <div className="chart-row" key={group.name}>
                <div className="chart-row-label">
                  <span>{group.name}</span>
                  <small>{number(group.stats.count)} people</small>
                </div>
                <div className="bar-track">
                  <div
                    className={"bar bar-" + (i % 3)}
                    style={{
                      width: `${(group.stats.average / maxAverage) * 95}%`,
                    }}
                  />
                  <i
                    className="median-marker"
                    style={{
                      left: `${(group.stats.median / maxAverage) * 95}%`,
                    }}
                  />
                </div>
                <strong>
                  {money(group.stats.average, reportCurrency, true)}
                </strong>
              </div>
            ))}
          </div>
          <div className="panel-foot">
            Same currency. Clearer comparisons.{" "}
            <span>{data?.groups.length ?? 0} groups</span>
          </div>
        </section>
        <section className="panel workforce">
          <div className="panel-heading">
            <div>
              <h2>Workforce mix</h2>
              <p>People in your selected scope</p>
            </div>
            <span className="subtle-icon">◉</span>
          </div>
          <div
            className="donut"
            style={{
              background: `conic-gradient(${donutStops(data?.groups ?? [])})`,
            }}
          >
            <div>
              <strong>{number(data?.filteredHeadcount ?? 0)}</strong>
              <span>employees · {reportCurrency}</span>
            </div>
          </div>
          <div className="workforce-list">
            {data?.groups.map((g, i) => (
              <div key={g.name}>
                <i style={{ background: palette[i % palette.length] }} />
                <span>{g.name}</span>
                <strong>{number(g.stats.count)}</strong>
                <small>
                  {Math.round(
                    (g.stats.count / (data.filteredHeadcount || 1)) * 100,
                  )}
                  %
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <StatisticsTable
        title="Detailed salary statistics"
        groups={data?.groups ?? []}
        currency={reportCurrency}
        hr={user.role === "HR_MANAGER"}
      />
      <StatisticsTable
        title="Pay versus tenure"
        description={`Completed years of service as of ${data?.tenureAsOf ?? "2026-10-14"}. These comparisons do not establish causation.`}
        groups={data?.tenure ?? []}
        currency={reportCurrency}
        hr={user.role === "HR_MANAGER"}
      />
      {user.role === "HR_MANAGER" && (
        <div className="dashboard-grid lower">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Salary distribution</h2>
                <p>Annual base salary bands · {reportCurrency}</p>
              </div>
              <span className="tag">
                {number(data?.filteredHeadcount ?? 0)} people
              </span>
            </div>
            <div className="histogram">
              {data?.bands.map((b) => (
                <div className="hist-column" key={b.label}>
                  <small>{number(b.count)}</small>
                  <div
                    style={{
                      height: `${Math.max(3, (b.count / Math.max(...data.bands.map((x) => x.count), 1)) * 110)}px`,
                    }}
                  />
                  <span>
                    {b.label.split("–").map((v, i) => (
                      <React.Fragment key={v}>
                        {i > 0 ? "–" : ""}
                        {Number.isFinite(Number(v)) ? number(Number(v)) : v}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel insight-card">
            <span className="eyebrow">A CLOSER LOOK</span>
            <h2>{data?.outlierCount ?? 0} salaries worth a conversation.</h2>
            <p>
              These fall outside the typical range for peers with the same
              country, job title and employment type.
            </p>
            <span className="insight-pill">
              Tukey IQR method · Groups of 5+
            </span>
            <small>
              A starting point for review, not a conclusion about pay fairness.
            </small>
          </section>
        </div>
      )}
      {user.role === "HR_MANAGER" && !!data?.outliers.length && (
        <section className="panel outlier-panel">
          <div className="panel-heading">
            <div>
              <h2>Compensation review</h2>
              <p>Up to 20 employees outside their peer group's typical range</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Job title</th>
                  <th>Country</th>
                  <th>Annual salary</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {data.outliers.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.jobTitle}</td>
                    <td>{r.country}</td>
                    <td>{money(r.salary, reportCurrency)}</td>
                    <td>
                      <span className="tag amber">{r.kind}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
const palette = [
  "#1d6856",
  "#65a58d",
  "#a5c9b8",
  "#ddad61",
  "#8b9eaf",
  "#c7d5de",
  "#758c60",
  "#ded5ba",
];
function donutStops(groups: { stats: { count: number } }[]) {
  const total = groups.reduce((n, g) => n + g.stats.count, 0);
  if (!total) return "#e7ece8 0% 100%";
  let offset = 0;
  return groups
    .map((g, i) => {
      const start = offset;
      offset += (g.stats.count / total) * 100;
      return `${palette[i % palette.length]} ${start}% ${offset}%`;
    })
    .join(",");
}
