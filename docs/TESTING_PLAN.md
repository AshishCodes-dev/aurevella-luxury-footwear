# Quality Assurance & Testing Plan: AUREVELLA

> **Purpose**: Defines the test scenarios, negative edge-case validations, and verification checklists for AUREVELLA.  
> Ensures rigorous quality control across customer journeys, admin workflows, payment gateway integrity, and live deployment.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1

---

## 1. Test Verification Matrix & Checklists

### Group A: Customer Flow Validation
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Register new customer account with valid data. | Account created, password hashed in DB, session cookie issued, redirected to home. | Localhost / Live | [ ] |
| **TC-02** | Attempt registration with an already registered email. | Returns `409 Conflict` with clear message: *"Email already in use."* | Localhost / Live | [ ] |
| **TC-03** | Log in with correct credentials. | Session cookie set; user name visible in navbar; access to profile granted. | Localhost / Live | [ ] |
| **TC-04** | Log in with incorrect password. | Returns `401 Unauthorized` with generic message: *"Invalid email or password."* | Localhost / Live | [ ] |
| **TC-05** | Browse product catalogue and apply category filter. | Display updates to show only items matching selected category without page reload. | Localhost / Live | [ ] |
| **TC-06** | Select size and colour variant on Product Detail Page. | SKU stock status and specific variant imagery/price reflect instantly. | Localhost / Live | [ ] |
| **TC-07** | Add product variant to shopping cart. | Cart badge updates counter; slide-over cart shows item, size, colour, and price. | Localhost / Live | [ ] |
| **TC-08** | Attach custom monogram/specification to custom footwear `[OPEN]`. | Custom text attaches to cart line item and reflects on cart summary. | Localhost / Live | [ ] |
| **TC-09** | Update item quantity in shopping cart. | Line item total and overall subtotal recalculate dynamically. | Localhost / Live | [ ] |
| **TC-10** | Remove item from shopping cart. | Line item removed; subtotal recalculates; if empty, shows empty state with CTA. | Localhost / Live | [ ] |
| **TC-11** | Unauthenticated user clicks "Proceed to Checkout". | User redirected to login screen with return URL set to checkout upon login `[ASSUMPTION]`. | Localhost / Live | [ ] |
| **TC-12** | Save new delivery address during checkout. | Address added to customer's address book and selected for current order. | Localhost / Live | [ ] |
| **TC-13** | View customer order history after purchase. | Lists placed order with status *"Placed"*, tracking items, and total amount. | Localhost / Live | [ ] |

---

### Group B: Admin Flow Validation
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TA-01** | Admin login via seeded credentials. | Access granted to `/admin` dashboard; navigation shows management tabs. | Localhost / Live | [ ] |
| **TA-02** | Create a new product with base details and images. | Product created in DB with generated slug; displays in admin product table. | Localhost / Live | [ ] |
| **TA-03** | Add size, colour, and stock variants to an existing product. | Variants created with unique SKUs; inventory counter visible. | Localhost / Live | [ ] |
| **TA-04** | Toggle product Limited Edition badge and set batch limit. | Product reflects Limited Edition luxury badge and displays edition limit on PDP. | Localhost / Live | [ ] |
| **TA-05** | Deactivate a product. | Product hidden from customer catalogue; existing historical orders retain product data. | Localhost / Live | [ ] |
| **TA-06** | View list of customer orders in admin portal. | Orders listed chronologically with order number, customer, status, and total. | Localhost / Live | [ ] |
| **TA-07** | Update order status to *"Crafting"* or *"Shipped"* with tracking code. | Order status history updated; customer-facing tracking displays updated state. | Localhost / Live | [ ] |
| **TA-08** | Review incoming contact concierge inquiries. | List of contact submissions rendered with inquiry text and contact info. | Localhost / Live | [ ] |

---

### Group C: Payment & Financial Gateway Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TP-01** | Initiate checkout: create Razorpay order. | Server queries DB prices, calculates total in paise, and returns valid Razorpay Order ID. | Localhost / Live | [ ] |
| **TP-02** | Complete payment in test mode using test UPI/Card. | Razorpay modal reports success; verification API validates HMAC signature; order status set to *"Placed"*. | Localhost / Live | [ ] |
| **TP-03** | Inventory decrement post-payment. | Product variant stock decrements atomically by the exact purchased quantity. | Localhost / Live | [ ] |
| **TP-04** | Customer cart clearance post-payment. | Customer's active cart is emptied upon successful order confirmation. | Localhost / Live | [ ] |
| **TP-05** | Webhook verification (`payment.captured`). | Webhook signature validated with secret; order marked paid if not already completed. | Localhost / Live | [ ] |

