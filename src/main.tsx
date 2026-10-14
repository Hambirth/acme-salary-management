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
const tabPaths: Record<Tab, string> = {
  dashboard: "/app",
  employees: "/app/employees",
  audit: "/app/audit",
};
function App() {
  const [path, setPath] = useState(window.location.pathname);
  function navigate(next: string, replace = false) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", next);
    setPath(next);
  }
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [options, setOptions] = useState<Options>({
      countries: {},
      departments: [],
      jobTitles: [],
    }),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const tab: Tab =
    path === "/app/employees"
      ? "employees"
      : path === "/app/audit"
        ? "audit"
        : "dashboard";
  const setTab = (next: Tab) => navigate(tabPaths[next]);
  useEffect(() => {
    if (!ready) return;
    if (!user && path.startsWith("/app")) navigate("/login", true);
    else if (user && ["/", "/login", "/register"].includes(path))
      navigate("/app", true);
    else if (user?.role === "VIEWER" && path === "/app/audit")
      navigate("/403", true);
  }, [ready, user, path]);
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
  if (
    ![
      "/",
      "/login",
      "/register",
      "/app",
      "/app/employees",
      "/app/audit",
    ].includes(path)
  )
    return (
      <main className="error-page">
        <Logo />
        <h1>{path === "/403" ? "Access restricted" : "Page not found"}</h1>
        <p>
          {path === "/403"
            ? "HR manager access is required to view this page."
            : "The requested page does not exist."}
        </p>
        <button
          className="primary"
          onClick={() => navigate(user ? "/app" : "/login")}
        >
          Return to workspace
        </button>
      </main>
    );
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
                navigate("/login");
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
          <a href="/api/docs/" target="_blank" rel="noreferrer">
            API documentation ↗
          </a>
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
