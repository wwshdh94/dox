# PreVault — Document & category icon mockup

**Status:** Draft for review — not wired into UI yet.

**Goal:** One recognizable icon per **document type** in lists/cards/detail. **Category** and **domain** icons used as chips, filters, and fallbacks when type is `other`.

**Style direction:** Simple line icons (Lucide-style) in UI; emoji shown here for quick visual review in mockups.

---

## 1. Domain icons (tab scope)

Where the document lives — shown on chips, filters, empty states.

| Domain | Label | Mock | Proposed icon (SVG) | Notes |
|--------|-------|------|---------------------|-------|
| `family` | Family | 👨‍👩‍👧 | `users` | Household / members |
| `health` | Health | 🩺 | `heart-pulse` | Medical vault |
| `assets` | Assets | 🏠 | `layers` or `package` | Vehicles, property, purchases |

**Pick one for Assets:** `layers` (bundles) vs `package` (physical goods) — recommend **`layers`** for RC + property + invoice bundles.

---

## 2. Category icons (subject matter)

Second tag on every document; fallback icon when `docType === 'other'`.

| Category | Label | Mock | Proposed icon (SVG) | Notes |
|----------|-------|------|---------------------|-------|
| `identity` | Identity & KYC | 🪪 | `id-card` | Aadhaar, PAN, passport |
| `health_medical` | Health & Medical | 🏥 | `stethoscope` | All health tab records |
| `vehicle` | Vehicle & Transport | 🚗 | `car` | RC, PUC, motor insurance |
| `property` | Property & Home | 🏡 | `home` | Sale deed, rental, society |
| `financial` | Financial & Insurance | 💳 | `landmark` or `shield-check` | Life/term, investments |
| `education` | Education & Career | 🎓 | `graduation-cap` | Degrees, marksheets |
| `purchase` | Purchases & Warranty | 🧾 | `receipt` | Invoices, AMC, warranty |
| `legal` | Legal & Compliance | ⚖️ | `scale` | Agreements, court, POA |
| `other` | Other | 📎 | `file` | Notes, misc |

**Pick one for Financial:** `landmark` (bank) vs `shield-check` (insurance) — recommend **`shield-check`** (insurance-heavy in India household vault).

---

## 3. Document type icons (specific)

Overrides category icon in document rows and detail header.

### Identity (Family)

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `passport` | Passport | 🛂 | `book-open` or `globe` |
| `pan` | PAN | 🆔 | `credit-card` (India PAN card shape) |
| `aadhaar` | Aadhaar | 🔢 | `fingerprint` |

**Passport:** prefer **`globe`** (travel); PAN **`id-card`** if distinct from generic identity.

### Vehicle (Assets)

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `vehicle_rc` | RC | 🚗 | `car` |
| `vehicle_puc` | PUC | 💨 | `wind` or `leaf` |
| `vehicle_insurance` | Vehicle insurance | 🛡️ | `shield` |

**PUC:** `wind` = emissions; alternative **`badge-check`** (certificate).

### Financial & insurance

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `insurance` | Life / term policy | 📋 | `shield-check` |

### Health (Health tab)

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `health_insurance` | Health policy | 🏥 | `heart-handshake` or `shield-plus` |
| `lab_report` | Lab report | 🔬 | `flask-conical` |
| `prescription` | Prescription | 💊 | `pill` |
| `vaccination` | Vaccination | 💉 | `syringe` |
| `medical_bill` | Medical bill | 🧾 | `receipt` |
| `discharge_summary` | Discharge summary | 📄 | `clipboard-list` |

### Purchases (Assets)

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `purchase_receipt` | Invoice / receipt | 🧾 | `receipt` |
| `warranty` | Warranty card | ✅ | `badge-check` |

### Catch-all

| Doc type | Title (example) | Mock | Proposed icon (SVG) |
|----------|-----------------|------|---------------------|
| `other` | Note / misc | 📝 | `file-text` |

---

## 4. Future types (not in code yet — reserve icons)

