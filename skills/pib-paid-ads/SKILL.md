---
name: pib-paid-ads
description: Paid ads campaign workflow in plugin-ads. Write campaign spec, propose for approval, execute only from approved proposal. Elon up to R500, above R500 goes to Peet via 16:00 batch. Campaigns PAUSED with lifetime budget per ad set; verify caps before activation. Use setCampaignStatus PAUSED as kill switch. Post approval evidence and spend tracking.
version: 1.0.0
author: Partners in Biz
license: MIT
metadata:
  tags: [partnersinbiz, paid-ads, meta, campaigns, approval]
---

# PiB Paid Ads

Revenue Lead owns paid media execution. This skill covers campaign spec writing, approval routing, deployment, and compliance with spend and creative budgets.

## Campaign spec (product, objective, audience, creative, platform, schedule, lifetime budget)

Write a campaign spec document with these sections:

1. **Product**: what we are selling or promoting
2. **Objective**: awareness, consideration, conversion, or retention
3. **Audience**: demographics, interests, exclusions, lookalikes (if any)
4. **Creative refs**: links or IDs to approved creative assets (images, videos, copy variations)
5. **Platform**: Meta, Google, TikTok, LinkedIn, or YouTube
6. **Schedule**: start date, end date, timezone
7. **Lifetime budget per ad set**: in ZAR, split across each ad set (e.g. "Ad set A: R200, Ad set B: R250")

## Approval thresholds

- **Elon approves** campaigns with lifetime budget **up to R500 per campaign** (all ad sets combined).
- **Above R500**: propose in `plugin-ads` issue, tagged for Peet. Peet reviews via the **16:00 batch** — never escalate directly to Peet via chat or comment. Peet's batch review is the approval gate for high-spend campaigns.

## Execution: only from approved proposal

- **Never execute** from a comment, chat message, or side conversation.
- **Always execute** from a live, approved proposal in `plugin-ads`.
- Copy the proposal ID and approver name into the campaign creation call.

## Campaign setup (PAUSED with lifetime budget and caps)

1. Create campaigns in **PAUSED** status (never active on creation).
2. Set **lifetime budget on every ad set** (not daily budget). Budget is final and does not reset.
3. Before activation, set **platform-specific spend caps** (e.g. Meta daily cap, Google daily budget limit).
4. **Verify caps are in place** before moving the campaign status to active.
5. **Hourly sweeper pauses campaigns** at the cap. If a campaign hits its cap mid-day, the sweeper pauses it; Mira reports the sweeper's pauses as part of her spend report.

## Kill switch: `setCampaignStatus` PAUSED

Use `setCampaignStatus(campaignId, PAUSED)` **immediately** if:

- Any ad is rejected (platform policy, creative, landing page).
- Campaign overspends or runs over the lifetime budget.
- Theo or Mira flags an anomaly (unusual CTR, CPA spike, invalid clicks).
- A pause order is issued by Elon or Peet.

Do not wait for the hourly sweeper. PAUSED is the safest state.

## Creative generation budget (separate from ad spend)

- Theo's creative generation (photography, video, graphics) stays under Elon's approval: **R500 per asset per month**.
- This budget is **separate** from the ad campaign lifetime budget.
- Theo tracks monthly generation spend and reports to Elon.

## Evidence to post on the issue

After campaign execution, post these details on the plugin-ads issue:

- Proposal ID
- Approver name and approval date
- Campaign ID and ad set IDs (comma-separated)
- Status: PAUSED (proof via screenshot or API call output)
- Lifetime budget per ad set (e.g. "Ad set 1: R200, Ad set 2: R250")
- Caps set per platform (e.g. "Meta: R50/day, Google: R50/day")
- Activation timestamp (when moved to active, if applicable)
- Later: spend vs. cap tracking weekly (by Mira)

## Ownership and KPIs

- **Revenue Lead**: owns media execution and proposal approval.
- **Theo**: creative design, asset generation, safe-area checks (see pib-ad-variants).
- **Mira**: spend tracking (actual vs. cap), CTR, CPA, ROAS, CAC. Weekly report to Revenue Lead.

## Checks

Before launch:

- [ ] Campaign spec complete (product, objective, audience, creative, platform, schedule, budget)
- [ ] Proposal created and approved in plugin-ads (Elon <= R500, Peet via 16:00 batch above)
- [ ] Campaign created in PAUSED status
- [ ] Lifetime budget set on every ad set
- [ ] Platform caps configured (daily or equivalent)
- [ ] Caps verified in platform dashboard
- [ ] All creative assets approved (brand gate pass, Theo sign-off)
- [ ] Landing page live and tested
- [ ] No ad rejections pending

After activation:

- [ ] Evidence posted on issue (proposal, ids, status, budget, caps, timestamp)
- [ ] Hourly sweeper running and healthy (Mira monitors via spend report)
- [ ] Daily check for ad rejections or anomalies
- [ ] Weekly spend report from Mira (actual vs. cap, KPIs)
