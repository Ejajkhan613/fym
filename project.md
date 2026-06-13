# 1. Product Vision

name - Find Your Medicines (FYM)

Build a platform like **Blinkit / Flipkart Minutes for medicines**, but with a regulated operating model:

> Users place medicine orders by search or prescription upload. The platform routes the request to licensed nearby pharmacies within a service radius. Pharmacies accept only if stock is available and dispensing is legally valid. Once accepted, the order is locked to that pharmacy, packed under pharmacist supervision, and delivered to the customer with billing, prescription audit trail, and compliance records.

The app should not behave like “any shop can sell anything.” It should behave like a **licensed pharmacy network orchestration system**.

---

# 2. Core Business Model

## Main actors

1. **Customer / Patient**

   * Searches medicines.
   * Uploads prescription.
   * Chooses delivery address.
   * Gets medicine delivered quickly.

2. **Pharmacy / Vendor**

   * Licensed medical shop.
   * Receives nearby order opportunities.
   * Accepts only if stock is available.
   * Packs and dispenses under registered pharmacist supervision.
   * Handles substitution requests if allowed.

3. **Delivery Partner**

   * Can be pharmacy’s own delivery person.
   * Or platform-managed delivery fleet.
   * Or third-party hyperlocal logistics partner.

4. **Platform Admin**

   * Manages users, pharmacies, pharmacists, licenses, medicines, orders, disputes, penalties, audits, pricing, fraud, compliance, and city operations.

5. **Registered Pharmacist**

   * Must verify prescription orders.
   * Must approve regulated medicine dispensing.
   * Must maintain audit trail.


# 3. Main User Flows

## Flow 1: Search-based OTC order

1. User opens app.
2. Enters medicine/product name.
3. System shows:

   * Product
   * Strength
   * Form: tablet, syrup, injection, cream
   * Pack size
   * Generic alternative
   * Whether prescription required
4. User adds to cart.
5. System checks nearby pharmacies within 5 km.
6. Sends order request to eligible pharmacies.
7. First pharmacy to accept gets the order.
8. Other pharmacies lose visibility or see “Order assigned.”
9. Payment collected.
10. Pharmacy packs.
11. Delivery assigned.
12. Order delivered.
13. Invoice and record stored.

## Flow 2: Prescription image upload

1. User uploads prescription.
2. OCR extracts:

   * Medicine names
   * Dosage
   * Frequency
   * Duration
   * Doctor details
   * Patient details
3. User confirms extracted medicines.
4. System classifies medicines:

   * OTC
   * Prescription
   * Restricted
   * Ambiguous
5. If ambiguous, send to pharmacist review queue.
6. Nearby pharmacies receive prescription order request.
7. Pharmacy sees:

   * Prescription image
   * Extracted medicine list
   * Required quantity
   * Substitution permission status
   * Delivery distance
   * SLA timer
8. Pharmacy accepts only if stock is available.
9. Pharmacist confirms legal dispensing.
10. Order locked.
11. Invoice generated.
12. Packing and delivery start.

## Flow 3: Pharmacy acceptance race

This is critical.

Your initial idea says:

> Send to shops in 5 km range. Whoever accepts, order removed from others.

This needs concurrency-safe design.

Process:

1. Order created with status `PENDING_VENDOR_ACCEPTANCE`.
2. Candidate pharmacies selected.
3. Order broadcasted to top N pharmacies.
4. Each pharmacy has an acceptance timer, for example 45 seconds.
5. First valid acceptance creates an atomic lock.
6. Backend changes order status to `ACCEPTED_BY_VENDOR`.
7. Other vendor offers are automatically closed.
8. If accepted pharmacy fails inventory verification later, penalty workflow begins.
9. If no vendor accepts, expand radius or show unavailable.

Backend must use **atomic compare-and-set**, database transaction, or distributed lock to avoid two pharmacies accepting the same order.

---

# 6. Pharmacy Onboarding

This platform’s success depends on pharmacy quality.

## Required onboarding documents

For each pharmacy:

1. Drug license
2. GST details
3. Shop registration
4. Owner KYC
5. Registered pharmacist details
6. Pharmacist registration certificate
7. Bank account
8. Store address
9. Store geo-location
10. Operating hours
11. Delivery capability
12. Cold-chain capability if applicable
13. Invoice format
14. Return policy agreement
15. Platform service agreement
16. Penalty agreement
17. Prescription compliance declaration

## Onboarding states

```text
DRAFT
DOCUMENT_SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
BLACKLISTED
```

