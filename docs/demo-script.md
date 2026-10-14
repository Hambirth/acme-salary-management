# Three minute demo walkthrough

1. Introduce the problem: ACME's HR team manages 10,000 employees across six countries and needs salary data management and compensation insights.
2. Sign in as HR manager. Show organization headcount, the INR-scoped budget, median and average. Explain why different currencies are not added together. Change currency to USD and group comparisons by country or job title.
3. Open Employees. Search by email, filter by country and department, change salary sorting and navigate pages. Export the current filtered set to CSV.
4. Add a clearly named demo employee with annual salary and joining date. Edit its salary. Open Activity log to show who changed it and when. Delete the demo employee after demonstrating the confirmation dialog.
5. Sign out and sign in as Viewer. Show that add/edit/delete controls and individual salaries are absent. Explain that the API enforces this even if someone manually invokes endpoints.
6. Briefly show the requirements document, API module boundaries and tests. Explain integer money storage, session revocation, transactional audit records and optimistic concurrency.
7. Close with trade-offs: SQLite is suitable for one assessment instance and needs persistent storage; PostgreSQL is the next step for multiple replicas. No payroll/taxes/live FX. AI accelerated implementation, while tests and review check correctness.

Record against the deployed URL before submission. No video has been recorded yet. Only claim checks documented in the verification record.

## Expanded walkthrough

The updated recording is `docs/demo.mp4` (2m36s, captions, no voiceover). It shows login, default-Viewer demo registration, HR overview, approximate USD/employment-type comparisons, all salary percentiles/extremes, tenure bands, directory and title filters, previously recorded synthetic salary creation/edit/delete, correlated audit, application logs, Swagger and Viewer salary privacy. It combines the earlier live CRUD footage with freshly captured expanded features. No real employee data or deployment secrets appear.
