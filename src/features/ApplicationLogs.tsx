import React, { useEffect, useState } from "react";
import { api } from "../api";
type Log = {
  requestId: string;
  level: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  createdAt: string;
};
export function ApplicationLogs() {
  const [logs, setLogs] = useState<Log[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setLogs(await api<Log[]>("/logs"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="panel report-table">
      <div className="panel-heading">
        <div>
          <h2>Application logs</h2>
          <p>
            Latest 100 persisted events. Credentials and request content are
            excluded.
          </p>
        </div>
        <button className="secondary" onClick={load}>
          Refresh logs
        </button>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Request</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Request ID</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.requestId + String(i)}>
                <td>{log.level}</td>
                <td>
                  {log.method} {log.path}
                </td>
                <td>{log.status}</td>
                <td>{log.durationMs} ms</td>
                <td>
                  <small>{log.requestId}</small>
                </td>
                <td>{new Date(log.createdAt).toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!logs.length && (
        <div className="empty">
          {loading
            ? "Loading application logs…"
            : "No events at the configured persistence level yet."}
        </div>
      )}
    </section>
  );
}