## Pharmacy trust score

Every pharmacy should have a dynamic score:

```text
Trust Score = 
  acceptance accuracy
+ cancellation rate
+ delivery SLA
+ prescription compliance
+ customer rating
+ stock accuracy
+ dispute rate
+ refund rate
+ admin audit score
```

Use this score when selecting which pharmacies receive orders first.

---

# 7. Vendor Penalty System

Your penalty idea is correct, but it must be designed carefully.

You should not only penalize cancellation. You should penalize **wrongful acceptance**.

## Penalty triggers

1. Pharmacy accepts but later says medicine unavailable.
2. Pharmacy substitutes without permission.
3. Pharmacy dispenses wrong strength.
4. Pharmacy delays beyond SLA.
5. Pharmacy cancels after packing deadline.
6. Pharmacy marks packed but delivery partner reports not ready.
7. Pharmacy repeatedly rejects prescription after accepting.
8. Pharmacy tries to collect extra money offline.
9. Pharmacy provides invalid invoice.
10. Pharmacy violates prescription rules.

## Penalty levels

| Level   | Condition                           | Action                                  |
| ------- | ----------------------------------- | --------------------------------------- |
| Level 1 | First minor issue                   | Warning                                 |
| Level 2 | Repeated stock mismatch             | Small penalty                           |
| Level 3 | Late cancellation                   | Higher penalty + lower ranking          |
| Level 4 | Wrong medicine / prescription issue | Temporary suspension                    |
| Level 5 | Fraud / regulatory issue            | Permanent suspension + legal escalation |

## Penalty amount logic

Avoid random flat penalties. Use formula-based penalties:

```text
Penalty = base penalty 
        + customer inconvenience fee 
        + delivery loss 
        + platform SLA damage fee 
        + repeat offender multiplier
```

Example:

```text
Base: ₹50
Late cancellation after acceptance: ₹100
Delivery partner already assigned: ₹40
Repeat multiplier: 1.5x
Total = (50 + 100 + 40) * 1.5 = ₹285
```

## Vendor appeal system

Pharmacies must have appeal rights:

* “Medicine damaged before packing”
* “Prescription invalid”
* “Customer unreachable”
* “System inventory sync issue”
* “Delivery partner delayed”

Admin can approve or reject appeal.

This prevents unfair vendor dissatisfaction.

---

# 8. Inventory Management Strategy

Inventory is the hardest real-world problem.

Small pharmacies often do not have clean digital inventory. If your system blindly depends on vendor inventory, orders will fail.

## Inventory maturity levels

### Level 0: Manual confirmation

Pharmacy receives order and manually checks shelf.

Good for early launch.

Bad for speed.

### Level 1: Manual stock upload

Pharmacy uploads CSV or updates stock in vendor app.

Good for semi-organized pharmacies.

### Level 2: POS integration

Integrate with pharmacy billing/POS software.

Better accuracy.

### Level 3: Real-time inventory sync

Inventory updates automatically after every sale.

Best long-term model.

## Recommended launch strategy

Start with:

```text
Manual confirmation + medium penalty for wrong acceptance (like 5 rupees) + pharmacy trust scoring
```

Then add:

```text
Top vendors must maintain digital inventory for better ranking.
```

Eventually:

```text
Only verified-stock vendors get instant order priority.
```

---

# 9. Vendor Order Acceptance Design

The vendor app should not simply show “Accept.”

It should show:

```text
Prescription required: Yes/No
Medicine list
Brand
Generic name
Strength
Quantity
Stock confirmation checkbox
Expiry confirmation checkbox
Pharmacist verification checkbox
Expected packing time
Penalty warning
Accept button
Reject button
Suggest substitute button
```

Before accepting, vendor must confirm:

```text
I confirm that:
- Medicine is available
- Correct strength is available
- Expiry is valid
- Prescription has been checked where required
- Invoice will be generated
```

This creates legal and operational accountability.

---

# 10. Medicine Search Engine

Medicine search must be much smarter than normal product search.

## Search challenges

Users may type:

```text
Dolo 650
Dolo650
Dolo
dolo tablet
paracetamol 650
Crocin 650
medicine for fever
```

System must understand:

```text
Brand: Dolo 650
Generic: Paracetamol
Strength: 650 mg
Form: Tablet
Prescription: likely OTC/policy dependent
```

## Medicine catalog fields

```text
medicine_id
brand_name
generic_name
salt_composition
strength
dosage_form
manufacturer
pack_size
mrp
schedule_category
requires_prescription
is_restricted
storage_type
cold_chain_required
substitution_allowed
therapeutic_class
side_effect_warning
interaction_warning
```