| Planned type | Mock | Proposed icon |
|--------------|------|---------------|
| Voter ID | 🗳️ | `vote` |
| Driving licence | 🪪 | `id-card` |
| Rental agreement | 📜 | `file-signature` |
| Property deed | 🏡 | `home` |
| Degree / marksheet | 🎓 | `graduation-cap` |
| Work ID | 💼 | `briefcase` |
| Subscription (asset) | 🔄 | `repeat` |

---

## 5. UI placement mockup (text)

```
┌─────────────────────────────────────────┐
│  [🛂]  Passport                    12 Aug │  ← type icon + title + expiry
│        Family · Identity & KYC          │  ← domain + category chips (smaller)
└─────────────────────────────────────────┘

Family tab — Me view:
  [🛂] Passport
  [🆔] PAN
  [📝] Note          ← other → file-text

Health tab — member:
  [🏥] Star Health Insurance
  [🔬] CBC Lab Report

Assets — vehicle bundle:
  [🚗] RC
  [💨] PUC
  [🛡️] Vehicle Insurance
```

---

## 6. Resolution rules (for implementation later)

1. **List/card/detail header** → `DOC_TYPE_ICONS[docType]` if defined, else `CATEGORY_ICONS[category]`.
2. **Tag chips** → domain chip uses `DOMAIN_ICONS`; category chip uses `CATEGORY_ICONS`.
3. **Notes** (`docType: other`, `fields.type: note`) → always `file-text` / 📝.
4. **Same icon OK** when meaning is clear (e.g. `receipt` for purchase_receipt and medical_bill) — differentiate by **color chip** or **category label**, not duplicate icons.

---

## 7. Open decisions — please mark picks

| # | Choice | Option A | Option B |
|---|--------|----------|----------|
| 1 | Assets domain | `layers` | `package` |
| 2 | Financial category | `shield-check` | `landmark` |
| 3 | Passport | `globe` | `book-open` |
| 4 | PUC | `wind` | `badge-check` |
| 5 | Health insurance | `heart-handshake` | `shield-plus` |
| 6 | Icon set | Lucide React (recommended) | Emoji in UI (faster, less polished) |

---

## 8. Full quick-reference matrix

| Key | Mock | SVG (proposed) |
|-----|------|----------------|
| **Domains** | | |
| `family` | 👨‍👩‍👧 | `users` |
| `health` | 🩺 | `heart-pulse` |
| `assets` | 📦 | `layers` |
| **Categories** | | |
| `identity` | 🪪 | `id-card` |
| `health_medical` | 🏥 | `stethoscope` |
| `vehicle` | 🚗 | `car` |
| `property` | 🏡 | `home` |
| `financial` | 🛡️ | `shield-check` |
| `education` | 🎓 | `graduation-cap` |
| `purchase` | 🧾 | `receipt` |
| `legal` | ⚖️ | `scale` |
| `other` | 📎 | `file` |
| **Doc types** | | |
| `passport` | 🛂 | `globe` |
| `pan` | 🆔 | `id-card` |
| `aadhaar` | 🔢 | `fingerprint` |
| `vehicle_rc` | 🚗 | `car` |
| `vehicle_puc` | 💨 | `wind` |
| `vehicle_insurance` | 🛡️ | `shield` |
| `insurance` | 📋 | `shield-check` |
| `health_insurance` | ❤️‍🩹 | `heart-handshake` |
| `lab_report` | 🔬 | `flask-conical` |
| `prescription` | 💊 | `pill` |
| `vaccination` | 💉 | `syringe` |
| `medical_bill` | 🧾 | `receipt` |
| `discharge_summary` | 📄 | `clipboard-list` |
| `purchase_receipt` | 🧾 | `receipt` |
| `warranty` | ✅ | `badge-check` |
| `other` | 📝 | `file-text` |

---

*After you confirm choices in §7 (or reply with edits), next step: add `src/lib/docIcons.ts` + `DocIcon` component and show icons on Family/Health/Assets document lists.*
