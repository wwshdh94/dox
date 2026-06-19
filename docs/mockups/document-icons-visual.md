# Dox — Document icon mockups (illustrative)

**Status:** Visual review — not in app UI yet.

**Style:** Flat illustrated tiles on warm linen (`#F5F1EA`). Each icon depicts the **actual document or object** (passport booklet, PAN card, car, laptop), not generic symbols.

**Open in Finder:**
```bash
open /Users/shdh94/projects/Dox/docs/mockups/icons/
```

---

## Mockup sheets

| Sheet | File | Contents |
|-------|------|----------|
| Identity & KYC | `icons/identity-sheet.png` | Passport, PAN, Aadhaar, Voter ID, Driving licence, ID card |
| Vehicle | `icons/vehicle-sheet.png` | Car, RC, PUC, motor insurance, key, emission cert |
| Health | `icons/health-sheet.png` | Health policy card, lab report, Rx, vaccination, discharge, bill |
| Assets & other | `icons/assets-sheet.png` | Laptop, receipt, warranty, property, life insurance, degree |

---

## Type → illustration mapping (proposed)

### Identity (`family` tab)

| `docType` | Illustration | Notes |
|-----------|--------------|-------|
| `passport` | Burgundy booklet + emblem | Indian passport maroon cover |
| `pan` | Yellow-gold laminated card | Horizontal lines, PAN label |
| `aadhaar` | Blue/white ID + chip | UIDAI-style silhouette only |
| `voter_id` *(future)* | White card + tricolor band | |
| `driving_licence` *(future)* | Pink/peach laminated card | |

### Vehicle (`assets` tab)

| `docType` | Illustration | Notes |
|-----------|--------------|-------|
| `vehicle_rc` | RC certificate document **or** small red car | Car = quick scan; RC = document row |
| `vehicle_puc` | Green-bordered PUC certificate | |
| `vehicle_insurance` | Policy doc + car + shield | |

### Health (`health` tab)

| `docType` | Illustration | Notes |
|-----------|--------------|-------|
| `health_insurance` | Policy card (cross / insurer style) | |
| `lab_report` | Clipboard + graph + flask | |
| `prescription` | Rx pad | |
| `vaccination` | Vaccination card + syringe sticker | |
| `medical_bill` | Hospital receipt | |
| `discharge_summary` | Folded papers + clip | |

### Purchases & assets

| `docType` / asset | Illustration | Notes |
|-------------------|--------------|-------|
| `purchase_receipt` | Torn receipt + ₹ | |
| `warranty` | Card + gold seal | |
| Laptop / MacBook asset | Open silver laptop | |
| Property *(future)* | House + deed | |
| `insurance` (life) | Policy + shield | |
| `other` / note | Sticky note | |

---

## UI placement (target)

```
┌──────────────────────────────────────┐
│ [passport    ]  Passport      12 Aug │  ← 40×40 illustrated tile
│                 Family · Identity    │
└──────────────────────────────────────┘
```

Tiles: **40×40** in lists, **56×56** on document detail. Rounded-xl, `bg-accent-soft`, no text inside tile (label stays in title).

---

## Decisions needed

| # | Question | Options |
|---|----------|---------|
| 1 | RC icon | Car silhouette **vs** RC certificate document |
| 2 | Tile style | Illustrated PNG/SVG **vs** simplified single-color SVG for dark mode |
| 3 | Aadhaar in UI | Full card illustration **vs** abstract chip card (UIDAI caution) |
| 4 | Set scope | Ship 16 types now **vs** identity + vehicle + health first |

---

## Next step (after approval)

1. Export each tile as SVG (or optimized PNG @2x) into `public/icons/docs/`
2. Add `src/lib/docIcons.ts` + `<DocTypeIcon type="passport" size="md" />`
3. Wire into Family, Health, Assets lists + document detail

---

*Previous emoji/Lucide draft: `document-icons.md` — superseded by this illustrative set.*