## Search architecture

Use hybrid search:

1. PostgreSQL full-text search
2. Elasticsearch / OpenSearch
3. Synonym dictionary
4. Salt-based search
5. Typo tolerance
6. Brand-to-generic mapping
7. Prescription OCR matching
8. Ranking by popularity and availability

## Search result example

```text
Dolo 650 Tablet
Salt: Paracetamol 650mg
Pack: 15 tablets
Prescription: Not required / depends on policy
```

---

# 11. Prescription OCR and Verification

Prescription upload is a core feature.

## OCR pipeline

1. User uploads image/PDF.
2. Image pre-processing:

   * crop
   * rotate
   * denoise
   * improve contrast
3. OCR extracts text.
4. NLP medicine parser identifies:

   * medicine name
   * strength
   * dosage
   * frequency
   * duration
   * quantity
5. Confidence score generated.
6. Low-confidence items go to manual review.

## Human-in-the-loop rule

Do not allow AI alone to approve prescription medicine.

Use AI to assist, but final dispensing approval should be by licensed pharmacist.

## Prescription validation checks

```text
Is prescription image readable?
Is doctor name visible?
Is doctor registration number visible?
Is patient name visible?
Is date valid?
Are medicine names clear?
Is quantity within prescribed duration?
Is medicine restricted?
Is duplicate prescription being reused?
Has prescription expired according to policy?
```

## Prescription fraud detection

Detect:

1. Same prescription used by many accounts.
2. Edited image.
3. Cropped doctor details.
4. Old prescription reused for antibiotics/sedatives.
5. Suspicious repeated orders.
6. Multiple accounts at same address.
7. High-risk medicine combinations.
8. Prescription generated by fake clinic.

---

# 12. Nearby Pharmacy Matching Algorithm

Your idea: send to shops in 5 km radius.

Better production version:

## Candidate selection

A pharmacy is eligible only if:

```text
distance <= service radius
pharmacy is open
pharmacy is approved
pharmacist is available
pharmacy supports prescription order type
pharmacy supports delivery to location
pharmacy has acceptable trust score
pharmacy is not overloaded
pharmacy is not temporarily paused
```

## Ranking score

```text
Vendor Score =
  distance score
+ stock confidence
+ trust score
+ acceptance speed
+ delivery SLA score
+ prescription compliance score
+ price competitiveness
- cancellation penalty
- dispute penalty
```

## Dispatch strategy

Do not send to all pharmacies at once forever. Use waves.

### Wave 1

Top 3 pharmacies for 30 seconds.

### Wave 2

Next 5 pharmacies for 45 seconds.

### Wave 3

Expand to 7–8 km if user agrees.

### Wave 4

Offer scheduled delivery.

This prevents chaos and reduces vendor notification fatigue.

---

# 13. Order State Machine

A strong order state machine is necessary.

```text
CREATED
PAYMENT_PENDING
PRESCRIPTION_UPLOADED
PRESCRIPTION_UNDER_REVIEW
PRESCRIPTION_REJECTED
VENDOR_MATCHING
VENDOR_OFFERED
VENDOR_ACCEPTED
PHARMACIST_APPROVED
PACKING
PACKED
RIDER_ASSIGNED
PICKED_UP
OUT_FOR_DELIVERY
DELIVERED
CANCELLED_BY_USER
CANCELLED_BY_VENDOR
CANCELLED_BY_ADMIN
FAILED_DELIVERY
REFUNDED
DISPUTED
```

## Vendor offer states

```text
OFFER_SENT
OFFER_VIEWED
OFFER_ACCEPTED
OFFER_REJECTED
OFFER_EXPIRED
OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE
```

## Payment states

```text
PAYMENT_INITIATED
PAYMENT_AUTHORIZED
PAYMENT_CAPTURED
PAYMENT_FAILED
REFUND_INITIATED
REFUND_PROCESSED
```

For prescription orders, consider **payment authorization first, capture after vendor acceptance**.

---

# 14. Cancellation Rules

## User cancellation

Allow free cancellation before vendor accepts.

After vendor accepts:

```text
If pharmacy has not packed: small/no cancellation fee
If packed: cancellation fee may apply
If rider picked up: delivery fee applies
```

## Vendor cancellation

Vendor cancellation after acceptance should be strict.

Possible valid reasons:

1. Prescription invalid.
2. Medicine damaged.
3. Customer requested illegal quantity.
4. System duplicate order.
5. Regulatory restriction.
6. Emergency shop closure.

