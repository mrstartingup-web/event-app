# Product
A website where customers view the Planner's portfolio, item catalog and reviews, 
upload photos of their own venue, decorate it virtually with the Planner's items, 
place an order, and chat with the Planner. The Planner uses an admin dashboard 
to manage orders, dates, portfolio, catalog, reviews and messages.

# Tech stack
- React + Vite + Tailwind CSS, mobile-first and responsive (most customers 
  arrive from WhatsApp or Instagram links on phones)
- Supabase: auth, Postgres, storage, realtime
- Deployable on Vercel or Netlify
- Never hardcode keys. Use environment variables and provide .env.example.
- Currency is Malaysian Ringgit (RM) ONLY. Format all prices as "RM 1,250.00". 
  No currency switching, no other currencies anywhere.
- Language: English only for now.

# Roles
1. Visitor (not logged in): can view portfolio, catalog, visible reviews.
2. Customer (logged in): can use the decoration editor, place orders, view 
   their own orders, chat with the Planner, and leave a review after a 
   completed order.
3. Admin: exactly ONE account (the Planner). The admin email is set manually 
   in the database or via an environment variable. Nobody can sign up as admin 
   or promote themselves. Enforce all permissions with Supabase Row Level 
   Security, not only by hiding buttons. A customer must never be able to read 
   another customer's orders, photos, designs or messages.

# Features

## 1. Portfolio
- Gallery of past events, filterable by event type (wedding, birthday, 
  corporate, etc.)
- Each project: title, event type, cover image, multiple photos, description, date
- Lightbox viewer, lazy-loaded images
- Admin: add, edit, delete, reorder projects

## 2. Reviews
- Only customers with a COMPLETED order can leave a review 
  (1-5 stars, text, optional photo), one review per order
- Shown on the homepage and a Reviews page
- Admin can hide or delete a review

## 3. Item catalog (admin-managed)
- Decor items: balloons, backdrops, flowers, table settings, lighting, arches, etc.
- Each item: name, category, price in RM, description, product image, 
  transparent-background PNG for the editor, available/unavailable toggle
- Admin: add, edit, delete, toggle availability
- Unavailable items are hidden from customers in the editor

## 4. Venue decoration editor (main feature)
- Customer uploads one or more photos of their venue (images only, size limit, 
  compressed on upload)
- The photo becomes the canvas background
- Customer drags catalog items onto the photo; can move, resize, rotate, 
  duplicate, delete and reorder layers (front/back)
- Must work with touch on phones (use react-konva or Fabric.js)
- Live list of chosen items with quantities and an ESTIMATED total in RM
- Customer can save the design (item positions stored as JSON) and export a 
  flattened preview image
- Customer can also skip the editor and describe what they want in text
- Show this disclaimer near the total and on the preview: 
  "This is a visual mockup and an estimate. The final result and price may differ."
- This is a 2D mockup, not 3D or AI rendering.

## 5. Orders and quotes
Order contains: event type, event date, venue photos, saved design (optional), 
selected items, notes, contact number.
Statuses, in this order: 
Pending → Quoted → Confirmed → In Progress → Completed (or Cancelled)
- Pending: customer submitted, waiting for the Planner
- Quoted: the Planner reviews the order and sets the FINAL price in RM 
  (may differ from the editor estimate). The customer sees the final price 
  and must accept it (or decline / message the Planner).
- Confirmed: customer accepted the quote
- In Progress: the Planner is working on the event
- Completed: event done (unlocks reviews)
- Cancelled: by either side, before completion
- Customer: "My Orders" page with status, design preview, quoted price, 
  and accept/decline buttons at the Quoted stage
- Admin dashboard: counts and lists of Pending, Active (Quoted/Confirmed/
  In Progress) and Completed orders, with search and filters by status and date
- Admin order detail: venue photos, customer's design preview, item list, notes, 
  customer contact, status controls, price field, and a link to that customer's chat
- Admin can adjust a customer's design or item list and the customer is notified

## 6. Date availability and blocking
- The Planner can only do one event per day.
- Admin has a calendar where they can BLOCK any date (optionally with a private 
  reason such as "personal leave" or "fully booked") and unblock it.
