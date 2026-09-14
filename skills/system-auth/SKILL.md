---
name: system-auth
description: >
  Authenticate Partners in Biz API calls correctly. Interactive agent work must use a
  user-delegation token scoped to the requesting human's org/module access. External
  agents (Cursor, Claude Code, Hermes outside Messages) must run pib-skills login or
  use a Settings personal token. Platform AI_API_KEY / long-lived agent keys are for
  cron and system jobs only. Use whenever an agent is about to call /api/v1/*.
---

# System Auth — Partners in Biz

## Rules (non-negotiable)

1. **Interactive work acting for a human** → user-delegation token (`pib_dlg_…`) or personal token (`pib_usr_…`).
2. **Cron, watchers, system maintenance** → platform `AI_API_KEY` or per-agent `pib_ag_` / workspace `pib_ak_` keys only.
3. Skills describe *how* to call the API. The API enforces *whether*. Never assume a god-key bypasses org ACLs.
4. Effective permission = `user scopes ∩ agent capability ∩ approval gates`.
5. After login or `pib-skills use`, call `GET /api/v1/oauth/whoami` and send `X-Org-Id` from **that** profile on every tenant call.
6. On 403, print the API `error` and stop. Do not retry with `AI_API_KEY` or another workspace’s token.
7. Never send org A’s Bearer token with org B’s `X-Org-Id`. Switch with `pib-skills use` first.

## Mode A — Messages / in-app chat (automatic)

When a human sends a Messages chat that dispatches Hermes / linked-computer runs, the platform mints a **fresh** short-lived delegation on **every turn** and injects:

```
[Partners in Biz API auth — user delegation]
Authorization: Bearer pib_dlg_…
X-Org-Id: <orgId>
```

Prefer that injected Bearer token for all `/api/v1/*` calls in the run. Do not fall back to `AI_API_KEY`.

If `/api/v1/agent/email/*` returns 401/403, the platform remints once in the same run and retries silently. Do not ask the human to send another chat message.

## Mode B — External agents (Cursor, Claude Code, your Hermes)

You do not have a Messages-injected token. Identify the human first.

```bash
./bin/pib-skills login
./bin/pib-skills orgs
./bin/pib-skills whoami
```

`login` starts device OAuth, opens `https://partnersinbiz.online/connect/agent`, and **adds** a workspace profile at `~/.config/partnersinbiz/credentials.json`. Logging in again for another org keeps existing profiles.

When the human names a workspace:

1. `pib-skills use "<name or org id>"`
2. `pib-skills whoami` — confirm `orgName` + `memberRole`
3. `pib-skills print-auth --json` — attach `accessToken` as Bearer and `orgId` as `X-Org-Id`. Do **not** echo the token back to the human.
4. If `use` says there is no stored login, stop and ask them to `pib-skills login` and approve **that** org. Do not invent access.

In one turn (“invoice on A, then post on B”): `use A` → work → `use B` → work. Each call uses only that profile’s token and `X-Org-Id`.

`pib-skills orgs` lists **approved** profiles only, not every membership in the product.

Headless fallback (Settings → Connected agents → Create personal token):

```bash
export PIB_ACCESS_TOKEN='pib_usr_…'
export PIB_ORG_ID='<orgId>'
```

`PIB_ACCESS_TOKEN` is a single-token override (no org hopping). `PIB_ORG_ID` / `PIB_PROFILE` select a **stored** profile for this process without changing the default.

Then:

```http
GET /api/v1/oauth/whoami
Authorization: Bearer <token>
X-Org-Id: <orgId>
```

Use the returned `uid`, `email`, `orgId`, `memberRole` as the acting identity. Admin/ops skills still 403 when `memberRole` cannot perform the action. Owner in one org does not make the agent admin in another.

```http
Authorization: Bearer <pib_dlg_ or pib_usr_>
X-Org-Id: <orgId>
```

Refresh: `POST /api/v1/oauth/token` with `{ "grant_type": "refresh_token", "refresh_token": "pib_rt_…" }`. `pib-skills whoami` refreshes automatically.

Workspace API keys on Settings → API keys (`pib_ak_`) act as a **system agent**, not as the human. Do not use them for interactive agent work.

## Interactive mint (in-app sessions only)

```http
POST /api/v1/agent/delegations
Authorization: Bearer <user_session_or_id_token>
```

External agents should use device login instead of this route.

## System auth (cron only)

```http
Authorization: Bearer <AI_API_KEY_or_agent_key>
X-Org-Id: <orgId>
```

Tag writes with `createdByType: "system"` when the job is cron-originated.

## Forbidden

- Using the platform god-key in an interactive session “because it is easier”
- Creating resources in an org the requesting user cannot access
- Mixing one workspace’s token with another workspace’s `X-Org-Id`
- Retrying a 403 with a different stored profile’s token
- Claiming success after a write without read-back
- Inventing a remint ritual for the human to paste a new token into chat
- Printing `print-auth` tokens in the chat reply

## When access is denied

Surface the exact API `error` string. If the workspace is not a stored profile, ask the human to `pib-skills login` and approve that org. Never retry with a more privileged key or a different profile’s token.