Invalid reasons:

1. “Stock not available” after accepting.
2. “Too far” after accepting.
3. “Busy now” after accepting.
4. “Price changed” after accepting.

---

# 15. Delivery Model

You have three possible models.

## Model A: Pharmacy delivers

Pros:

* Easy to start.
* Pharmacy already has boys.
* Lower operational cost.

Cons:

* Poor tracking.
* SLA unreliable.
* Hard to standardize.

## Model B: Platform delivery fleet

Pros:

* Better experience.
* Real-time tracking.
* Strong SLA control.

Cons:

* Expensive.
* Operationally heavy.

## Model C: Hybrid

Recommended.

```text
Phase 1: Pharmacy delivery + optional platform delivery
Phase 2: Platform fleet for high-density areas
Phase 3: Dynamic allocation based on SLA and cost
```

## Delivery constraints for medicines

Some medicines may need:

1. Temperature control.
2. Fragile handling.
3. Proof of delivery.
4. Adult recipient check.
5. Prescription verification at delivery.
6. No-contact delivery restrictions depending on medicine.

---

# 16. Substitution System

Medicine substitution is risky.

Users may order a brand, but pharmacies may have a generic or equivalent brand.

## Safe substitution flow

1. Pharmacy suggests substitute.
2. System checks same salt, strength, form, and dosage.
3. Pharmacist confirms.
4. User approves.
5. For prescription medicines, substitution must respect prescription and applicable rules.
6. Invoice shows actual dispensed medicine.

## Example

User requested:

```text
Dolo 650
```

Pharmacy has:

```text
Paracip 650
```

System says:

```text
Same salt: Paracetamol
Same strength: 650mg
Same form: Tablet
Substitution possible: Yes, subject to pharmacist/user approval
```

Do not auto-substitute high-risk prescription medicines.

---

# 17. Admin Panel

Admin panel should be enterprise-grade.

## Admin modules

### 1. Dashboard

Metrics:

```text
orders today
GMV
delivered orders
cancelled orders
vendor cancellations
prescription rejection rate
average delivery time
top cities
top medicines
active pharmacies
active riders
complaints
refunds
penalties
```

### 2. Pharmacy management

Features:

```text
approve/reject pharmacy
view licenses
verify pharmacist
suspend pharmacy
edit service radius
view orders
view penalty history
view payout history
view SLA score
audit prescriptions
```

### 3. Medicine catalog management

Features:

```text
add/edit medicine
map brand to salt
set prescription requirement
mark restricted medicine
set substitution rules
set storage requirements
set search synonyms
import catalog CSV
```

### 4. Prescription review panel

Features:

```text
view prescription image
view OCR output
approve/reject extracted medicines
flag fake prescription
send to pharmacist
record reason
audit log
```

### 5. Order management

Features:

```text
search order
force assign vendor
cancel order
refund order
view timeline
view vendor responses
view delivery tracking
view invoice
view chat history
```

### 6. Penalty management

Features:

```text
auto penalty rules
manual penalty
vendor appeal review
waive penalty
repeat offender report
```

### 7. Customer support

Features:

```text
customer profile
order history
refund history
complaints
chat/call logs
medical safety escalation
```

### 8. Delivery management

Features:

```text
rider tracking
delivery SLA
failed delivery reasons
proof of delivery
COD reconciliation
```

### 9. Finance and settlement

Features:

```text
vendor commission
delivery fee
platform fee
GST
TDS/TCS if applicable
refunds
penalties
wallet ledger
payout cycles
invoices
```

### 10. Compliance audit

Features:

```text
prescription logs
pharmacist approval logs
restricted medicine attempts
Schedule H/H1/X monitoring
invoice records
license expiry alerts
data access logs
```

---

# 18. Customer App Features

## Core features

```text
login/signup
location selection
medicine search
prescription upload
cart
nearby pharmacy availability
order tracking
payment
refunds
support chat
medicine reminders
repeat order
family member profiles
prescription vault
```

## Advanced features

```text
ABHA integration later
doctor prescription upload history
monthly medicine subscription
chronic care refill reminders
generic medicine suggestions
price comparison
pharmacist chat
medicine interaction warning
expiry alert
```

## User safety features

```text
clear prescription-required label
restricted medicine warning
dosage warning
do not self-medicate warning
pharmacist verification badge
invoice download
```

---

# 19. Pharmacy App Features

## Dashboard

