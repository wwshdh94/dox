#!/usr/bin/env python3
"""Generate lightweight flat PNG icons for PreVault document types and title keywords."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "icons" / "docs"
SIZE = 128
PAD = 14


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    img.save(path, optimize=True, compress_level=9)
    print(f"{name}: {path.stat().st_size // 1024}KB")


def rounded_rect(d: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width=2):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text_center(d: ImageDraw.ImageDraw, xy, text: str, fill, size: int = 14, bold: bool = False):
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf", size)
    except OSError:
        font = ImageFont.load_default()
    x0, y0, x1, y1 = xy
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x0 + (x1 - x0 - tw) / 2
    ty = y0 + (y1 - y0 - th) / 2 - 1
    d.text((tx, ty), text, fill=fill, font=font)


def doc_sheet(d, x, y, w, h, fill="#F8FAFC", outline="#64748B", accent=None):
    rounded_rect(d, (x, y, x + w, y + h), 8, fill, outline, 2)
    if accent:
        d.rectangle((x + 8, y + 10, x + w - 8, y + 16), fill=accent)


def ashoka_emblem(d, cx, cy, r, color="#D4AF37"):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=2)
    for i in range(8):
        ang = math.radians(i * 45 - 90)
        x1 = cx + math.cos(ang) * (r * 0.35)
        y1 = cy + math.sin(ang) * (r * 0.35)
        x2 = cx + math.cos(ang) * (r * 0.9)
        y2 = cy + math.sin(ang) * (r * 0.9)
        d.line((x1, y1, x2, y2), fill=color, width=2)
    d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=color)


def icon_passport():
    img, d = canvas()
    rounded_rect(d, (28, 18, 100, 110), 10, "#6B1D1D", "#4A1515", 2)
    ashoka_emblem(d, 64, 52, 18)
    text_center(d, (28, 72, 100, 88), "INDIA", "#D4AF37", 11, True)
    text_center(d, (28, 88, 100, 104), "PASSPORT", "#D4AF37", 9, True)
    save(img, "passport")


def icon_pan():
    img, d = canvas()
    rounded_rect(d, (22, 34, 106, 94), 10, "#1E3A8A", "#172554", 2)
    text_center(d, (22, 40, 106, 56), "INCOME TAX", "#BFDBFE", 9, True)
    text_center(d, (22, 56, 106, 78), "PAN", "#FFFFFF", 22, True)
    text_center(d, (22, 78, 106, 92), "GOVT OF INDIA", "#BFDBFE", 8)
    save(img, "pan")


def icon_aadhaar():
    img, d = canvas()
    rounded_rect(d, (22, 28, 106, 100), 10, "#FFFFFF", "#CBD5E1", 2)
    d.rectangle((22, 28, 106, 38), fill="#FF9933")
    d.rectangle((22, 38, 106, 43), fill="#FFFFFF")
    d.rectangle((22, 43, 106, 48), fill="#138808")
    text_center(d, (22, 50, 106, 66), "AADHAAR", "#1E293B", 11, True)
    d.ellipse((48, 68, 80, 96), outline="#64748B", width=2)
    for i in range(6):
        ang = math.radians(i * 30)
        d.arc((48, 68, 80, 96), start=i * 30, end=i * 30 + 40, fill="#94A3B8", width=1)
    save(img, "aadhaar")


def icon_vehicle_rc():
    img, d = canvas()
    rounded_rect(d, (20, 30, 108, 98), 10, "#14532D", "#0F3D21", 2)
    text_center(d, (20, 36, 108, 52), "REGISTRATION", "#BBF7D0", 8, True)
    text_center(d, (20, 50, 108, 68), "RC", "#FFFFFF", 20, True)
    rounded_rect(d, (38, 72, 90, 92), 6, "#DCFCE7", "#86EFAC", 1)
    d.ellipse((44, 84, 56, 92), fill="#14532D")
    d.ellipse((72, 84, 84, 92), fill="#14532D")
    d.rectangle((52, 76, 76, 84), fill="#86EFAC", outline="#14532D", width=1)
    save(img, "vehicle_rc")


def icon_vehicle_puc():
    img, d = canvas()
    doc_sheet(d, 24, 22, 80, 84, "#FFFFFF", "#64748B", "#22C55E")
    text_center(d, (24, 30, 104, 48), "PUC", "#166534", 18, True)
    text_center(d, (24, 48, 104, 62), "POLLUTION", "#64748B", 8, True)
    d.line((36, 72, 92, 72), fill="#CBD5E1", width=2)
    d.line((36, 82, 76, 82), fill="#CBD5E1", width=2)
    d.ellipse((78, 68, 94, 84), outline="#22C55E", width=2)
    d.line((82, 76, 86, 80), fill="#22C55E", width=2)
    d.line((86, 76, 82, 80), fill="#22C55E", width=2)
    save(img, "vehicle_puc")


def icon_vehicle_insurance():
    img, d = canvas()
    pts = [(64, 20), (98, 38), (88, 88), (40, 88), (30, 38)]
    d.polygon(pts, fill="#DBEAFE", outline="#2563EB", width=2)
    rounded_rect(d, (42, 58, 86, 78), 5, "#2563EB", "#1D4ED8", 1)
    d.ellipse((48, 72, 58, 80), fill="#DBEAFE")
    d.ellipse((70, 72, 80, 80), fill="#DBEAFE")
    text_center(d, (42, 58, 86, 74), "INS", "#FFFFFF", 10, True)
    save(img, "vehicle_insurance")


def icon_insurance():
    img, d = canvas()
    pts = [(64, 18), (100, 36), (90, 92), (38, 92), (28, 36)]
    d.polygon(pts, fill="#E0F2FE", outline="#0284C7", width=2)
    text_center(d, (28, 44, 100, 72), "INS", "#0369A1", 16, True)
    d.line((44, 78, 84, 78), fill="#0284C7", width=2)
    save(img, "insurance")


def icon_health_insurance():
    img, d = canvas()
    pts = [(64, 18), (100, 36), (90, 92), (38, 92), (28, 36)]
    d.polygon(pts, fill="#FEE2E2", outline="#DC2626", width=2)
    d.rectangle((58, 44, 70, 72), fill="#DC2626")
    d.rectangle((50, 54, 78, 62), fill="#DC2626")
    save(img, "health_insurance")


def icon_lab_report():
    img, d = canvas()
    rounded_rect(d, (34, 18, 94, 28), 4, "#94A3B8", "#64748B", 1)
    doc_sheet(d, 26, 24, 76, 82, "#FFFFFF", "#64748B")
    for i, h in enumerate([18, 28, 22, 32]):
        x = 40 + i * 14
        d.rectangle((x, 68 - h, x + 10, 68), fill="#3B82F6")
    save(img, "lab_report")


def icon_prescription():
    img, d = canvas()
    doc_sheet(d, 28, 20, 72, 88, "#FFFFFF", "#64748B")
    text_center(d, (28, 28, 100, 52), "Rx", "#DC2626", 28, True)
    d.line((36, 58, 92, 58), fill="#CBD5E1", width=2)
    d.line((36, 70, 80, 70), fill="#CBD5E1", width=2)
    d.line((36, 82, 72, 82), fill="#CBD5E1", width=2)
    save(img, "prescription")


def icon_vaccination():
    img, d = canvas()
    rounded_rect(d, (52, 24, 62, 34), 3, "#64748B", "#475569", 1)
    d.rectangle((54, 34, 60, 88), fill="#CBD5E1", outline="#64748B", width=2)
    d.polygon([(48, 88), (66, 88), (64, 96), (50, 96)], fill="#64748B")
    d.ellipse((44, 40, 52, 48), fill="#22C55E")
    save(img, "vaccination")


def icon_medical_bill():
    img, d = canvas()
    doc_sheet(d, 26, 18, 76, 92, "#FFFFFF", "#64748B", "#DC2626")
    text_center(d, (26, 28, 102, 48), "BILL", "#1E293B", 14, True)
    d.line((38, 56, 90, 56), fill="#CBD5E1", width=2)
    d.line((38, 68, 90, 68), fill="#CBD5E1", width=2)
    text_center(d, (26, 78, 102, 98), "₹", "#DC2626", 18, True)
    save(img, "medical_bill")


def icon_discharge_summary():
    img, d = canvas()
    doc_sheet(d, 24, 18, 80, 92, "#FFFFFF", "#64748B", "#DC2626")
    d.rectangle((58, 36, 70, 56), fill="#DC2626")
    d.rectangle((50, 44, 78, 48), fill="#DC2626")
    d.line((36, 64, 92, 64), fill="#CBD5E1", width=2)
    d.line((36, 76, 84, 76), fill="#CBD5E1", width=2)
    save(img, "discharge_summary")


def icon_purchase_receipt():
    img, d = canvas()
    doc_sheet(d, 30, 16, 68, 88, "#FFFBEB", "#D97706")
    text_center(d, (30, 24, 98, 40), "RECEIPT", "#92400E", 10, True)
    d.line((40, 48, 88, 48), fill="#FCD34D", width=2)
    d.line((40, 58, 88, 58), fill="#FCD34D", width=2)
    d.line((40, 68, 76, 68), fill="#FCD34D", width=2)
    pts = [(38, 96), (90, 96), (86, 104), (82, 96), (78, 104), (74, 96), (70, 104), (66, 96), (62, 104), (58, 96), (54, 104), (50, 96), (46, 104), (42, 96)]
    d.polygon(pts, fill="#FFFBEB", outline="#D97706")
    save(img, "purchase_receipt")


def icon_warranty():
    img, d = canvas()
    pts = [(64, 18), (100, 36), (90, 92), (38, 92), (28, 36)]
    d.polygon(pts, fill="#ECFDF5", outline="#059669", width=2)
    d.line((48, 58, 60, 72), fill="#059669", width=3)
    d.line((60, 72, 82, 46), fill="#059669", width=3)
    save(img, "warranty")


def icon_identity():
    img, d = canvas()
    rounded_rect(d, (24, 36, 104, 92), 10, "#EFF6FF", "#2563EB", 2)
    d.ellipse((34, 48, 58, 72), fill="#BFDBFE", outline="#2563EB", width=1)
    d.rectangle((66, 50, 92, 58), fill="#BFDBFE")
    d.rectangle((66, 64, 88, 72), fill="#BFDBFE")
    d.rectangle((66, 78, 82, 86), fill="#BFDBFE")
    save(img, "identity")


def icon_health_medical():
    img, d = canvas()
    rounded_rect(d, (28, 28, 100, 100), 16, "#FEE2E2", "#DC2626", 2)
    d.rectangle((58, 44, 70, 84), fill="#DC2626")
    d.rectangle((44, 56, 84, 68), fill="#DC2626")
    save(img, "health_medical")


def icon_vehicle():
    img, d = canvas()
    rounded_rect(d, (24, 52, 104, 76), 10, "#3B82F6", "#1D4ED8", 2)
    d.ellipse((36, 72, 52, 88), fill="#1E293B")
    d.ellipse((76, 72, 92, 88), fill="#1E293B")
    d.polygon([(34, 52), (48, 36), (88, 36), (104, 52)], fill="#93C5FD", outline="#1D4ED8")
    save(img, "vehicle")


def icon_property():
    img, d = canvas()
    d.polygon([(64, 22), (98, 46), (98, 92), (30, 92), (30, 46)], fill="#FEF3C7", outline="#D97706", width=2)
    d.rectangle((52, 62, 76, 92), fill="#92400E")
    d.polygon([(64, 22), (78, 34), (50, 34)], fill="#D97706")
    save(img, "property")


def icon_financial():
    img, d = canvas()
    rounded_rect(d, (30, 30, 98, 98), 14, "#FFFBEB", "#CA8A04", 2)
    text_center(d, (30, 38, 98, 92), "₹", "#CA8A04", 42, True)
    save(img, "financial")


def icon_education():
    img, d = canvas()
    d.polygon([(24, 56), (64, 36), (104, 56), (64, 76)], fill="#1E293B")
    d.rectangle((58, 56, 70, 62), fill="#FBBF24")
    rounded_rect(d, (38, 76, 90, 92), 4, "#1E293B", "#0F172A", 1)
    save(img, "education")


def icon_purchase():
    img, d = canvas()
    icon_purchase_receipt()
    save(Image.open(OUT / "purchase_receipt.png"), "purchase")


def icon_legal():
    img, d = canvas()
    d.line([(64, 24), (64, 44)], fill="#64748B", width=3)
    d.line([(38, 44), (90, 44)], fill="#64748B", width=3)
    d.line([(38, 44), (38, 58)], fill="#64748B", width=2)
    d.line([(90, 44), (90, 58)], fill="#64748B", width=2)
    d.polygon([(32, 58), (44, 58), (38, 92), (26, 92)], fill="#FEF3C7", outline="#CA8A04", width=2)
    d.polygon([(84, 58), (96, 58), (102, 92), (90, 92)], fill="#FEF3C7", outline="#CA8A04", width=2)
    save(img, "legal")


def icon_other():
    img, d = canvas()
    doc_sheet(d, 34, 24, 60, 76, "#F8FAFC", "#94A3B8")
    doc_sheet(d, 26, 32, 60, 76, "#FFFFFF", "#64748B")
    d.line((38, 50, 74, 50), fill="#CBD5E1", width=2)
    d.line((38, 62, 74, 62), fill="#CBD5E1", width=2)
    d.line((38, 74, 62, 74), fill="#CBD5E1", width=2)
    save(img, "other")


def icon_bill():
    img, d = canvas()
    doc_sheet(d, 28, 16, 72, 88, "#FFFFFF", "#64748B", "#2563EB")
    text_center(d, (28, 24, 100, 42), "BILL", "#1E293B", 13, True)
    for y in (52, 64, 76):
        d.line((40, y, 88, y), fill="#CBD5E1", width=2)
    text_center(d, (28, 82, 100, 102), "₹", "#2563EB", 16, True)
    save(img, "bill")


def icon_card():
    img, d = canvas()
    rounded_rect(d, (20, 40, 108, 88), 10, "#1E293B", "#0F172A", 2)
    d.rectangle((20, 52, 108, 62), fill="#FBBF24")
    d.rectangle((28, 68, 52, 78), fill="#64748B")
    d.rectangle((60, 68, 96, 74), fill="#94A3B8")
    save(img, "card")


def icon_invoice():
    img, d = canvas()
    doc_sheet(d, 26, 16, 76, 92, "#FFFFFF", "#64748B", "#0EA5E9")
    text_center(d, (26, 22, 102, 38), "INVOICE", "#0F172A", 10, True)
    for y in range(46, 82, 10):
        d.line((36, y, 92, y), fill="#E2E8F0", width=1)
    for x in (36, 56, 72):
        d.line((x, 46, x, 82), fill="#E2E8F0", width=1)
    save(img, "invoice")


def icon_receipt():
    icon_purchase_receipt()
    save(Image.open(OUT / "purchase_receipt.png"), "receipt")


def icon_certificate():
    img, d = canvas()
    rounded_rect(d, (30, 22, 98, 88), 8, "#FFFBEB", "#CA8A04", 2)
    text_center(d, (30, 30, 98, 46), "CERTIFICATE", "#92400E", 8, True)
    d.line((40, 54, 88, 54), fill="#FCD34D", width=2)
    d.line((40, 66, 88, 66), fill="#FCD34D", width=2)
    d.ellipse((56, 72, 72, 88), outline="#CA8A04", width=2)
    save(img, "certificate")


def icon_report():
    img, d = canvas()
    icon_lab_report()
    save(Image.open(OUT / "lab_report.png"), "report")


def icon_letter():
    img, d = canvas()
    d.polygon([(24, 40), (104, 40), (104, 92), (24, 92)], fill="#EFF6FF", outline="#2563EB", width=2)
    d.polygon([(24, 40), (64, 68), (104, 40)], fill="#BFDBFE", outline="#2563EB", width=2)
    save(img, "letter")


def icon_contract():
    img, d = canvas()
    doc_sheet(d, 24, 18, 80, 88, "#FFFFFF", "#64748B")
    d.line((36, 40, 92, 40), fill="#CBD5E1", width=2)
    d.line((36, 52, 92, 52), fill="#CBD5E1", width=2)
    d.line((36, 72, 70, 88), fill="#2563EB", width=2)
    save(img, "contract")


def icon_agreement():
    icon_contract()
    save(Image.open(OUT / "contract.png"), "agreement")


def icon_license():
    img, d = canvas()
    rounded_rect(d, (28, 30, 100, 94), 10, "#F0FDF4", "#16A34A", 2)
    d.polygon([(64, 38), (70, 50), (82, 50), (72, 58), (76, 70), (64, 62), (52, 70), (56, 58), (46, 50), (58, 50)], fill="#FBBF24", outline="#CA8A04")
    text_center(d, (28, 58, 100, 88), "LICENSE", "#166534", 10, True)
    save(img, "license")


def icon_policy():
    img, d = canvas()
    icon_insurance()
    save(Image.open(OUT / "insurance.png"), "policy")


def icon_statement():
    img, d = canvas()
    doc_sheet(d, 26, 18, 76, 92, "#FFFFFF", "#64748B", "#059669")
    text_center(d, (26, 24, 102, 40), "STATEMENT", "#065F46", 9, True)
    for y in (50, 62, 74, 86):
        d.line((38, y, 90, y), fill="#CBD5E1", width=2)
    save(img, "statement")


def icon_form():
    img, d = canvas()
    rounded_rect(d, (34, 18, 94, 28), 4, "#94A3B8", "#64748B", 1)
    doc_sheet(d, 26, 24, 76, 82, "#FFFFFF", "#64748B")
    for y in (42, 58, 74):
        d.rectangle((38, y, 46, y + 8), outline="#64748B", width=2)
        d.line((52, y + 4, 88, y + 4), fill="#CBD5E1", width=2)
    save(img, "form")


def icon_photo():
    img, d = canvas()
    rounded_rect(d, (24, 32, 104, 96), 10, "#FFFFFF", "#64748B", 2)
    d.polygon([(32, 84), (48, 64), (62, 74), (78, 52), (96, 84)], fill="#BFDBFE", outline="#2563EB")
    d.ellipse((78, 42, 92, 56), fill="#FBBF24")
    save(img, "photo")


def icon_resume():
    img, d = canvas()
    doc_sheet(d, 28, 18, 72, 92, "#FFFFFF", "#64748B")
    d.ellipse((40, 30, 60, 50), fill="#CBD5E1", outline="#64748B", width=1)
    d.line((36, 58, 92, 58), fill="#CBD5E1", width=2)
    d.line((36, 70, 88, 70), fill="#CBD5E1", width=2)
    d.line((36, 82, 80, 82), fill="#CBD5E1", width=2)
    save(img, "resume")


def icon_ticket():
    img, d = canvas()
    rounded_rect(d, (22, 40, 106, 88), 8, "#FEF3C7", "#D97706", 2)
    d.line([(64, 40), (64, 88)], fill="#D97706", width=2)
    for cy in (48, 80):
        d.ellipse((58, cy, 70, cy + 8), fill=(0, 0, 0, 0), outline="#D97706", width=2)
    text_center(d, (22, 46, 64, 82), "TICKET", "#92400E", 9, True)
    save(img, "ticket")


def icon_permit():
    img, d = canvas()
    d.ellipse((30, 30, 98, 98), outline="#DC2626", width=3)
    d.ellipse((38, 38, 90, 90), outline="#DC2626", width=2)
    text_center(d, (38, 46, 90, 82), "PERMIT", "#DC2626", 10, True)
    save(img, "permit")


def icon_voucher():
    img, d = canvas()
    rounded_rect(d, (22, 42, 106, 86), 8, "#ECFDF5", "#059669", 2)
    d.line([(64, 42), (64, 86)], fill="#059669", width=2)
    text_center(d, (22, 48, 64, 80), "VOUCHER", "#065F46", 8, True)
    text_center(d, (64, 48, 106, 80), "₹", "#059669", 16, True)
    save(img, "voucher")


def icon_cheque():
    img, d = canvas()
    rounded_rect(d, (18, 46, 110, 82), 6, "#EFF6FF", "#2563EB", 2)
    d.line((28, 58, 78, 58), fill="#CBD5E1", width=2)
    d.line((28, 68, 100, 68), fill="#CBD5E1", width=2)
    text_center(d, (78, 54, 104, 74), "₹", "#2563EB", 14, True)
    save(img, "cheque")


def icon_challan():
    img, d = canvas()
    doc_sheet(d, 26, 18, 76, 92, "#FEF2F2", "#DC2626", "#DC2626")
    text_center(d, (26, 24, 102, 42), "CHALLAN", "#991B1B", 10, True)
    d.line((38, 54, 90, 54), fill="#FECACA", width=2)
    d.line((38, 68, 90, 68), fill="#FECACA", width=2)
    save(img, "challan")


def icon_pass():
    img, d = canvas()
    rounded_rect(d, (24, 32, 104, 96), 10, "#DBEAFE", "#2563EB", 2)
    text_center(d, (24, 38, 104, 56), "PASS", "#1D4ED8", 14, True)
    d.line((36, 64, 92, 64), fill="#93C5FD", width=2)
    d.line((36, 76, 80, 76), fill="#93C5FD", width=2)
    save(img, "pass")


def icon_id():
    img, d = canvas()
    icon_identity()
    save(Image.open(OUT / "identity.png"), "id")


def main() -> None:
    generators = [
        icon_passport,
        icon_pan,
        icon_aadhaar,
        icon_vehicle_rc,
        icon_vehicle_puc,
        icon_vehicle_insurance,
        icon_insurance,
        icon_health_insurance,
        icon_lab_report,
        icon_prescription,
        icon_vaccination,
        icon_medical_bill,
        icon_discharge_summary,
        icon_purchase_receipt,
        icon_warranty,
        icon_identity,
        icon_health_medical,
        icon_vehicle,
        icon_property,
        icon_financial,
        icon_education,
        icon_purchase,
        icon_legal,
        icon_other,
        icon_bill,
        icon_card,
        icon_invoice,
        icon_receipt,
        icon_certificate,
        icon_report,
        icon_letter,
        icon_contract,
        icon_agreement,
        icon_license,
        icon_policy,
        icon_statement,
        icon_form,
        icon_photo,
        icon_resume,
        icon_ticket,
        icon_permit,
        icon_voucher,
        icon_cheque,
        icon_challan,
        icon_pass,
        icon_id,
    ]
    for fn in generators:
        fn()
    total = sum(p.stat().st_size for p in OUT.glob("*.png"))
    print(f"Generated {len(list(OUT.glob('*.png')))} icons, total {total // 1024}KB")


if __name__ == "__main__":
    main()
