# Naya Setu — Testing & Demo Guide

Covers **two separate WordPress plugins** that share one WordPress site, one
`wp_users` table, and one wallet ledger:

| Plugin | Shortcode | Purpose |
|---|---|---|
| **Naya Setu Services** (`naya-setu-services`) | `[nayasetu_services]` | Identity/Business/Banking/Transport/Legal/Schemes/Digital services dashboard |
| **Naya Setu Courier** (`naya-setu-courier`) | `[nayasetu_courier]` | Courier booking dashboard |

They are **not merged** — this is a deliberate two-plugin architecture. Each
has its own front-end app (own shortcode page, own sidebar, own REST
namespace), but they recognize the same logged-in WordPress user and the same
custom roles, so one account works in both.

---

## 1. Environment

Local test site used for this pass: `http://localhost/nayasetu-services-test/`
(XAMPP, DB `nayasetu_services_test`). Substitute your own site URL below.

Two pages must exist and be published:

| Page | Shortcode | Purpose |
|---|---|---|
| *Services* | `[nayasetu_services]` | Loads the Services dashboard |
| *Courier* | `[nayasetu_courier]` | Loads the Courier dashboard |

Both plugins auto-detect the other's page URL by searching for a published
page carrying the other plugin's shortcode (`courier_portal_url` /
`services_portal_url` settings) — no manual configuration needed unless you
want to point at a different page, in which case set it under each
dashboard's own **Settings → General** tab.

> If your Services page happens to also be configured as the site's static
> front page (Settings → Reading → "Your homepage displays"), its "portal
> URL" will correctly resolve to just the site root (`/`) rather than
> `/services/` — that's expected WordPress behavior for a front page, not a
> bug.

---

## 2. What was fixed in this pass

1. **Cross-dashboard admin login/redirect.** Previously there was no way to
   jump from one dashboard to the other except by using a Courier-category
   service card (e.g. "New Shipment"), which only worked one-directionally
   for customers. Both dashboards' top bars now have a **switch button**:
   - Services topbar → **"Naya Setu Courier"** button
   - Courier topbar → **"Naya Setu Services"** button

   Since both dashboards share one WordPress login session, clicking either
   button lands you already logged in on the other side — no re-login, no
   "login as" trick needed.

2. **Role-capability wipe bug (the real reason roles could stop working).**
   `naya-setu-courier`'s installer used to `remove_role()` +`add_role()` on
   every activation/version-bump, which **deleted any capabilities
   naya-setu-services had already granted** to the shared `nsc_customer` /
   `nsc_associate` / `nsc_operator` roles. In practice: if Courier was
   reactivated or upgraded *after* Services, every Customer/Associate/
   Employee account would silently lose the ability to book services, see
   "All Applications", etc. — until Services happened to reactivate too.
   Both installers are now purely additive (never delete an existing
   capability), so this can no longer happen regardless of which plugin
   activates or upgrades first or last.

