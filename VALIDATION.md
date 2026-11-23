# Validation

Checks on 16 November 2026, Node v24.22.1 / npm 11.9.0:

- Production build: Vue/TypeScript strict checks and Vite build.
- Vitest: 10 tests, money and staff ticket workflow.
- Source ZIP reopened for CRC/integrity and expected package/source/lockfile files; node_modules, dist, secrets, hosting identity and recursive source archives excluded.

Tests cover TND precision, role restrictions, adding/updating ticket items, unavailable products, invalid quantities, historical prices, single payment, paid-ticket recovery, closing/freeing tables, table deletion protection, QR token regeneration, and date-filtered sales.

Limits: no live NestJS backend was supplied. API responses/DTO assumptions are listed in README.md. The supported browser-control module was unavailable in the execution environment, so visual/browser, keyboard, image-processing, sound, QR-rendering, receipt-printing and mobile-network checks still need manual testing. The tests exercise the local demo service, not a real browser or concurrent backend. There is no customer-to-cashier E2E test in this staff-only project.
