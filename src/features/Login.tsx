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
export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("hr@acme.example"),
    [password, setPassword] = useState("AssessmentDemo42!"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api<User>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <Logo />
        <div>
          <span className="eyebrow">PEOPLE FIRST. NUMBERS SECOND.</span>
          <h1>
            A clearer picture
            <br />
            of how you pay.
          </h1>
          <p>
            One workspace for your people, compensation,
            <br />
            and the decisions that move them forward.
          </p>
          <div className="story-grid">
            <div>
              <strong>10,000</strong>
              <span>people, one place</span>
            </div>
            <div>
              <strong>6</strong>
              <span>countries connected</span>
            </div>
          </div>
        </div>
        <small>ACME PEOPLE OPERATIONS · SYNTHETIC DEMO DATA</small>
      </section>
      <section className="login-form">
        <form onSubmit={submit}>
          <span className="eyebrow">YOUR COMPENSATION WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in to make sense of your salary data.</p>
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to workspace →"}
          </button>
          <div className="demo-box">
            <strong>Explore the demo</strong>
            <p>All employee data is synthetic.</p>
            <div className="demo-buttons">
              <button type="button" onClick={() => setEmail("hr@acme.example")}>
                HR manager
              </button>
              <button
                type="button"
                onClick={() => setEmail("viewer@acme.example")}
              >
                Read-only viewer
              </button>
            </div>
            <small>Demo password: AssessmentDemo42!</small>
          </div>
        </form>
      </section>
    </main>
  );
}
