# Phase 5 Payment Fixes & Hardening Specification

> **Purpose**: Defines critical transactional integrity, verification, and schema requirements for Razorpay integration in AUREVELLA.  
> Serves as an uncompromisable implementation checklist to be executed prior to and during Phase 5 (Checkout & Payments).

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.0

---

## 1. Context & Scope
During the architectural review of the checkout and payment pipeline, several concurrency edge cases, idempotency pitfalls, and verification vulnerabilities were identified. This specification mandates six critical fixes that must be implemented in backend services and database transactions before opening Phase 5 payment processing.

---

## 2. Mandatory Payment Fixes Checklist (Phase 5)

### Fix 1: Atomicity of Payment Gate, Stock Consumption, and Reservation Release
- **Requirement**: Stock deduction, reservation status update, and order status progression must execute inside a single atomic MongoDB multi-document transaction (`session.withTransaction`).
- **Implementation**:
  - Upon receiving and verifying a successful payment (either via `/api/payments/verify` or via webhook):
    - Start a MongoDB client session and transaction.
    - Validate order status and reservation.
    - Decrement `inventory.stock` / SKU variant stock atomically.
    - Update `reservation.status = 'consumed'`.
    - Set `order.orderStatus = 'placed'` and `order.paymentStatus = 'paid'`.
    - Commit transaction.
  - If any step fails (e.g., write conflict, transient network error), roll back the entire transaction.

### Fix 2: Order Status Gate & Late Payment Handling
- **Requirement**: The payment verification gate must strictly require `orderStatus: 'pending_payment'`. Late payments arriving for expired orders must follow a designated recovery path with explicit state transitions.
- **State Machine Additions**:
  - Add explicit valid transitions:
    - `expired` -> `placed` (if late payment is verified and inventory remains available)
    - `expired` -> `cancelled` (if late payment is verified but inventory was released/sold out, flagging for immediate full refund)
- **Late Payment Protocol**:
  - When a payment is confirmed for an order currently in `expired` state:
    - Attempt to re-reserve or consume stock atomically.
    - If stock is successfully acquired: transition `expired` -> `placed`, mark payment `paid`, notify customer.
    - If stock is exhausted: record payment as `paid`, transition `expired` -> `cancelled`, flag order with `needsAttention: true`, and initiate an automated or queued manual refund via Razorpay Refund API.

### Fix 3: Server-Side Authoritative Razorpay Verification
- **Requirement**: The `/api/payments/verify` endpoint must never trust amount, currency, or status data provided by the client request payload.
- **Implementation**:
  - Client sends only: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`.
  - Backend must:
    1. Verify cryptographic HMAC signature locally using `RAZORPAY_KEY_SECRET`.
    2. Call the Razorpay REST API directly server-side: `razorpay.payments.fetch(razorpayPaymentId)`.
    3. Assert `payment.order_id === order.razorpayOrderId`.
    4. Assert `payment.status === 'captured'` (or 'authorized' if manual capture is configured).
    5. Assert `payment.amount === order.totalAmountPaise` (exact match in paise).
    6. Assert `payment.currency === 'INR'`.
  - Reject verification if any field mismatches.

### Fix 4: Schema Additions for Auditability and Reconciliation
- **Requirement**: Enhance `Order` and `Payment` schemas with fields necessary for automated reconciliation and dispute resolution.
- **Fields to Add**:
  - `orders.razorpayOrderId`: Indexed field (`index: true`) for $O(1)$ lookup during webhooks and verification.
  - `orders.paymentDetails`: Sub-document storing authoritative gateway metadata (`method`, `bank`, `wallet`, `vpa`, `cardLast4`, `cardNetwork`).
  - `orders.needsAttention`: Boolean flag (`default: false`, `index: true`), set to `true` on late payment stock collisions, partial captures, or refund anomalies requiring admin intervention.
  - `orders.refunds`: Array of refund sub-documents:
    ```javascript
    refunds: [{
      razorpayRefundId: { type: String, required: true },
      amountPaise: { type: Number, required: true },
      status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
      reason: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
    ```

### Fix 5: Non-Unique Razorpay Order ID on Payments Collection
- **Requirement**: `payments.razorpayOrderId` must **NOT** carry a unique index constraint.
- **Rationale**: A customer may attempt payment multiple times for a single Razorpay Order ID if an initial attempt fails or is cancelled. Each attempt generates a unique `razorpayPaymentId`, but shares the same `razorpayOrderId`.
- **Indexing Rule**:
  - `razorpayPaymentId`: `{ type: String, required: true, unique: true, index: true }`
  - `razorpayOrderId`: `{ type: String, required: true, index: true, unique: false }`

### Fix 6: Webhook Security Exemptions & Clean Rollback on Order Creation Failure
- **Requirement A - Webhook Bypass**:
  - The Razorpay Webhook endpoint (`POST /api/payments/webhook`) must be explicitly exempt from custom browser CSRF/Origin validation headers (`X-Aurevella-Request` and `Origin === CLIENT_URL`), because webhooks originate directly from Razorpay's servers.
  - Must validate authenticity strictly via `razorpay-signature` header using `crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)`.
  - Must consume raw unparsed request body (`express.raw({ type: 'application/json' })`) for cryptographic signature verification.
- **Requirement B - Reservation Release on Gateway Failure**:
  - If Razorpay Order generation fails during `/api/checkout/create-order` (e.g. gateway timeout or API error), any stock reservations placed immediately prior must be synchronously released in a `catch` block before returning an error response to the client.
