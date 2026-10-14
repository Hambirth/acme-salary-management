import React, { useState, useEffect } from "react";
import { api, type User } from "../api";
import { Logo } from "../components";
export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [register, setRegister] = useState(
      window.location.pathname === "/register",
    ),
    [name, setName] = useState(""),
    [role, setRole] = useState("VIEWER"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const sync = () => setRegister(window.location.pathname === "/register");
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api<User>(register ? "/auth/register" : "/auth/login", {
          method: "POST",
          body: JSON.stringify(
            register ? { name, email, password, role } : { email, password },
          ),
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
          <h2>{register ? "Create your account." : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "Choose your account type to get started."
              : "Sign in to make sense of your salary data."}
          </p>
          {register && (
            <>
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Account type
                <select
                  aria-label="Account type"
                  aria-describedby="account-access"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="VIEWER">Read-only viewer</option>
                  <option value="HR_MANAGER">HR manager</option>
                </select>
              </label>
              <p className="muted" id="account-access">
                {role === "VIEWER"
                  ? "Viewers can browse the directory and aggregate reports. Individual salaries and editing are restricted."
                  : "HR managers can view salaries, manage employees and review activity logs."}
              </p>
            </>
          )}
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
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 12 : 1}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {register && (
            <p className="muted">
              Use at least 12 characters for your password.
            </p>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <button className="primary wide" disabled={busy}>
            {busy
              ? "Please wait…"
              : register
                ? "Create account →"
                : "Sign in to workspace →"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              const next = !register;
              setRegister(next);
              setError("");
              if (next) {
                setRole("VIEWER");
                setEmail("");
                setPassword("");
              }
              window.history.pushState({}, "", next ? "/register" : "/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            {register ? "Already registered? Sign in" : "Create an account"}
          </button>
        </form>
      </section>
    </main>
  );
}
