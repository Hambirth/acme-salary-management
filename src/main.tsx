import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { api, type User, type Options } from "./api";
import { Logo } from "./components";
import { Login } from "./features/Login";
import { Dashboard } from "./features/Dashboard";
import { Employees } from "./features/Employees";
import { Audit } from "./features/Audit";
import "./style.css";
const icons = { dashboard: "▦", employees: "♙", audit: "↺" };
type Tab = "dashboard" | "employees" | "audit";
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<Tab>("dashboard"),
    [options, setOptions] = useState<Options>({
      countries: {},
      departments: [],
      jobTitles: [],
    }),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
    const expired = () => {
      setUser(null);
      setNotice("Your session expired. Please sign in again.");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (user)
      api<Options>("/options")
        .then(setOptions)
        .catch((e) => setNotice(e.message));
  }, [user, revision]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!ready) return <div className="boot">Opening your workspace…</div>;
  if (!user)
    return (
      <>
        <Login
          onLogin={(nextUser) => {
            setTab("dashboard");
            setUser(nextUser);
          }}
        />
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </>
    );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Logo />
        <div className="org-label">
          <span className="org-avatar">A</span>
          <div>
            ACME Organization<small>People operations</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {(
            [
              "dashboard",
              "employees",
              ...(user.role === "HR_MANAGER" ? ["audit"] : []),
            ] as Tab[]
          ).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              <span>{icons[item]}</span>
              {item === "dashboard"
                ? "Overview"
                : item === "employees"
                  ? "Employees"
                  : "Activity log"}
              {item === "employees" && <small>10k</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✳</span>
          <strong>Compensation with context.</strong>
          <p>Every number represents a person. Keep both in view.</p>
        </div>
        <div className="profile">
          <div className="avatar">
            {user.role === "HR_MANAGER" ? "HR" : "V"}
          </div>
          <div>
            <strong>
              {user.role === "HR_MANAGER" ? "HR Manager" : "Viewer"}
            </strong>
            <small>{user.email}</small>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await api("/auth/logout", { method: "POST" });
                setUser(null);
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            ↪
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>
              {tab === "dashboard"
                ? "Overview"
                : tab === "employees"
                  ? "Employees"
                  : "Activity log"}
            </strong>
          </span>
          <span className="top-status">
            <i /> Live workspace{" "}
            <span className="tag">
              {user.role === "HR_MANAGER" ? "HR access" : "View only"}
            </span>
          </span>
        </header>
        <div className="content">
          {tab === "dashboard" ? (
            <Dashboard
              options={options}
              revision={revision}
              user={user}
              onEmployees={() => setTab("employees")}
            />
          ) : tab === "employees" ? (
            <Employees
              options={options}
              user={user}
              onChange={() => setRevision((x) => x + 1)}
              notify={setNotice}
            />
          ) : (
            <Audit />
          )}
        </div>
        <footer>
          ACME Compensation{" "}
          <span>Annual base salaries · Local currencies · Synthetic demo</span>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