```text
new orders
accepted orders
packing queue
ready for pickup
completed orders
cancelled orders
penalties
earnings
inventory alerts
```

## Order request screen

```text
medicine list
prescription image
distance
delivery SLA
payment mode
stock confirmation
accept/reject
suggest substitute
```

## Inventory module

```text
add stock
bulk upload
low stock alert
expiry alert
fast-moving medicines
stock mismatch report
```

## Pharmacist approval module

```text
prescription queue
approve/reject
add remarks
flag suspicious prescription
```

## Payout module

```text
daily sales
commission
penalties
refund adjustments
settlement status
```

---

# 20. Rider App Features

```text
login
assigned pickup
pickup OTP
package checklist
navigation
delivery OTP
proof of delivery
cash collection
failed delivery reason
support call
```

For medicine delivery, proof of delivery should include:

```text
OTP
recipient name
optional signature
timestamp
geo-location
```

---

# 21. Backend Architecture

For scalability, use a modular service architecture first. Do not immediately overcomplicate with 50 microservices. Start with a **modular monolith or few well-separated services**, then split when scale demands.

## Recommended architecture

```text
API Gateway
Auth Service
User Service
Pharmacy Service
Medicine Catalog Service
Prescription Service
Order Service
Matching/Dispatch Service
Inventory Service
Payment Service
Delivery Service
Notification Service
Admin Service
Analytics Service
Audit/Compliance Service
```

## High-level backend flow

```text
Client App
   ↓
API Gateway
   ↓
Auth + Rate Limiting
   ↓
Order Service
   ↓
Prescription Service / Catalog Service
   ↓
Matching Service
   ↓
Vendor Notification
   ↓
Atomic Vendor Acceptance
   ↓
Payment Capture
   ↓
Packing + Delivery
   ↓
Settlement + Audit
```

---

# 22. Suggested Tech Stack

Since you are a full-stack developer, this stack is practical and scalable.

## Frontend web

```text
Next.js
TypeScript
Tailwind CSS
React Query / TanStack Query
Zustand or Redux Toolkit
Map SDK
Socket.io client / WebSocket client
```

## Mobile apps

Option 1:

```text
React Native
TypeScript
Expo for early stage, bare React Native later
```

Option 2:

```text
Flutter
```

For your background, React Native may be faster.

## Backend

```text
Node.js
NestJS
TypeScript
Fastify adapter
PostgreSQL
Redis
Kafka / Redpanda / RabbitMQ
Elasticsearch / OpenSearch
S3-compatible object storage
```

## Database

```text
PostgreSQL + PostGIS for geo queries
Redis for caching and locks
Elasticsearch/OpenSearch for medicine search
ClickHouse/BigQuery for analytics
```

## Infrastructure

```text
Docker
Kubernetes
Nginx / API Gateway
AWS / GCP / Azure / IBM Cloud
Terraform
GitHub Actions / GitLab CI
Prometheus
Grafana
ELK / OpenSearch logs
Sentry
```

## Why PostGIS?

You need fast queries like:

```text
Find approved pharmacies within 5 km of user location.
```

PostGIS handles this much better than raw latitude-longitude math.

---

# 23. Database Design

## users

```text
id
name
phone
email
password_hash
role
status
created_at
updated_at
```

## customer_profiles

```text
id
user_id
date_of_birth
gender
default_address_id
abha_id_optional
created_at
```

## addresses

```text
id
user_id
label
address_line
city
state
pincode
latitude
longitude
is_default
```

## pharmacies

```text
id
owner_user_id
name
license_number
license_valid_from
license_valid_to
gst_number
address
city
state
pincode
latitude
longitude
status
trust_score
service_radius_km
opening_time
closing_time
is_24x7
created_at
```

## pharmacists

```text
id
pharmacy_id
name
registration_number
certificate_url
status
verified_at
```

## medicines

```text
id
brand_name
generic_name
salt_composition
strength
form
manufacturer
pack_size
mrp
schedule_category
requires_prescription
is_restricted
cold_chain_required
substitution_group_id
created_at
```

## pharmacy_inventory

```text
id
pharmacy_id
medicine_id
quantity
batch_number
expiry_date
price
last_updated_at
stock_confidence_score
```

## prescriptions

```text
id
customer_id
image_url
ocr_text
verification_status
verified_by_pharmacist_id
rejection_reason
created_at
```

## orders

```text
id
customer_id
pharmacy_id
prescription_id
status
order_type
subtotal
delivery_fee
platform_fee
discount
total_amount
payment_status
delivery_address_id
created_at
accepted_at
delivered_at
cancelled_at
```