3. **Auto-upgrade timing.** Each plugin's "upgrade tables/roles/settings if
   version changed" check used to run directly inside `plugins_loaded`, which
   is *before* WordPress registers the `page` post type — any `get_posts()`
   lookup at that point (e.g. auto-detecting the other plugin's portal page)
   would silently find nothing. That check is now deferred to `init`
   (priority 20), after post types are registered.

None of this required (or performed) any merge of the two plugins, any
deletion of existing data, or any change to the wallet/application/document
database tables.

### The wallet is one shared ledger, not two

Both plugins read/write the **same** `wp_nsc_wallet_transactions` table and
the same `nsc_wallet_balance` user-meta cache. When both plugins are active,
Services' wallet class (`NSS_Wallet`) doesn't keep its own copy of anything —
it delegates every balance check / credit / debit straight to Courier's
`NSC_Wallet`, which is the one piece of code that actually touches the table.
Confirmed directly against the test site: a top-up made through the Services
**My Wallet** page card is visible immediately in Courier's wallet, and a
spend made in Courier is reflected immediately in Services — same balance,
same combined transaction history in both places.

**Demo test:** Add money to the wallet from the Services dashboard (**My
Wallet → Add Money**). Switch to Courier (topbar button) and confirm the
same new balance shows on Courier's wallet page/pill immediately — no
separate top-up needed there.

---

## 3. The 4 roles

| Role | WP role slug | Created via |
|---|---|---|
| **Admin** | `administrator` | Already exists (your WordPress admin login) |
| **Associate** | `nsc_associate` | Self-signup ("Associate" on Sign Up tab) — **requires admin approval** before first login |
| **Employee / Operator** | `nsc_operator` | **Not self-serve** — created manually in `wp-admin → Users → Add New`, role "Naya Setu Employee" |
| **User / Customer** | `nsc_customer` | Self-signup ("User" on Sign Up tab) |

### Creating test accounts

- **Admin**: use your existing WordPress administrator login.
- **Customer**: go to the Services or Courier page → Sign Up tab → User Type
  "User" → fill form → Skip phone verification (if Firebase/OTP isn't
  configured) → account is active immediately.
- **Associate**: same Sign Up flow, User Type "Associate", choose an
  Associate Code. Account is **pending** until an Admin approves it under
  **Admin → Associates** in either dashboard (both dashboards' Associates
  screens approve the same `nsc_associate` accounts — approving in one is
  enough).
- **Employee**: log into `wp-admin` as Admin → Users → Add New → set Role to
  **"Naya Setu Employee"**. This account can then log in from either
  dashboard's Login tab, User Type "Employee".

---

## 4. Per-role checklist — Naya Setu Services dashboard

Sidebar items below only appear if that role has the matching capability —
this is the expected/by-design gating, not something to "fix":

| Sidebar section | Admin | Employee | Associate | Customer |
|---|:---:|:---:|:---:|:---:|
| Dashboard, Browse Categories | ✅ | ✅ | ✅ | ✅ |
| My Applications / Documents / Profile / Wallet / Notifications / Payment History | ✅ | ✅ | ✅ | ✅ |
| **Admin →** All Applications | ✅ | ✅ | ❌ | ❌ |
| **Admin →** Document Verification | ✅ | ❌ | ❌ | ❌ |
| **Admin →** Service Config | ✅ | ❌ | ❌ | ❌ |
| **Admin →** Payments, Reports | ✅ | ❌ | ❌ | ❌ |
| **Admin →** API Logs, Associates, Settings | ✅ | ❌ | ❌ | ❌ |
| Topbar "Naya Setu Courier" switch button | ✅ | ✅ | ✅ | ✅ |

**By design, not a bug:** Employee only gets "All Applications" (can view and
progress every user's applications) — document verification, service config,
reports and settings stay Admin-only, matching the same tier split already
used in the Courier dashboard (Employee there gets "view all shipments" but
not Reports/Coupons/Settings either). Associate and Customer are functionally
identical inside Services today — Associate-specific features (referral
tracking, commission) live only in the Courier dashboard.

### Walkthrough

1. **Log in as Customer.** Confirm: no "Admin" group in the sidebar. Browse a
   category → open a service → fill the form → upload/reuse a document →
   submit (or pay if the service requires it). Confirm it now shows under
   *My Applications*.
2. **Log in as Associate.** Same experience as Customer inside Services
   (expected). Sign-up should have required approval first — confirm you
   could *not* log in until an Admin approved the account.
3. **Log in as Employee.** Confirm the sidebar shows **only** "All
   Applications" under Admin (no Document Verification / Service Config /
   Reports / Settings). Open an application submitted by the Customer above,
   change its status, add a note. Confirm the Customer sees the updated
   status/timeline on their own *My Applications* page.
4. **Log in as Admin.** Confirm every Admin sidebar item is visible. Check:
   - **Service Config** — edit a service's fee/required documents, save,
     confirm the change reflects for a Customer starting that service.
   - **Document Verification** — verify/reject a pending document.
   - **Reports** — total/monthly counts must **exclude drafts** (start a new
     application, save as draft without submitting, and confirm the Reports
     numbers don't change until it's actually submitted).
   - **Wallet** — add money via the wallet page's "Add Money" flow (Razorpay
     test mode), confirm the balance updates and a transaction row appears;
     pay for a service from wallet balance and confirm it debits correctly.
   - **Settings → General** — confirm "Courier Portal URL" is populated.
   - Click the topbar **"Naya Setu Courier"** button — confirm you land on
     the Courier dashboard already logged in, with the full Admin sidebar
     there too.

---

## 5. Per-role checklist — Naya Setu Courier dashboard

| Sidebar section | Admin | Employee | Associate | Customer |
|---|:---:|:---:|:---:|:---:|
| Dashboard, New Booking, Reverse Pickup, Bulk Booking, Track Shipment | ✅ | ✅ | ✅ | ✅ |
| Saved Addresses / Receivers, Rate Calculator, Pickup/Shipment History, Wallet | ✅ | ✅ | ✅ | ✅ |
| **Associate →** My Referrals | ✅ | ❌ | ✅ | ❌ |
| **Admin →** Reports | ✅ | ❌ | ❌ | ❌ |
| **Admin →** Associates, Employees, All Users, Bulk Batches, Wallet Ledger, Coupons, Settings | ✅ | ❌ | ❌ | ❌ |
| Topbar "Naya Setu Services" switch button | ✅ | ✅ | ✅ | ✅ |

### Walkthrough

1. **Log in as Associate.** Confirm the "My Referrals" section is visible
   (Customer/Employee should not see it). Share your referral code, sign up
   a new Customer with it, confirm the referral is tracked.
2. **Log in as Admin.** Approve/reject a pending Associate under **Admin →
   Associates**. Click the topbar **"Naya Setu Services"** button — confirm
   you land on the Services dashboard already logged in.

---

## 6. Regression check — role-wipe bug

This confirms fix #2 above actually holds:

1. Note a Customer account's current abilities (can book a service, sees no
   Admin items).
2. In `wp-admin → Plugins`, deactivate then reactivate **Naya Setu Courier
   Booking**.
3. Log back in as that same Customer in the **Services** dashboard. They must
   still be able to book a service (i.e. still has `nss_book_service`, etc.)
   — if this capability silently disappeared, the old bug has regressed.
4. Repeat in the other direction: deactivate/reactivate **Naya Setu
   Services**, then confirm the Employee account still sees "All Shipments"
   capability-gated features in Courier.

---

## 7. Known limitations / not in scope this pass

- The two plugins are **not merged into one** — this was explicitly
  descoped in favor of the fixes above. Each keeps its own database tables,
  settings option, and REST namespace.
- Employee accounts have no self-signup path by design — only an
  existing Admin can create one, from `wp-admin → Users`.
- Associate and Customer roles currently have identical capabilities inside
  the **Services** dashboard specifically (see table in §4).
