import React, { useEffect, useState, useCallback } from "react";
import {
  api,
  money,
  number,
  type User,
  type Employee,
  type Insights,
  type Options,
} from "../api";
import { Heading, Select, Metric, Modal, Logo } from "../components";
export function Audit() {
  const [rows, setRows] = useState<
      {
        id: number;
        actor: string;
        action: string;
        employeeId: number;
        employeeName: string;
        createdAt: string;
      }[]
    >([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api<typeof rows>("/audit")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  return (
    <>
      <Heading
        eyebrow="ACCOUNTABILITY BUILT IN"
        title="Every change has a story."
        description="A traceable record of employee changes, newest first."
      >
        <button className="secondary" onClick={load}>
          ↻ Refresh
        </button>
      </Heading>
      <section className="panel">
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Change</th>
                <th>Employee</th>
                <th>Changed by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span
                      className={
                        "tag " + (r.action === "Deleted" ? "amber" : "")
                      }
                    >
                      {r.action}
                    </span>
                  </td>
                  <td>
                    {r.employeeName}
                    <small>Employee #{r.employeeId}</small>
                  </td>
                  <td>{r.actor}</td>
                  <td>{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty">
            {loading
              ? "Loading activity…"
              : "No changes yet. Add or update an employee to see the audit trail."}
          </div>
        )}
        <div className="panel-foot">
          Latest 100 changes. Seed data does not create activity entries.
        </div>
      </section>
    </>
  );
}
