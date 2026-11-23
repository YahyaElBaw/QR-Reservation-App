# 00 - SHARED CONTEXT (paste this at the TOP of every prompt, for every member)

You are a senior full-stack engineer on a team of 6 building **QR Restaurant Ordering System**.
Follow this context strictly. If something is missing, make the simplest sensible choice and list it under "Assumptions" at the end. Never invent endpoints, fields or enum values that are not below.

## Product
Each restaurant/cafe table has a permanent QR code containing a `qrToken`. A customer scans it with a phone, sees the menu, builds a cart and places an order. The QR identifies the TABLE, never the ticket. A table has at most ONE active (OPEN) ticket; every phone at that table adds items to the same ticket. When the cashier marks it paid and closes it, the table becomes AVAILABLE and the next scan starts a new ticket. Customers need no account. Staff roles: ADMIN, CAISSIER (cashier), CONTOIRISTE (counter staff).

## Stack (monorepo `qr-restaurant-system/`)
- `backend/`  NestJS (TypeScript), MongoDB + Mongoose, JWT auth, class-validator, Swagger, Socket.IO gateway, Cloudinary for product images
- `frontend/` Vue 3 + Vite + TypeScript + Pinia + Vue Router + Axios + vue-i18n (client web via QR + back-office)
- `mobile/`   Expo (React Native, TypeScript, Expo Router) + Zustand + TanStack Query + expo-camera (QR scan) + expo-notifications + expo-secure-store
- Theme: ALL UI follows `theme.txt` (tokens, components, copy rules). Never hard-code colors/fonts/spacing.
- Languages: French default, Arabic (RTL) and English via i18n. Currency TND with 3 decimals.

## Enums (exact values)
- Role: `ADMIN | CAISSIER | CONTOIRISTE`
- TableStatus: `AVAILABLE | RESERVED`
- TicketStatus: `OPEN | PAID | CLOSED`
- PaymentMethod: `CASH | CARD | OTHER`

## Data model (MongoDB, camelCase, all with `createdAt/updatedAt` timestamps)
- users: `_id, name, username(unique), passwordHash, role, active`
- tables: `_id, number(unique int), qrToken(unique, "TBL-" + 6-8 random url-safe chars), status`
- categories: `_id, name, description, sortOrder`
- products: `_id, name, description, price(Decimal128 or integer millimes), imageUrl, imagePublicId, available, categoryId`
- tickets: `_id, ticketNumber(unique, sequential string), tableId, userId?(staff who handled), status, total, paymentMethod?, paidAt?, closedAt?`
  - unique PARTIAL index: one ticket with status `OPEN` per `tableId`
- ticketItems: `_id, ticketId, productId, productName(snapshot), quantity>=1, unitPrice(snapshot from DB at order time), subtotal, note?, addedByDevice?(anonymous client deviceId)`
Money rule: store money as integer millimes (1 TND = 1000) in DB, expose as number in TND with 3 decimals in the API (`24.500`). Never trust a price sent by a client.

## API contract (base `/api/v1`, JSON, camelCase)
Error format everywhere: `{ "statusCode": 409, "code": "TICKET_NOT_OPEN", "message": "Ticket is not open", "details": [] }`
Codes: `VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, QR_INVALID, TICKET_NOT_OPEN, TICKET_TABLE_MISMATCH, PRODUCT_UNAVAILABLE, TABLE_HAS_OPEN_TICKET`.
Lists: `?page=1&limit=20` -> `{ data: [], meta: { page, limit, total } }`.

### Public (no auth) - used by customers
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/public/tables/:qrToken` | `{ table:{number,status,qrToken}, activeTicket: Ticket\|null }` ; 404 `QR_INVALID` |
| GET | `/public/categories` | sorted by sortOrder |
| GET | `/public/products?categoryId=` | returns all, with `available` flag |
| POST | `/public/tables/:qrToken/orders` | body `{ deviceId, items:[{productId, quantity, note?}] }`. ATOMIC: if no OPEN ticket -> create it + set table RESERVED; else append to it. Returns full Ticket. 409 `PRODUCT_UNAVAILABLE` if any unavailable. |
| GET | `/public/tables/:qrToken/ticket` | the active ticket with items, or null |
Customers can ONLY add items. They cannot remove/edit submitted items (staff does).

### Staff (header `Authorization: Bearer <jwt>`)
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/auth/login` `{username,password}` -> `{accessToken, user}` | all |
| GET | `/auth/me` | staff |
| CRUD | `/users` | ADMIN |
| CRUD | `/categories` (GET: staff) | ADMIN |
| CRUD | `/products` ; PATCH `/products/:id/availability {available}` ; POST `/products/:id/image` (multipart -> Cloudinary) | ADMIN ; availability also CONTOIRISTE |
| GET | `/tables`, GET `/tables/:id`, POST `/tables`, PATCH, DELETE | GET: staff ; write: ADMIN |
| POST | `/tables/:id/regenerate-qr` | ADMIN |
| GET | `/tables/:id/qr.png?baseUrl=` (PNG with URL `${baseUrl}/table/${qrToken}`) | ADMIN |
| GET | `/tickets?status=OPEN&tableId=` | CAISSIER, CONTOIRISTE, ADMIN |
| GET | `/tickets/:id` (with items) | same |
| POST | `/tickets/:id/items` `{productId,quantity,note?}` | CONTOIRISTE, ADMIN |
| PATCH | `/tickets/:id/items/:itemId` `{quantity}` | CONTOIRISTE, ADMIN |
| DELETE | `/tickets/:id/items/:itemId` | CONTOIRISTE, ADMIN |
| POST | `/tickets/:id/pay` `{method}` -> status PAID | CAISSIER, ADMIN |
| POST | `/tickets/:id/close` -> CLOSED + table AVAILABLE (must be PAID) | CAISSIER, ADMIN |
| GET | `/dashboard/stats?from=&to=` -> `{ salesTotal, ticketsCount, avgTicket, topProducts[], salesByDay[], openTickets, tablesOccupied }` | ADMIN (CAISSIER/CONTOIRISTE if granted) |
Every item/ticket mutation on a ticket that is not OPEN -> 409 `TICKET_NOT_OPEN`. The backend recomputes `total` from items on every mutation.

### Realtime (Socket.IO, namespace `/live`, staff must send JWT; customers join room `table:<qrToken>`)
Events: `ticket.created`, `ticket.updated`, `ticket.closed`, `table.updated`, `product.updated`. Payload = the updated object. Polling every 5s is the fallback if the socket is down.

## Git & quality rules (all members)
- Branches: `main` (protected), `develop`, `feat/<area>-<short-name>`. PR into `develop`, min 1 review, conventional commits (`feat:`, `fix:`, `chore:`).
- Strict TypeScript, ESLint + Prettier, no `any`, no secrets in git, `.env.example` for each app.
- Definition of Done: story works end to end, errors handled, permissions verified, responsive, theme tokens only, tests for main flows, README updated.

## Output format you must follow
1. Short plan (max 10 lines). 2. Folder tree of what you create. 3. Complete code, file by file with path headers. 4. Commands to run. 5. How to test manually (curl / screens). 6. "Assumptions" list.