## order_items

```text
id
order_id
medicine_id
requested_name
quantity
unit_price
substitution_of_item_id
requires_prescription
status
```

## vendor_order_offers

```text
id
order_id
pharmacy_id
status
sent_at
viewed_at
responded_at
rejection_reason
```

## penalties

```text
id
pharmacy_id
order_id
penalty_type
amount
reason
status
appeal_status
created_at
```

## audit_logs

```text
id
actor_type
actor_id
action
entity_type
entity_id
metadata_json
ip_address
created_at
```

---

# 24. API Design

## Customer APIs

```http
POST /auth/login
POST /auth/otp/request
POST /auth/otp/verify

GET /medicines/search?q=dolo
GET /medicines/:id

POST /prescriptions/upload
GET /prescriptions/:id/status

POST /cart/items
GET /cart
POST /orders
GET /orders/:id
POST /orders/:id/cancel

GET /orders/:id/tracking
POST /support/tickets
```

## Pharmacy APIs

```http
GET /vendor/orders/offers
POST /vendor/orders/:orderId/accept
POST /vendor/orders/:orderId/reject
POST /vendor/orders/:orderId/suggest-substitute
POST /vendor/orders/:orderId/mark-packed

GET /vendor/inventory
POST /vendor/inventory
POST /vendor/inventory/bulk-upload

GET /vendor/penalties
POST /vendor/penalties/:id/appeal
```

## Admin APIs

```http
GET /admin/dashboard
GET /admin/pharmacies
POST /admin/pharmacies/:id/approve
POST /admin/pharmacies/:id/suspend

GET /admin/orders
GET /admin/prescriptions/review
POST /admin/penalties/:id/waive
GET /admin/audit-logs
```

---

# 25. Real-Time Communication

This product needs real-time systems.

## Use WebSocket for:

```text
vendor order offers
vendor acceptance countdown
customer order status
rider location
admin live dashboard
support chat
```

## Use push notifications for:

```text
new vendor order
order accepted
prescription rejected
substitution request
rider assigned
delivered
refund processed
penalty applied
```

## Use event streaming for:

```text
OrderCreated
PrescriptionUploaded
VendorOfferSent
VendorAccepted
VendorRejected
OrderPacked
RiderAssigned
OrderDelivered
VendorPenaltyApplied
```

Kafka/Redpanda/RabbitMQ can be used depending on scale.

---

# 26. Matching and Locking Logic

This is one of the most important backend parts.

## Acceptance race problem

Multiple pharmacies may click accept at the same time.

Solution:

Use database transaction:

```sql
UPDATE orders
SET pharmacy_id = :pharmacyId,
    status = 'VENDOR_ACCEPTED',
    accepted_at = NOW()
WHERE id = :orderId
  AND status = 'VENDOR_MATCHING';
```

If affected rows = 1, pharmacy won.

If affected rows = 0, order already assigned.

Then close all other offers:

```sql
UPDATE vendor_order_offers
SET status = 'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE'
WHERE order_id = :orderId
AND pharmacy_id != :pharmacyId;
```

## Redis lock alternative

```text
lock key: order_accept:{orderId}
TTL: 5 seconds
```

But still persist final state in PostgreSQL transaction.

---

# 27. Payment Design

## Payment options

```text
UPI
Cards
Net banking
Wallet
COD, optional and controlled
```

## Recommended payment flow

For prescription orders:

```text
Authorize payment → vendor accepts → pharmacist approves → capture payment
```

For OTC orders:

```text
Pay immediately → vendor accepts → if no vendor, auto refund
```

## COD risk

COD can cause:

```text
fake orders
delivery failure
rider cash handling
refund complexity
```

Recommendation:

* Disable COD for high-value first-time users.
* Enable COD only for low-risk orders.
* Use user risk scoring.

---

# 28. Pricing and Commission

## Revenue streams

1. Commission from pharmacy
2. Delivery fee
3. Platform convenience fee
4. Subscription for pharmacies
5. Sponsored listing for pharmacies, carefully regulated
6. B2B analytics, only anonymized and compliant
7. Chronic refill subscription
8. Private label health products, later

## Commission model

```text
OTC products: 8–15%
Prescription medicines: lower commission, 3–8%
Delivery fee: user/platform/vendor split
Penalty revenue: not primary revenue, only discipline tool
```

Do not make penalty revenue a business model. It creates vendor hostility.

---

# 29. Privacy and Security

You will handle prescriptions, addresses, phone numbers, medicine history, and possibly health identifiers.

