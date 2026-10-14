import React from "react";
import { money, number, type Stats } from "../api";
export function StatisticsTable({
  title,
  description,
  groups,
  currency,
  hr,
}: {
  title: string;
  description?: string;
  groups: { name: string; stats: Stats }[];
  currency: string;
  hr: boolean;
}) {
  return (
    <section className="panel report-table">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>
            {description ??
              `Annual base pay · ${currency}${hr ? "" : " · Groups of five or more; individual extremes hidden"}`}
          </p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Headcount</th>
              {hr && <th>Minimum</th>}
              <th>P25</th>
              <th>Median</th>
              <th>Average</th>
              <th>P75</th>
              {hr && <th>Maximum</th>}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name}>
                <td>{g.name}</td>
                <td>{number(g.stats.count)}</td>
                {hr && <td>{money(g.stats.min ?? 0, currency)}</td>}
                <td>{money(g.stats.p25, currency)}</td>
                <td>{money(g.stats.median, currency)}</td>
                <td>{money(g.stats.average, currency)}</td>
                <td>{money(g.stats.p75, currency)}</td>
                {hr && <td>{money(g.stats.max ?? 0, currency)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!groups.length && (
        <div className="empty">
          No reportable groups for the selected filters.
        </div>
      )}
    </section>
  );
}
