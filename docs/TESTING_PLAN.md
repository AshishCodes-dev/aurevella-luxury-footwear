# Quality Assurance & Testing Plan: AUREVELLA

> **Purpose**: Defines the test scenarios, negative edge-case validations, and verification checklists for AUREVELLA.  
> Ensures rigorous quality control across customer journeys, admin workflows, payment gateway integrity, and live deployment.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.1

---

## 1. Test Verification Matrix & Checklists

### Group A: Customer Flow Validation
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Register new customer account with valid data. | Account created, password hashed with `bcrypt`, `select: false` enforced, session cookie issued, redirected to home. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-02** | Attempt registration with an already registered email. | Returns `409 Conflict` with clear message: *"Email already in use."* | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-03** | Log in with correct credentials. | Session cookie set; user name visible in navbar; access to profile granted. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-04** | Log in with incorrect password. | Returns `401 Unauthorized` with generic message: *"Invalid email or password."* | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-05** | Browse product catalogue and apply category filter. | Display updates to show only items matching selected category without page reload. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-06** | Select size and colour variant on Product Detail Page. | SKU stock status and specific variant imagery/price reflect instantly. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-07** | Add product variant to shopping cart (as guest and logged-in). | Cart counter increments; guest cart persists in browser; database cart persists on server. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-08** | Attach custom monogram/specification to bespoke footwear `[OPEN]`. | Custom choices attach to cart line item and reflect on cart summary with `priceDeltaPaise`. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-09** | Update item quantity in shopping cart. | Line item total and overall subtotal in paise recalculate dynamically. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-10** | Remove item from shopping cart. | Line item removed; subtotal recalculates; if empty, shows empty state with CTA. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-11** | Unauthenticated user clicks "Proceed to Checkout". | User redirected to login screen; after authentication, guest cart merges into account cart `[ASSUMPTION]`. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-12** | Save new delivery address during checkout. | Address added to customer's address book and selected for current order. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TC-13** | View customer order history after purchase. | Lists placed order with status `placed`, tracking items, and total amount. | `LOCAL` / `LIVE ONLY` | [ ] |

---

### Group B: Admin Flow Validation
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TA-01** | Admin login via seeded credentials (`seedAdmin.js`). | Access granted to `/admin` dashboard; navigation shows management tabs. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-02** | Create a new product with base details and images. | Product created in DB with generated slug and `basePricePaise`; displays in admin table. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-03** | Add size, colour, and stock variants to an existing product. | Variants created with unique SKUs; `stock` counter visible, `reservedQuantity` initialized to 0. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-04** | Toggle product Limited Edition badge and set batch limit. | Product reflects Limited Edition luxury badge and displays batch cap counters on PDP. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-05** | Deactivate a product. | Product hidden from customer catalogue; existing historical orders retain product data. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-06** | View list of customer orders in admin portal. | Orders listed chronologically with order number, customer, status, and total. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-07** | Update order status to `processing` or `shipped` with tracking code. | Order status history updated with actor `admin`; customer-facing tracking displays updated state. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TA-08** | Review incoming contact concierge inquiries and update status. | List of contact submissions rendered with inquiry text; status toggles to `in_progress` or `resolved`. | `LOCAL` / `LIVE ONLY` | [ ] |

---

### Group C: Payment & Financial Gateway Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TP-01** | Initiate checkout: create Razorpay order. | Server queries DB prices, locks 15-min stock reservation, and returns valid Razorpay Order ID. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TP-02** | Complete payment in test mode using test UPI/Card. | Razorpay modal succeeds; verification API validates HMAC signature; order status set to `placed`, payment to `paid`. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TP-03** | Inventory decrement post-payment. | Product variant `stock` and `reservedQuantity` decrement atomically by purchased quantity; reservation marked `consumed`. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TP-04** | Customer cart clearance post-payment. | Customer's active cart is emptied upon successful order confirmation. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TP-05** | Webhook verification (`payment.captured`). | Webhook signature validated with raw bytes; calls shared `finalizeOrderPayment`; order marked `placed` if not already finalized. | `WEBHOOK TUNNEL` / `LIVE ONLY` | [ ] |

---

