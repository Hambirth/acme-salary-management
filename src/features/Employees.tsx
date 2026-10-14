import React, { useEffect, useState } from "react";
import {
  api,
  money,
  number,
  type User,
  type Employee,
  type Options,
} from "../api";
import { Heading, Select, Modal } from "../components";
export function Employees({
  options,
  user,
  onChange,
  notify,
}: {
  options: Options;
  user: User;
  onChange: () => void;
  notify: (v: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [country, setCountry] = useState(""),
    [department, setDepartment] = useState(""),
    [jobTitle, setJobTitle] = useState(""),
    [currency, setCurrency] = useState(""),
    [sort, setSort] = useState("name"),
    [direction, setDirection] = useState("asc"),
    [page, setPage] = useState(1),
    [data, setData] = useState<{ items: Employee[]; total: number }>({
      items: [],
      total: 0,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [edit, setEdit] = useState<Employee | "new" | null>(null),
    [deleting, setDeleting] = useState<Employee | null>(null),
    [deleteBusy, setDeleteBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const hr = user.role === "HR_MANAGER";
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const query = new URLSearchParams({
    search: debounced,
    country,
    department,
    jobTitle,
    currency,
    sort,
    direction,
    page: String(page),
    pageSize: "20",
  }).toString();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<{ items: Employee[]; total: number }>("/employees?" + query)
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
  }, [query, revision]);
  const changed = () => {
    setRevision((v) => v + 1);
    onChange();
  };
  return (
    <>
      <Heading
        eyebrow="YOUR EMPLOYEE DIRECTORY"
        title="Good decisions start with good data."
        description="Manage your people and keep compensation records up to date."
      >
        <div className="heading-actions">
          <a className="secondary" href={"/api/employees/export?" + query}>
            ↓ Export CSV
          </a>
          {hr && (
            <button className="primary" onClick={() => setEdit("new")}>
              ＋ Add employee
            </button>
          )}
        </div>
      </Heading>
      <section className="panel directory">
        <div className="directory-tools">
          <label className="search">
            <span>⌕</span>
            <input
              aria-label="Search employees"
              placeholder="Search by name, email or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Select
            label="Country"
            value={country}
            onChange={(v) => {
              setCountry(v);
              setPage(1);
            }}
            values={Object.keys(options.countries)}
            all="All countries"
          />
          <Select
            label="Department"
            value={department}
            onChange={(v) => {
              setDepartment(v);
              setPage(1);
            }}
            values={options.departments}
            all="All departments"
          />
          <Select
            label="Job title"
            value={jobTitle}
            onChange={(v) => {
              setJobTitle(v);
              setPage(1);
            }}
            values={options.jobTitles}
            all="All job titles"
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(v) => {
              setCurrency(v);
              setPage(1);
            }}
            values={["INR", "USD", "GBP", "EUR", "SGD", "CAD"]}
            all="All currencies"
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            values={
              hr ? ["name", "salary", "joiningDate"] : ["name", "joiningDate"]
            }
          />
          <button
            className="icon-button"
            aria-label="Toggle sort direction"
            title="Toggle sort direction"
            onClick={() => {
              setDirection((v) => (v === "asc" ? "desc" : "asc"));
              setPage(1);
            }}
          >
            {direction === "asc" ? "↑" : "↓"}
          </button>
        </div>
        <div className="directory-summary">
          <strong>{number(data.total)} employees</strong>
          <span>
            {hr
              ? "Annual gross base salary in local currency"
              : "Read-only directory · Individual salaries restricted"}
          </span>
          {loading && <span>Loading…</span>}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className={"table-wrap " + (loading ? "updating" : "")}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department / Role</th>
                <th>Country</th>
                <th>Employment</th>
                {hr && <th className="numeric">Annual salary</th>}
                <th>Joined</th>
                {hr && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="employee-cell">
                      <span className="person-avatar">
                        {e.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <strong>{e.name}</strong>
                        <small>{e.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="normal-weight">{e.department}</strong>
                    <small>{e.jobTitle}</small>
                  </td>
                  <td>
                    {e.country}
                    <small>{e.currency}</small>
                  </td>
                  <td>
                    <span
                      className={
                        "employment " +
                        (e.employmentType === "Full-time" ? "full" : "")
                      }
                    >
                      {e.employmentType}
                    </span>
                  </td>
                  {hr && (
                    <td className="numeric salary">
                      {money(e.salaryMinor!, e.currency)}
                    </td>
                  )}
                  <td className="date-cell">
                    {new Date(e.joiningDate + "T00:00:00").toLocaleDateString(
                      "en-GB",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </td>
                  {hr && (
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => setEdit(e)}
                          aria-label={"Edit " + e.name}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-text"
                          onClick={() => setDeleting(e)}
                          aria-label={"Delete " + e.name}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !data.items.length && (
            <div className="empty">
              No employees found. Try a different search or filter.
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            {data.total
              ? `${number((page - 1) * 20 + 1)}–${number(Math.min(page * 20, data.total))} of ${number(data.total)}`
              : "0 results"}
          </span>
          <div>
            <button
              className="secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(data.total / 20))}
            </span>
            <button
              className="secondary"
              disabled={page * 20 >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </section>
      {edit && (
        <EmployeeForm
          employee={edit}
          options={options}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            changed();
            notify(edit === "new" ? "Employee added." : "Employee updated.");
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete employee?"
          onClose={() => !deleteBusy && setDeleting(null)}
        >
          <p>
            Remove <strong>{deleting.name}</strong> from the directory? This
            cannot be undone through the application. An audit record will be
            retained.
          </p>
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="danger"
              disabled={deleteBusy}
              onClick={async () => {
                setDeleteBusy(true);
                try {
                  await api("/employees/" + deleting.id, {
                    method: "DELETE",
                    body: JSON.stringify({ version: deleting.version }),
                  });
                  setDeleting(null);
                  if (data.items.length === 1 && page > 1)
                    setPage((p) => p - 1);
                  changed();
                  notify("Employee deleted. Audit record retained.");
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete employee"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function EmployeeForm({
  employee,
  options,
  onClose,
  onSaved,
}: {
  employee: Employee | "new";
  options: Options;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial =
    employee === "new"
      ? {
          name: "",
          email: "",
          country: "India",
          department: "Engineering",
          jobTitle: "Software Engineer",
          employmentType: "Full-time",
          salary: "",
          joiningDate: "",
        }
      : { ...employee, salary: (employee.salaryMinor! / 100).toFixed(2) };
  const [values, setValues] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function field(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  return (
    <Modal
      title={employee === "new" ? "Add a new employee" : "Edit employee"}
      onClose={() => !busy && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              employee === "new" ? "/employees" : "/employees/" + employee.id,
              {
                method: employee === "new" ? "POST" : "PUT",
                body: JSON.stringify({
                  ...values,
                  joiningDate: new FormData(e.currentTarget).get("joiningDate"),
                }),
              },
            );
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Full name
            <input
              autoFocus
              required
              minLength={2}
              maxLength={100}
              value={values.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>
            Work email
            <input
              type="email"
              required
              maxLength={150}
              value={values.email}
              onChange={(e) => field("email", e.target.value)}
            />
          </label>
          <Select
            label="Country"
            value={values.country}
            onChange={(v) => field("country", v)}
            values={Object.keys(options.countries)}
          />
          <label>
            Department
            <input
              required
              list="departments"
              minLength={2}
              maxLength={60}
              value={values.department}
              onChange={(e) => field("department", e.target.value)}
            />
            <datalist id="departments">
              {options.departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </datalist>
          </label>
          <label>
            Job title
            <input
              required
              minLength={2}
              maxLength={80}
              value={values.jobTitle}
              onChange={(e) => field("jobTitle", e.target.value)}
            />
          </label>
          <Select
            label="Employment type"
            value={values.employmentType}
            onChange={(v) => field("employmentType", v)}
            values={["Full-time", "Part-time", "Contract"]}
          />
          <label>
            Annual base salary ({options.countries[values.country]})
            <input
              required
              inputMode="decimal"
              pattern="[0-9]{1,9}(\.[0-9]{1,2})?"
              value={values.salary}
              onChange={(e) => field("salary", e.target.value)}
              placeholder="e.g. 1800000.00"
            />
          </label>
          <label>
            Joining date
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              name="joiningDate"
              defaultValue={values.joiningDate}
            />
          </label>
        </div>
        <p className="form-note">
          Salary is annual gross base pay in the country’s local currency.
          Changes are recorded in the activity log.
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : employee === "new"
                ? "Add employee"
                : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
