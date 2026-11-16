# 02 - FRONTEND PROMPTS (Vue 3: customer web via QR + back-office)
Always prepend `00_SHARED_CONTEXT.md` and attach `theme.txt`. Customer pages need NO login and must work in a phone browser opened from the QR.

## F1 - Bootstrap, design system, i18n, API layer  (Sprint 0-1)
Create `frontend/` with Vite + Vue 3 + TS + Pinia + Vue Router + vue-i18n + Axios + lucide-vue-next + VueUse.
- `src/styles/tokens.css` EXACTLY as in theme.txt section 10 + base styles (fonts via @fontsource: bricolage-grotesque, dm-sans, cairo). Add `dir="rtl"` switching when locale is `ar`; use logical CSS properties only.
- Reusable UI kit in `src/components/ui/` (all themed): `AppButton, AppInput, AppSelect, AppCard, StatusBadge, QuantityStepper, CategoryChips, Toast (+ useToast), BottomSheet, ConfirmDialog, EmptyState, Skeleton, MoneyText` (MoneyText formats TND 3 decimals via Intl).
- `src/services/http.ts` (Axios: base URL from `VITE_API_URL`, JWT interceptor for staff, error normalizer to the shared error format), typed services per resource, `src/types` mirroring the shared enums/models.
- Router with two layouts: `ClientLayout` (route `/table/:qrToken`, mobile-first max-width 560) and `StaffLayout` (route `/staff/*`, guarded by role). 404 + "invalid QR" view.
- Provide a Storybook-like `/dev/ui` page showing every component in all states.
- Tests: Vitest for MoneyText, QuantityStepper.

## F2 - Customer: QR landing, menu, cart  (Sprint 3-4)
Route `/table/:qrToken` (mobile first, 360px up).
- On load call `GET /public/tables/:qrToken`. Invalid -> friendly error view ("This QR code is not valid. Ask a team member."). Show "Table 12" header and, if `activeTicket` exists, a banner "Your table has an open order - total X TND" linking to the ticket.
- Generate and persist an anonymous `deviceId` (uuid in localStorage) and send it with orders.
- Menu: sticky `CategoryChips` that scroll-spy with sections, product cards per theme (image from Cloudinary with transform params, price, "+" button, unavailable state), search field, skeleton loading, pull to refresh.
- Cart (Pinia, persisted per qrToken in localStorage): floating cart bar (count + total in accent) -> `BottomSheet` with lines, `QuantityStepper`, remove, note per line, total, big highlight button "Place order". Block unavailable products and show which ones.
- Success state: animated check once, ticket number, "Add more items" button.
- Handle errors: `PRODUCT_UNAVAILABLE` (refresh menu + highlight lines), offline, 409/network retry with idempotent protection (disable button while sending).
- Accessibility: focus management in sheet, labels on icon buttons, 48px targets.

## F3 - Customer: active ticket and adding to it  (Sprint 4)
- Page `/table/:qrToken/ticket`: shows the shared ticket (lines grouped, who added is NOT shown, running total, status badge). Auto-refresh through Socket.IO room `table:<qrToken>` with 5s polling fallback.
- "Add to my order" flows through the same menu/cart; after submit, ticket updates for ALL phones.
- If ticket becomes PAID/CLOSED: lock UI, show "Thank you" screen, button "Start a new order" that re-fetches the table (new ticket is created only on the next order).
- Customers cannot edit/remove submitted lines: show hint "Need a change? Ask a team member."

## F4 - Back-office shell, auth, roles  (Sprint 1-6)
- `/staff/login` (username/password), JWT in memory + refresh on reload through `localStorage` token, auto logout on 401. Route guards by role; sidebar items depend on role (see matrix in the cahier des charges section 8).
- Responsive layout: sidebar on desktop, bottom tab bar on tablet/phone. Language switcher (fr/ar/en), dark-mode toggle (data-theme).
- Global realtime store: connects to `/live`, plays a short sound + toast on `ticket.created`/`ticket.updated`.

## F5 - Admin screens  (Sprint 6)
Data tables with search, pagination, sort, create/edit drawers, confirm on delete:
- Users (roles, active toggle, reset password), Categories (drag reorder), Products (image upload with preview + crop 1:1, price input with 3 decimals, availability toggle, category select), Tables (grid of tiles with status; add table; **Generate QR**: modal asks `baseUrl` (default = current LAN origin, warns on localhost), shows QR PNG, buttons Download PNG / Print sheet of all tables / Regenerate token with warning).
- Dashboard: KPI cards (sales today, tickets, average ticket, open tickets), line chart sales by day, top products bar chart (use a light chart lib themed with tokens), date range picker.

## F6 - Cashier & counter screens  (Sprint 5-6)
- Cashier: "Open tickets" list sorted by oldest, filter by table, ticket detail (lines, total in large type), actions "Mark as paid" (choose CASH/CARD/OTHER) then "Close ticket"; one-tap "Pay and close". Printable receipt view (`window.print`, 80mm CSS).
- Counter (Contoiriste): live board of tables (tiles per theme) with status + total; ticket detail with add item (product picker), change quantity, remove line (confirm), product availability quick-toggle screen.
- Optimistic UI with rollback on error; every error uses the toast copy rules from theme.txt.
- Tests: Cypress/Playwright flow: customer orders from phone viewport -> cashier sees it -> pays/closes -> table AVAILABLE.
