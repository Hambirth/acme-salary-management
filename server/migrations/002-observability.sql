CREATE TABLE IF NOT EXISTS application_logs(id INTEGER PRIMARY KEY,request_id TEXT NOT NULL,level TEXT NOT NULL,method TEXT NOT NULL,path TEXT NOT NULL,status INTEGER NOT NULL,duration_ms INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_logs_request ON application_logs(request_id);
CREATE TABLE IF NOT EXISTS audit_requests(audit_id INTEGER PRIMARY KEY REFERENCES audit(id),request_id TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_employees_job_title ON employees(job_title,id);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date ON employees(joining_date,id);