- Dates with a Confirmed or In Progress order are automatically unavailable.
- CUSTOMERS MUST NOT SEE BLOCKED DATES: in the customer date picker, blocked and 
  booked dates are simply disabled/unselectable, with no label, no reason, and 
  no indication of why. Customers can never see the reasons or any other 
  customer's booking details.
- Enforce this on the server: expose only a list of unavailable date values to 
  customers through a database view or function (never the blocked_dates 
  table itself). The database must reject any order submitted with an 
  unavailable date, even if the front end is bypassed.
- Admin sees everything: blocked dates with reasons, and booked dates with 
  the order linked.

## 7. Chat
- One-to-one chat between each customer and the Planner, optionally linked 
  to a specific order
- Realtime (Supabase Realtime), image attachments (private storage), 
  unread badges for both sides
- Admin inbox: all customer conversations sorted by latest message

## 8. Notifications
- In-app notifications: new order, quote sent, quote accepted/declined, 
  status change, new message, new review
- Optional: email on new order and on quote sent

## 9. WhatsApp shortcut
- "Chat on WhatsApp" button (wa.me link) with the Planner's number and a 
  prefilled message. Number is set in the config file.

# Pages
Public/customer: Home, Portfolio, Project detail, Catalog, Reviews, 
Login/Sign up, Decoration Editor, My Orders, Order detail, Chat
Admin: Dashboard, Orders, Order detail,NOTE — the owner's brief was cut off 
here ("Admin: Dashboard, Orders, Order detail,"). See the note at the bottom 
of this file.

<!-- ==================================================================== -->
## Note on this file — added by the team, NOT the owner's words
Everything above this line is the owner's brief reproduced verbatim, except that 
the final line of the "Pages" section was cut off mid-sentence and is continued 
by the two items below. The owner's brief also referred to numbered build stages 
("implement ONLY Stage 1", "implement ONLY Stage 2") but the section defining 
those stages was cut off entirely. Please correct anything here that does not 
match your intent — everything below is the team's reconstruction, not your text.

### 1. Remainder of the Admin pages list
Admin: Dashboard, Orders, Order detail, Calendar (date blocking), Portfolio, 
Catalog, Reviews, Messages (inbox), Settings.

### 2. Build order (stages)
Built in this order, one stage at a time, each verified before the next starts.

- **Stage 1 — Foundation.** App shell, Tailwind design system, mobile-first 
  layout and navigation. Supabase schema for the whole product with Row Level 
  Security on every table, storage buckets, and a database-level rule that 
  rejects an order on an unavailable date. Email/password sign-up and login. 
  Exactly one admin account, set from an environment variable, with no way for 
  anyone to promote themselves. "Chat on WhatsApp" button. `.env.example`, no 
  hardcoded keys, deployable to Vercel or Netlify.
- **Stage 2 — Portfolio, catalog and admin management.** Public portfolio 
  gallery filterable by event type with a lightbox and lazy-loaded images, 
  project detail pages; public item catalog grouped by category with RM prices; 
  admin pages to add, edit, delete, reorder and toggle availability.
- **Stage 3 — Venue decoration editor.** Venue photo upload and compression, 
  canvas background, drag/move/resize/rotate/duplicate/delete/layer ordering 
  with touch support, item list with quantities and estimated RM total, save 
  design as JSON, export flattened preview, text-only request option, and the 
  mockup/estimate disclaimer.
- **Stage 4 — Orders and quotes.** Order submission, the Pending → Quoted → 
  Confirmed → In Progress → Completed / Cancelled flow, customer accept/decline, 
  My Orders and order detail, admin dashboard counts and lists with search and 
  filters, admin order detail with price and status controls.
- **Stage 5 — Date availability and blocking.** Admin calendar with private 
  blocking reasons, customer picker with blocked and booked dates simply 
  disabled and unexplained, server-side enforcement only through the 
  `unavailable_dates` view/function.
- **Stage 6 — Chat.** One-to-one realtime chat with the Planner, optional link 
  to an order, image attachments in private storage, unread badges, admin inbox.
- **Stage 7 — Reviews and notifications.** Reviews after a completed order (one 
  per order, 1-5 stars, optional photo), homepage and Reviews page, admin hide 
  or delete; in-app notifications for the events listed in feature 8.
