# Auth Testing Playbook — LuxuryCharterKings

Admin: arokusiaalex@gmail.com / ChangeMe123! (role admin)

## API
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"arokusiaalex@gmail.com","password":"ChangeMe123!"}'
curl -b cookies.txt http://localhost:8001/api/auth/me

## Password reset (local)
Set FRONTEND_URL="http://localhost:3000" in /app/backend/.env, restart backend — reset link is written to backend log.
Register test user, POST /api/auth/forgot-password, read link from log, POST /api/auth/reset-password.
Restore real https FRONTEND_URL afterwards and restart.

## Concierge / bookings
- POST /api/concierge/conversations {customer_name, customer_email, message, listing_id} — any visitor.
- POST /api/concierge/conversations/{id}/messages {body, sender}
- GET  /api/concierge/conversations — admin only.
- POST /api/booking-requests {listing_id, customer_name, customer_email, ...}
- GET  /api/booking-requests — admin only.
