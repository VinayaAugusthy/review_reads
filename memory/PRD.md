# Inkwell — Book Review Website

## Original Problem Statement
Build a book review website where users can add book reviews and suggest books. Users can comment, share, and like reviews shared. Display quotes about reading on the landing page. Use an attractive colorful UI palette.

## User Choices
- Auth: Simple email/password (JWT via httpOnly cookies)
- Book suggestions: Adding new books into a shared catalog before reviewing
- Book data: Auto-fetch cover/details via external API (Google Books primary, Open Library fallback)
- Theme: Warm literary (cream/maroon/amber) — "Inkwell" brand
- Moderation: Basic (users delete own comments/reviews, admin deletes any)

## Architecture
- Backend: FastAPI + Motor (MongoDB), JWT httpOnly cookie auth, bcrypt password hashing, brute-force lockout
- Frontend: React + React Router + Tailwind + Shadcn UI, Cormorant Garamond (serif) + Manrope (sans) fonts
- External API: Google Books (primary), Open Library (fallback, used automatically due to Google's shared-IP rate limiting in this sandbox)

## Core Requirements (static)
- Users register/login, write book reviews with 1-5 star ratings
- Users suggest/add books to a shared catalog (search external API or manual entry)
- Reviews can be liked, commented on, and shared (native share sheet / clipboard link)
- Landing page shows an auto-scrolling quotes-about-reading marquee + featured top reviews
- Users can delete their own reviews/comments; admin can delete any

## What's Been Implemented (2026-07-20)
- Full auth flow: register, login, logout, /me, refresh, forgot/reset-password (backend only, no forgot-password UI yet)
- Books catalog: GET/POST /api/books, GET /api/books/search (Google Books → Open Library fallback), GET /api/books/{id}
- Reviews: create, list (sort newest/top liked, filter by book_id/user_id), get, delete, like/unlike toggle
- Comments: create, list, delete (owner/admin only)
- Pages: Landing, Login, Register, Feed (/reviews), Books (/books), NewReview (/reviews/new), ReviewDetail (/reviews/:id), Profile (/profile)
- Admin seeded: admin@bookclub.com / Admin@123
- Fixed post-testing: offline SVG placeholder covers (via.placeholder.com unreachable in sandbox), clipboard share try/catch with toast fallback, Dialog a11y description
- Tested: 21/21 backend pytest tests pass; all primary frontend flows verified by testing agent

## Prioritized Backlog
- P0: None outstanding — core MVP flows are functional
- P1: Forgot/reset password UI pages (backend ready); move review sort/pagination to MongoDB aggregation for scale; tighten CORS_ORIGINS for production
- P2: Book detail page showing all reviews for that book; user avatars/profile pictures; review edit; pagination UI on Feed/Books; email notifications on comment/like

## Next Tasks
1. Build forgot/reset password UI screens
2. Add book detail page (/books/:id) listing all reviews for that book
3. Consider splitting server.py into routers (auth/books/reviews/comments) as it grows