### Group D: Negative & Security Edge-Case Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TN-01** | **Price Tampering**: Client intercepts request and proposes total of ₹1. | Backend recalculates subtotal from DB prices in paise, ignores client payload, charges authentic total. | `LOCAL` | [ ] |
| **TN-02** | **Payment Cancellation**: User closes Razorpay modal without paying. | Order status set to `cancelled`; stock reservation released (`reservedQuantity -= q`); cart retained. | `LOCAL` | [ ] |
| **TN-03** | **Failed Payment**: Gateway returns payment authorization failure. | Error message displayed; order marked `cancelled`, payment `failed`; reservation released. | `LOCAL` | [ ] |
| **TN-04** | **Tampered Signature**: Client posts fake `razorpay_signature` to verify API. | Cryptographic verification fails; returns `400 Bad Request`; order is not fulfilled. | `LOCAL` | [ ] |
| **TN-05** | **Duplicate Payment Callback / Idempotency**: Verification endpoint called twice for same order. | Second call recognizes order is already `paid`; returns success without double-decrementing stock. | `LOCAL` | [ ] |
| **TN-06** | **Out-of-Stock Purchase**: Customer attempts checkout on variant with 0 available stock. | Pre-checkout reservation check blocks order creation; notifies user: *"Selected variant is out of stock."* | `LOCAL` | [ ] |
| **TN-07** | **Unauthorized Admin Access**: Regular customer visits `/admin` or calls `/api/admin/*`. | Access rejected with `403 Forbidden`; redirected to home or forbidden page. | `LOCAL` | [ ] |
| **TN-08** | **Expired JWT Session**: User performs action with an expired session token. | Request returns `401 Unauthorized`; user redirected cleanly to login. | `LOCAL` | [ ] |
| **TN-09** | **CORS Origin Violation**: Request sent from unauthorized domain (e.g., `evil-site.com`). | Express CORS middleware rejects request with CORS origin error. | `LOCAL` | [ ] |
| **TN-10** | **Rate Limit Trigger**: 6 consecutive incorrect logins within 15 minutes. | 6th attempt blocked with `429 Too Many Requests`. | `LOCAL` | [ ] |
| **TN-11** | **Concurrent Last Pair Checkout**: Two customers buy the last available pair simultaneously. | MongoDB transaction succeeds for first buyer and reserves stock; second buyer receives `400 Bad Request` "Insufficient stock". | `LOCAL` | [ ] |
| **TN-12** | **Late-Payment After Expiry**: Reservation expires (15 min), stock is released, then customer payment arrives. | System attempts re-reservation; if unavailable, marks order `needs-attention`, executes automatic Razorpay refund, and alerts admin. | `LOCAL` / `WEBHOOK TUNNEL` | [ ] |
| **TN-13** | **Concurrent Callback & Webhook Arrival**: Browser `/verify` and server `/webhook` arrive at the exact same millisecond. | Atomic `findOneAndUpdate({ paymentStatus: "pending" })` allows exactly one to process; other is safely ignored. No double fulfillment. | `WEBHOOK TUNNEL` | [ ] |
| **TN-14** | **Payment Amount Mismatch**: Paid amount from gateway does not match order `totalAmountPaise`. | Payment verification fails; error logged; order is not marked `placed`. | `LOCAL` / `WEBHOOK TUNNEL` | [ ] |
| **TN-15** | **Cross-User Order Hijack**: Authenticated User A attempts to call `/api/payments/verify` for User B's order. | Backend checks `order.user.equals(req.user._id)`; returns `403 Forbidden`. | `LOCAL` | [ ] |
| **TN-16** | **Invalid Webhook Signature**: Malicious payload sent to `/api/payments/webhook` with bad HMAC. | Raw body verification fails; returns `400 Bad Request`; order status unchanged. | `LOCAL` / `WEBHOOK TUNNEL` | [ ] |
| **TN-17** | **Webhook Replay Attack**: Legitimate webhook with same `x-razorpay-event-id` is resent by attacker. | Backend detects event ID in processed events log; returns `200 OK` without repeating actions. | `WEBHOOK TUNNEL` | [ ] |
| **TN-18** | **Multi-Item Cart Partial Out-of-Stock**: Cart has 3 items; 1 item lacks stock during reservation. | Entire multi-document transaction rolls back; zero items reserved; user notified. | `LOCAL` | [ ] |
| **TN-19** | **Cancellation Before Dispatch**: Customer or admin cancels order in `placed` or `processing` state. | Order transitions to `cancelled`; physical inventory restored (`stock += quantity`); refund queued/executed. | `LOCAL` | [ ] |
| **TN-20** | **CSRF Header Enforcement**: Mutating request sent without `X-Aurevella-Request: 1` header. | Custom CSRF middleware rejects request with `403 Forbidden`. | `LOCAL` | [ ] |
| **TN-21** | **Password Reset Token Abuse**: Using expired (>30m) or already consumed reset token. | Token rejected with `400 Bad Request`; requesting reset for non-existent email returns generic success. | `LOCAL` | [ ] |
| **TN-22** | **Immediate Privilege Revocation**: Admin role revoked or `isActive` set to `false` while user has active token. | Auth middleware re-fetches user on next request and immediately denies access with `401`/`403`. | `LOCAL` | [ ] |
| **TN-23** | **Limited Edition Batch Cap Enforcement**: Purchasing items when `batchReservedCount + batchSoldCount >= totalBatchLimit`. | Batch cap check aborts reservation transaction; displays "Limited Edition batch exhausted". | `LOCAL` | [ ] |

---

