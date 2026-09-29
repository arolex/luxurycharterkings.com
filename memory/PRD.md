# LuxuryCharterKings — PRD

## Original Problem Statement
Rental-first luxury travel & concierge platform (single company, no marketplace). Categories: Private Jets, Luxury Yachts, Luxury Cars (+ Motor Homes subcategory), Tour Experience, Villas, VIP. No Helicopters/Hotels. No sales language (Buy/For Sale/Seller/Dealer/Purchase). Botanical green / sage / sand / stone / copper palette. Full customer inventory + rental/charter/quote requests + customer accounts + admin dashboard (Dashboard/Inventory/Inquiries/Concierge/Customers/VIP/Settings) + WhatsApp concierge + real customer↔admin chat + VIP membership with discount.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT httpOnly-cookie auth + full reset flow + brute force. Object storage (Emergent) for image uploads served via public /api/files/{path}. Collections: users, listings, booking_requests (unified book/quote), conversations, messages, files, settings, plus auth collections.
- Frontend: React 19 + react-router 7, Tailwind, shadcn/ui, framer-motion, sonner. Contexts: Auth, Concierge, Settings. Near-real-time chat via 4s polling with unread counts.

## User Personas
- Affluent traveller: browses, filters, requests bookings/quotes, chats, joins VIP, tracks requests in /account.
- Concierge admin (arokusiaalex@gmail.com): manages inventory, inquiries (status flow), live chat replies, customers, VIP members, settings.

## Core Requirements (static)
- Rental-only language. Requests attach the listing automatically and persist.
- Any visitor can chat (name+email); conversation linked to listing; admin can reply.
- VIP discount (default 10%, configurable) applied to listing pricing for VIP users.
- Responsive desktop/tablet/mobile.

## Implemented
- 2026-06 (Phase 1): Homepage + 6-category grid, category pages, listing detail, concierge chat (DB), JWT auth, basic admin.
- 2026-06 (Phase 2 — this build):
  - Discovery search (Experience/Destination/Dates) on homepage.
  - Category pages: location + capacity filters, sort (price/capacity/featured), cars subcategory chips (incl Motor Homes) + chauffeur filter.
  - Category-adaptive cards & detail pages; VIP member pricing display; pickup/delivery + rental requirements for cars.
  - Multi-step car Request-to-Book (Dates → Requirements → Details); single-step for others; Request-a-Quote; WhatsApp concierge (dynamic per-listing message) + floating WhatsApp button (settings-driven).
  - Customer accounts: register (name/phone), profile edit, My Requests + status, My Conversations, VIP tab; /vip/join enrolment.
  - Real customer↔admin chat with 4s polling + unread badges.
  - Full admin dashboard: Dashboard stats, Inventory CRUD (create/edit/publish/feature/delete + image upload/URL), Inquiries (status flow), Concierge messaging, Customers, VIP members, Settings (company/logo/whatsapp/concierge contact/vip discount).
  - Object storage image uploads. Tested 100% backend (32/32), ~97% frontend, no bugs.

## Backlog / Next
- P1: Bind conversation access to authenticated user / signed token (currently UUID-scoped).
- P1: WebSocket real-time (replace polling); email notifications on new inquiry.
- P2: Availability calendar per listing; multi-image lightbox; saved favourites; deprecate legacy /booking-requests; split server.py into routers.