---

### Group D: Negative & Security Edge-Case Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TN-01** | **Price Tampering**: Client intercepts request and proposes total of ₹1. | Backend recalculates subtotal from DB prices, ignores client payload, charges authentic total. | Localhost / Live | [ ] |
| **TN-02** | **Payment Cancellation**: User closes Razorpay modal without paying. | Order remains in *"Payment Pending"* state; inventory remains untouched; cart retained. | Localhost / Live | [ ] |
| **TN-03** | **Failed Payment**: Gateway returns payment authorization failure. | Error message displayed to customer; order marked *"Payment Failed"*; stock not reduced. | Localhost / Live | [ ] |
| **TN-04** | **Tampered Signature**: Client posts fake `razorpay_signature` to verify API. | Cryptographic verification fails; returns `400 Bad Request`; order is not fulfilled. | Localhost / Live | [ ] |
| **TN-05** | **Duplicate Payment Callback / Idempotency**: Verification endpoint called twice for same order. | Second call recognizes order is already placed; returns success without double-decrementing stock. | Localhost / Live | [ ] |
| **TN-06** | **Out-of-Stock Purchase**: Customer attempts checkout on variant with 0 stock. | Pre-checkout check blocks order creation; notifies user: *"Selected variant is out of stock."* | Localhost / Live | [ ] |
| **TN-07** | **Unauthorized Admin Access**: Regular customer visits `/admin` or calls `/api/admin/*`. | Access rejected with `403 Forbidden`; redirected to home or forbidden page. | Localhost / Live | [ ] |
| **TN-08** | **Expired JWT Session**: User performs action with an expired session token. | Request returns `401 Unauthorized`; user redirected cleanly to login. | Localhost / Live | [ ] |
| **TN-09** | **CORS Origin Violation**: Request sent from unauthorized domain (e.g., `evil-site.com`). | Express CORS middleware rejects request with CORS origin error. | Localhost / Live | [ ] |
| **TN-10** | **Rate Limit Trigger**: 6 consecutive incorrect logins within 15 minutes. | 6th attempt blocked with `429 Too Many Requests`. | Localhost / Live | [ ] |

---

### Group E: Responsive Design & Cross-Device Tests
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TR-01** | Mobile Viewport (iPhone SE / 375px width). | Navbar collapses to slide-out drawer; font sizes legible; no horizontal scrolling. | Localhost / Live | [ ] |
| **TR-02** | Standard Handheld (Android / 414px width). | Product grid displays 1 column; touch targets >= 44px; sticky checkout button. | Localhost / Live | [ ] |
| **TR-03** | Tablet Viewport (iPad / 768px - 1024px). | Product grid renders 2 columns; filter drawer accessible; cart modal scales cleanly. | Localhost / Live | [ ] |
| **TR-04** | Desktop Viewport (1440px - 1920px). | Centered max-width luxury container; 3 or 4-column product grid; multi-image PDP gallery. | Localhost / Live | [ ] |
| **TR-05** | Dark Mode Brand Contrast Check. | Background (#0F0A09), brown circle logo (#2E1814), and ivory accents (#CFC9BA) maintain crisp visual distinction. | Localhost / Live | [ ] |

---

### Group F: Live Deployment & Production Checks
| ID | Action / Test Scenario | Expected Result | Environment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TL-01** | Production Build Execution (`npm run build`). | Vite produces optimized bundles with no compilation or styling errors. | Localhost / Live | [ ] |
| **TL-02** | Production SSL Certificate Verification. | Browser padlock verifies valid HTTPS certificate on custom client domain. | Live | [ ] |
| **TL-03** | Live Health Check (`GET /api/health`). | Returns `{ status: "ok", service: "aurevella-backend", database: "connected" }`. | Live | [ ] |
| **TL-04** | Real Currency Small Transaction (₹1 or test mode). | Live Razorpay settlement, order generation, and notification verified end-to-end. | Live | [ ] |
| **TL-05** | Zero Secret Leakage Audit. | Verify production bundles and Git repository history contain no `.env` files or raw secrets. | Live | [ ] |

---

## 2. Bug Report Template

When defects or unexpected behaviors are identified during testing, document them using this standardized template:

```markdown
### Bug Report: [Short Descriptive Title]

- **Bug ID**: BUG-[Phase]-[Sequence, e.g. BUG-04-001]
- **Severity**: [Critical / High / Medium / Low]
- **Environment**: [Localhost / Staging / Live Production]
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
