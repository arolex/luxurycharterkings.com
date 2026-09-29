# LuxuryCharterKings — PRD

## Original Problem Statement
Premium single-company luxury travel RENTAL & concierge website. Rental-first business model (no sales/marketplace). Nav: Private Jets, Luxury Yachts, Luxury Cars (+ Motor Homes), Tour Experience, Villas, VIP + Concierge + Sign In. No Helicopters/Hotels. Cinematic editorial homepage ("Travel, arranged differently."), image-led 6-category collection grid. Botanical green / sage / sand / stone / copper palette (not black-gold). Listing detail pages with gallery, specs, pricing/quote, Request to Book, Chat with Concierge. Floating DB-persisted concierge chat associated with the listing. Database-driven inventory ready for a future admin dashboard. No payments/Web3/AI chatbot/vendor marketplace.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT auth (httpOnly cookies), full reset flow, brute-force protection, admin seeding. Listings/categories/conversations/messages/booking_requests collections. Startup seeds inventory + admin.
- Frontend: React 19 + react-router 7, Tailwind, shadcn/ui, framer-motion, sonner. AuthContext + ConciergeContext. Layout (Navbar/Footer/floating ConciergeChat).

## User Personas
- Affluent traveller browsing/renting jets, yachts, cars, villas, tours, VIP concierge.
- Concierge admin managing enquiries & booking requests (owner: arokusiaalex@gmail.com).

## Core Requirements (static)
- Rental-only language (never Buy/For Sale/Seller/Dealer/Purchase).
- Concierge conversations persisted & linked to listing; any visitor (name+email).
- Price display: "From $X/day" or "Request a Quote".
- Responsive desktop + mobile.

## Implemented (2026-06)
- Homepage hero + 6-category bento grid + featured + concierge banner.
- Category pages with filters (cars: subcategory incl Motor Homes, location, chauffeur).
- Listing detail: gallery, specs, pricing, Request to Book modal, Chat with Concierge.
- Floating concierge chat (intake → thread), DB persistence, listing association.
- JWT auth (sign in/register/forgot/reset), admin dashboard (conversations + bookings).
- 22 seeded listings across all categories. Tested 100% backend + frontend.

## Backlog
- P1: Real-time customer↔admin live chat (websockets) + admin reply UI.
- P1: Full admin CRUD for listings/images/prices/availability/featured/site content.
- P2: Image upload (object storage), availability calendar, saved favourites.

## Next Tasks
- Admin reply endpoint (admin-authenticated) + live messaging channel.
- Admin content management screens.
