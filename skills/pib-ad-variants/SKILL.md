---
name: pib-ad-variants
description: Build 3x3 grid of variants from a measured winner. Exactly one variable per axis; rest frozen. Brand gate, Theo checks, platform safe area, contact sheet. Only winners/approved to Drive (pib-drive-saving); drafts to cockpit asset store. Hand to Revenue Lead.
version: 1.0.0
author: Partners in Biz
license: MIT
metadata:
  tags: [partnersinbiz, ad-variants, creative, testing, variants]
---

# PiB Ad Variants

Build a 3x3 grid of ad variants from a measured winner to test one variable per axis. Every variant passes Theo's brand gate and platform checks before any go to Drive.

## Start with a measured winner

1. Name the winner (e.g. "Hook: AI-powered summary, Visual: Founder testimonial").
2. State its metric: CTR, CPA, impressions, or conversion rate.
3. Freeze everything except one variable per axis (9 variants total).

**Example grid:**

```
                  Hook A          Hook B          Hook C
Visual 1 (Test)   [1] A+V1        [2] B+V1        [3] C+V1
Visual 2 (Test)   [4] A+V2        [5] B+V2        [6] C+V2
Visual 3 (Test)   [7] A+V3        [8] B+V3        [9] C+V3
```

Axis A: hook / headline copy (one variable)
Axis B: visual / image or video (one variable)
Rest frozen: product name, CTA, colors, logo placement, offer, audience.

## Brand gate before anything ships

Before any variant is created or posted:

- [ ] **Palette**: colours match approved brand kit
- [ ] **Logo**: placed correctly, not obscured
- [ ] **Tone**: voice and messaging aligned with brand
- [ ] **Claims**: any product claim is from approved brand kit or Drive source

Theo signs off on the brand gate. No variants proceed without sign-off.

## Theo's checks (PAR-3608, PAR-3616, PAR-3617)

**PAR-3608**: Every variant checked against platform safe area. Post a contact sheet (all 9 thumbnails) showing that product name, logo, and CTA are visible in the safe area on all platforms (Instagram, Facebook, TikTok, etc.).

**PAR-3616**: Every claim in copy carries a Drive source link. If copy says "saves 40% time", link to the study, test result, or brand document proving it. No unsourced claims.

**PAR-3617**: Hands never cover product name or CTA button. Check every frame: no hand models, no gesture, no shadow or blur obscuring the name or call to action.

## Naming convention

All variant files: `YYYY-MM-DD <Product> <what> v01`

Examples:
- `2026-10-18 Athleet Hook Test v01`
- `2026-10-18 Lumen Visual Grid v01`

## Destination (Drive or cockpit asset store)

**Only approved winners or final variants** go to Drive (see pib-drive-saving):

- [ ] Brand gate pass (Theo sign-off)
- [ ] All three Theo checks pass (safe area, sources, no hands)
- [ ] Revenue Lead approval to promote to paid media (via pib-paid-ads)

**Working drafts and non-winning variants** stay in the cockpit asset store. Never save drafts to Drive root or loose folders.

## Hand to Revenue Lead

Once variants are approved and winners are identified:

1. Post approved variants on Drive (pib-drive-saving folder structure).
2. Document which variant(s) won and on what metric (CTR, CPA, etc.).
3. Hand the winning assets to Revenue Lead with testing results.
4. Revenue Lead launches via pib-paid-ads skill.

## Checks

- [ ] Winner named and metric documented
- [ ] 3x3 grid created (9 variants, one variable per axis)
- [ ] Brand gate sign-off (Theo)
- [ ] Safe area verified on all platforms (PAR-3608 contact sheet)
- [ ] All claims sourced to Drive links (PAR-3616)
- [ ] No hands covering product name or CTA (PAR-3617)
- [ ] Files named YYYY-MM-DD <Product> <what> v01
- [ ] Drafts in cockpit; approved only to Drive
- [ ] Evidence and results posted with handoff to Revenue Lead