## Required security controls

```text
encryption at rest
encryption in transit
role-based access control
field-level access control
audit logs
masked prescription access
limited data retention
secure file storage
signed URLs
admin action logging
pharmacist access logging
data deletion request workflow
breach response process
```

## Sensitive data handling

Prescription images should not be visible to everyone.

Access should be limited to:

```text
assigned pharmacy
assigned pharmacist
authorized admin
support staff with reason
compliance auditor
```

Every access should be logged.

## Data minimization

Do not store unnecessary health data forever.

Example retention model:

```text
Prescription image: retain as legally required, then archive/delete
Order invoice: retain as required for tax/compliance
Search history: allow user deletion
Medicine reminder: user-controlled
```

---

# 30. Fraud and Abuse Prevention

## Customer fraud

Detect:

```text
fake prescriptions
multiple accounts
high-risk medicine repeats
refund abuse
COD abuse
same prescription across accounts
unusual controlled medicine search
```

## Vendor fraud

Detect:

```text
accepting without stock
charging extra offline
fake invoice
wrong medicine
substitution abuse
cancelling after acceptance
marking packed falsely
```

## Rider fraud

Detect:

```text
fake delivery attempt
cash mismatch
GPS spoofing
package tampering
delayed pickup
```

## Platform-level abuse

Detect:

```text
bot searches
medicine scraping
prescription image harvesting
admin misuse
data export abuse
```

---

# 31. Medicine Safety Features

You can differentiate from normal commerce apps by being safer.

## Safety layer

Add warnings for:

```text
duplicate salt in cart
possible overdose
same medicine under two brands
restricted medicine
requires prescription
cold-chain item
expired prescription
```

Example:

```text
You added Dolo 650 and Paracip 650. Both contain Paracetamol 650mg. Please verify before ordering.
```

## Do not provide medical diagnosis

The app should not say:

```text
Take this medicine for your fever.
```

It can say:

```text
This product requires appropriate medical advice. Please follow your doctor’s prescription.
```

---

# 32. Operational City Launch Plan

Do not launch pan-India immediately.

## Phase 1: One city, controlled launch

Example: Guwahati or one dense zone.

Target:

```text
30–50 verified pharmacies
5–10 delivery partners
3–5 admin/support staff
limited medicine catalog
limited service radius
```

## Phase 2: City expansion

```text
100–300 pharmacies
multiple zones
platform delivery fleet
inventory digitization
pharmacist review queue
```

## Phase 3: Multi-city

```text
city operations teams
regional compliance officers
automated license expiry tracking
central catalog
vendor scoring
fraud ML
```

---

# 33. Team Structure

## Initial serious team

```text
1 product manager
1 healthcare compliance consultant
1 legal advisor
1 backend lead
2 backend developers
2 frontend/mobile developers
1 DevOps engineer
1 QA engineer
1 UI/UX designer
1 operations manager
2 pharmacy onboarding executives
2 customer support executives
```

## Later scale team

```text
catalog team
pharmacist audit team
city operations team
risk/fraud team
data analytics team
security engineer
finance settlement team
```

---

# 34. Development Roadmap

## Phase 0: Legal and operational validation

Duration: do before coding seriously.

Deliverables:

```text
legal opinion
medicine category policy
vendor agreement
penalty policy
privacy policy
prescription handling policy
pharmacy onboarding checklist
restricted medicine list
```

## Phase 1: Foundation platform

Build:

```text
customer app
pharmacy app
admin panel
auth
medicine catalog
prescription upload
order creation
vendor broadcast
vendor accept/reject
basic payment
basic delivery status
```

## Phase 2: Compliance and reliability

Build:

```text
pharmacist approval flow
audit logs
penalty engine
invoice system
vendor trust score
prescription fraud checks
license expiry alerts
refund workflow
```

## Phase 3: Speed and scale

Build:

```text
real-time matching
delivery partner app
route tracking
inventory upload
OpenSearch medicine search
analytics dashboard
SLA monitoring
city-zone management
```

## Phase 4: Intelligence

Build:

```text
OCR medicine extraction
generic substitution engine
stock prediction
vendor ranking ML
fraud detection
demand forecasting
medicine recommendation safety layer
```

## Phase 5: Enterprise scale

Build:

```text
multi-city architecture
Kubernetes scaling
event streaming
data warehouse
ABDM integration exploration
advanced compliance reports
automated reconciliation
```

---

# 35. Real Problems and Fixes

## Problem 1: Pharmacy accepts but stock is unavailable