### Group E: Responsive Design & Cross-Device Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TR-01** | Mobile Viewport (iPhone SE / 375px width). | Navbar collapses to slide-out drawer; font sizes legible; no horizontal scrolling. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TR-02** | Standard Handheld (Android / 414px width). | Product grid displays 1 column; touch targets >= 44px; sticky checkout button. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TR-03** | Tablet Viewport (iPad / 768px - 1024px). | Product grid renders 2 columns; filter drawer accessible; cart modal scales cleanly. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TR-04** | Desktop Viewport (1440px - 1920px). | Centered max-width luxury container; 3 or 4-column product grid; multi-image PDP gallery. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TR-05** | Dark Mode Brand Contrast Check. | Background (#0F0A09), brown circle logo (#2E1814), and ivory accents (#CFC9BA) maintain crisp visual distinction. | `LOCAL` / `LIVE ONLY` | [ ] |

---

### Group F: Live Deployment & Production Checks
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TL-01** | Production Build Execution (`npm run build`). | Vite produces optimized bundles with no compilation or styling errors. | `LOCAL` / `LIVE ONLY` | [ ] |
| **TL-02** | Production SSL Certificate Verification. | Browser padlock verifies valid HTTPS certificate on custom client domain and `api.` subdomain. | `LIVE ONLY` | [ ] |
| **TL-03** | Live Health Check (`GET /api/health`). | Returns `{ status: "ok", service: "aurevella-backend", database: "connected" }`. | `LIVE ONLY` | [ ] |
| **TL-04** | Real Currency Small Transaction (₹1 or test mode). | Live Razorpay settlement, order generation, and notification verified end-to-end. | `LIVE ONLY` | [ ] |
| **TL-05** | Zero Secret Leakage Audit. | Verify production bundles and Git repository history contain no `.env` files or raw secrets. | `LIVE ONLY` | [ ] |
| **TL-06** | Subdomain Cookie Cross-Origin Behavior. | Verify `SameSite=Lax` cookies attach seamlessly from `https://aurevella.com` to `https://api.aurevella.com` in Safari and Chrome. | `LIVE ONLY` | [ ] |

---

## 2. Bug Report Template

When defects or unexpected behaviors are identified during testing, document them using this standardized template:

```markdown
### Bug Report: [Short Descriptive Title]

- **Bug ID**: BUG-[Phase]-[Sequence, e.g. BUG-04-001]
- **Severity**: [Critical / High / Medium / Low]
- **Environment**: [LOCAL / WEBHOOK TUNNEL / LIVE ONLY]
- **Browser & OS**: [e.g., Chrome 124 on macOS / Safari on iOS 17.4]
- **Component**: [Auth / PDP / Cart / Checkout / Razorpay / Admin]

#### Steps to Reproduce
1. Navigate to '...'
2. Click on '...'
3. Enter '...' into field
4. Observe error

#### Expected Result
[Clear statement of what should have occurred according to requirements]

#### Actual Result
[Exact error message, screenshot, or description of malfunction]

#### Supporting Logs / Network Traces
- API Endpoint: `POST /api/...`
- Response Code: `500 Internal Server Error`
- Response Body: `{"status": "error", "message": "..."}`
```

---

## 3. Phase Sign-Off Checklist

Before advancing between implementation phases, the technical team and stakeholders must verify:

- [ ] All functional requirements planned for the phase satisfy acceptance criteria.
- [ ] All relevant test IDs in this plan pass without regressions.
- [ ] Zero unhandled errors or console warnings exist in developer tools.
- [ ] `npm run build` succeeds cleanly in `frontend/`.
- [ ] No secrets or `.env` files are tracked in Git.
- [ ] Changes are committed with descriptive messages and pushed to GitHub main.
- [ ] Milestone tag created and pushed to remote repository.
- [ ] Phase progress logged in `docs/PHASE_LOG.md`.

---

## Changelog v1.1
- **Money Unit Standard**: All test cases and assertions updated to reflect integer PAISE validation.
- **Unified Status Enums**: Replaced all obsolete statuses with exact enums (`pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`).
- **Concurrency & Stock Edge Cases**: Appended `TN-11` (concurrent purchase of last item), `TN-12` (late payment after reservation expiry with refund path), and `TN-18` (multi-item partial out-of-stock transaction rollback).
- **Payment Gateway Hardening**: Appended `TN-13` (concurrent callback and webhook race condition), `TN-14` (amount mismatch), `TN-15` (cross-user order hijack), `TN-16` (bad webhook signature), and `TN-17` (webhook replay protection).
- **Security & Account Hardening**: Appended `TN-19` (cancellation before dispatch stock restoration), `TN-20` (CSRF header enforcement), `TN-21` (password reset token expiry and abuse), `TN-22` (immediate dynamic privilege revocation), `TN-23` (Limited Edition batch cap limit), and `TL-06` (subdomain cookie cross-origin behavior).
- **Environment Tagging**: Explicitly classified all tests by environment (`LOCAL`, `WEBHOOK TUNNEL`, `LIVE ONLY`).
