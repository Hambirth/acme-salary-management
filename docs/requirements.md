# Salary management requirements

## Goal and user
Give ACME's HR manager one reliable place to manage 10,000 employees across countries and answer how the organization pays people. Replace spreadsheet edits with validated records and useful compensation summaries.

## Scope and features
- Employee directory with server-side search, country and department filters, sorting and pagination. View, add, edit and delete employees with clear validation and confirmation before deletion.
- Annual base salary in each employee's local currency, stored as integer minor units. Show country, department, job title, employment type and joining date. Never sum or compare different currencies silently.
- Insights: headcount, total annual salary, median, average, minimum and maximum pay, grouped by country, department or job title within a selected currency. Salary bands and low/high outliers help HR investigate compensation patterns; they do not prove unfairness.
- Filtered CSV export for spreadsheet interoperability, with formula-injection protection.
- HR login with server-enforced authorization. Read-only viewer demo account can view the directory and aggregated insights; individual salaries and mutations are restricted to HR.
- Deterministic, synthetic seed of exactly 10,000 employees across countries, departments and job titles. An explicit seed command must not overwrite an existing database accidentally.
- Accessible, responsive React interface with loading, empty, validation and error states.

## Engineering and acceptance
Use Node.js/TypeScript, React and SQLite, with a small modular backend and parameterized SQL. Keep validation and analytics logic independently testable. Enforce authentication on the server, hash passwords, limit login attempts, and keep secrets and database files out of Git. Core tests must cover salary precision, filtering, validation, permissions and analytics. Document setup, decisions, AI use, performance and limitations; commit in meaningful increments. Deliver a deployed application, repository and a short video walkthrough as required by the assessment.

## Deliberate exclusions and reasons
Payroll execution, tax calculations, bonuses and payslips are outside salary-data management and require country-specific rules. Live exchange rates and global cross-currency totals are excluded to prevent misleading comparisons. Enterprise SSO, multi-tenancy, approval chains and self-service registration are deferred to keep the assessment focused; demo accounts have fixed roles and production onboarding would require administrator-controlled provisioning. Compensation analytics describe the supplied data, not legal conclusions or automated employee decisions.

## Assumptions
Salary means annual gross base compensation; currencies have two decimal places for the seeded countries. Records represent current compensation, with changes captured in an audit trail rather than a full effective-dated payroll model. Employer deployment credentials, repository hosting and video capture are external delivery steps and must be verified separately.