Fix:

```text
acceptance confirmation checklist
penalty system
trust score reduction
inventory confidence score
repeat offender suspension
```

## Problem 2: Prescription image is unclear

Fix:

```text
OCR confidence score
manual pharmacist review
ask user for clearer upload
reject with reason
```

## Problem 3: User orders restricted medicine

Fix:

```text
medicine policy engine
block restricted products
manual review for edge cases
admin alert
```

## Problem 4: Multiple shops accept same order

Fix:

```text
atomic database update
Redis lock
vendor offer state closure
real-time order removal
```

## Problem 5: Fake prescriptions

Fix:

```text
image tamper detection
doctor registry validation where possible
reuse detection
high-risk medicine review
manual pharmacist approval
```

## Problem 6: Delivery delay

Fix:

```text
packing SLA
rider assignment SLA
vendor delay penalty
customer live tracking
auto reassignment before acceptance
```

## Problem 7: Wrong medicine delivered

Fix:

```text
barcode scan during packing
pharmacist approval
item photo before pickup
customer complaint workflow
strict vendor penalty
```

## Problem 8: Medicine substitution dispute

Fix:

```text
user approval required
same salt/strength/form validation
pharmacist note
invoice actual medicine
```

## Problem 9: Vendor sells without prescription

Fix:

```text
system-level prescription requirement
pharmacist approval lock
audit log
admin compliance dashboard
vendor suspension
```

## Problem 10: User privacy breach

Fix:

```text
role-based access
masked prescription data
signed URLs
access logs
limited retention
DPDP-compliant consent and deletion workflows
```

---

# 36. Performance Requirements

## Backend targets

```text
medicine search response: < 300 ms
order creation: < 500 ms
vendor broadcast: < 1 second
vendor accept lock: < 200 ms
order status push: real-time
99.9% uptime initially
99.95% later
```

## Infrastructure scaling

Use:

```text
horizontal autoscaling
read replicas
Redis caching
CDN for static assets
object storage for prescriptions
queue-based async jobs
database indexing
geo indexes with PostGIS
```

---

# 37. Observability

Track everything.

## Logs

```text
API logs
order state logs
vendor offer logs
payment logs
prescription access logs
admin action logs
delivery logs
```

## Metrics

```text
order acceptance time
vendor cancellation rate
prescription rejection rate
delivery SLA
payment failure rate
search zero-result rate
inventory mismatch rate
refund rate
```

## Alerts

```text
payment failure spike
vendor cancellation spike
prescription queue backlog
delivery delay spike
API latency spike
restricted medicine attempt spike
license expiry
```

---

# 38. Analytics Dashboard

## Business analytics

```text
GMV
net revenue
average order value
repeat purchase rate
top medicines
top localities
customer acquisition cost
vendor performance
delivery cost per order
```

## Operations analytics

```text
acceptance rate
order fulfillment rate
average delivery time
packing time
rider pickup time
vendor cancellation rate
customer complaint rate
```

## Compliance analytics

```text
prescription medicine orders
rejected prescriptions
restricted medicine searches
pharmacist approval time
vendor compliance score
license expiry count
```

---

# 39. Architecture Diagram

```text
Customer App / Web
        |
        v
API Gateway / Load Balancer
        |
        v
Auth + Rate Limit + Device Trust
        |
        +-------------------+
        |                   |
        v                   v
Medicine Search        Order Service
        |                   |
        v                   v
OpenSearch             Prescription Service
PostgreSQL             OCR + Pharmacist Review
        |                   |
        +---------+---------+
                  |
                  v
          Matching Service
                  |
          PostGIS + Redis Lock
                  |
                  v
        Pharmacy Notification
                  |
                  v
       Vendor App / Pharmacist App
                  |
                  v
          Accepted Pharmacy
                  |
                  v
        Payment + Invoice + Packing
                  |
                  v
          Delivery Service
                  |
                  v
        Customer Tracking + Admin Audit
```

---

# 40. Recommended Monorepo Structure

```text
medicine-platform/
  apps/
    customer-web/
    customer-mobile/
    vendor-mobile/
    rider-mobile/
    admin-web/
  services/
    api-gateway/
    auth-service/
    order-service/
    catalog-service/
    prescription-service/
    matching-service/
    payment-service/
    notification-service/
    delivery-service/
    admin-service/
  packages/
    shared-types/
    ui/
    validation/
    config/
    logger/
  infra/
    docker/
    kubernetes/
    terraform/
  docs/
    api/
    compliance/
    architecture/
```
