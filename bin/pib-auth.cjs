#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')
const { spawn } = require('node:child_process')

const DEFAULT_API_BASE = process.env.PIB_API_BASE || 'https://partnersinbiz.online'

function configDir() {
  return process.env.PIB_CONFIG_DIR || path.join(os.homedir(), '.config', 'partnersinbiz')
}

function credentialsPath() {
  return path.join(configDir(), 'credentials.json')
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function emptyStore(apiBase) {
  return {
    apiBase: (apiBase || DEFAULT_API_BASE).replace(/\/+$/, ''),
    activeProfile: '',
    profiles: {},
  }
}

function isProfile(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function migrateStore(raw) {
  const apiBase = (process.env.PIB_API_BASE || raw?.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '')
  if (!raw || typeof raw !== 'object') return emptyStore(apiBase)

  if (raw.profiles && typeof raw.profiles === 'object' && !Array.isArray(raw.profiles)) {
    const profiles = {}
    for (const [key, profile] of Object.entries(raw.profiles)) {
      if (!isProfile(profile)) continue
      const orgId = typeof profile.orgId === 'string' && profile.orgId.trim() ? profile.orgId.trim() : key
      profiles[key] = { ...profile, orgId }
    }
    const activeProfile = typeof raw.activeProfile === 'string' && profiles[raw.activeProfile]
      ? raw.activeProfile
      : (Object.keys(profiles)[0] || '')
    return { apiBase, activeProfile, profiles }
  }

  if (typeof raw.accessToken === 'string' && raw.accessToken) {
    const orgId = typeof raw.orgId === 'string' && raw.orgId.trim() ? raw.orgId.trim() : 'default'
    return {
      apiBase,
      activeProfile: orgId,
      profiles: {
        [orgId]: {
          orgId,
          orgName: raw.user && typeof raw.user.orgName === 'string' ? raw.user.orgName : '',
          accessToken: raw.accessToken,
          refreshToken: raw.refreshToken || '',
          expiresAt: raw.expiresAt || '',
          user: raw.user || null,
        },
      },
    }
  }

  return emptyStore(apiBase)
}

function loadStore() {
  return migrateStore(readJson(credentialsPath()) || {})
}

function writeStore(store) {
  const next = {
    apiBase: (store.apiBase || DEFAULT_API_BASE).replace(/\/+$/, ''),
    activeProfile: store.activeProfile || '',
    profiles: store.profiles || {},
  }
  fs.mkdirSync(configDir(), { recursive: true, mode: 0o700 })
  fs.writeFileSync(credentialsPath(), JSON.stringify(next, null, 2) + '\n', { mode: 0o600 })
  return next
}

function listProfiles(store) {
  return Object.entries(store.profiles || {}).map(([key, profile]) => ({
    key,
    orgId: profile.orgId || key,
    orgName: profile.orgName || '',
    accessToken: profile.accessToken || '',
    refreshToken: profile.refreshToken || '',
    expiresAt: profile.expiresAt || '',
    user: profile.user || null,
  }))
}

function matchProfiles(store, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  const all = listProfiles(store)
  const exactIdOrKey = all.filter((profile) => profile.orgId.toLowerCase() === q || profile.key.toLowerCase() === q)
  if (exactIdOrKey.length === 1) return exactIdOrKey
  if (exactIdOrKey.length > 1) return exactIdOrKey
  const exactName = all.filter((profile) => (profile.orgName || '').toLowerCase() === q)
  if (exactName.length > 0) return exactName
  return all.filter((profile) => {
    const name = (profile.orgName || '').toLowerCase()
    const id = profile.orgId.toLowerCase()
    const key = profile.key.toLowerCase()
    return name.includes(q) || id.includes(q) || key.includes(q)
  })
}

function requireUniqueMatch(store, query, label) {
  const matches = matchProfiles(store, query)
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(`${label || query}: no stored login for that workspace. Run pib-skills login and approve it.`)
  }
  const names = matches.map((profile) => `${profile.orgName || profile.orgId} (${profile.orgId})`).join(', ')
  throw new Error(`Ambiguous workspace "${query}". Matches: ${names}. Use the org id.`)
}

function upsertProfile(store, profile, options = {}) {
  const orgId = String(profile.orgId || '').trim()
  if (!orgId) throw new Error('orgId is required to store a profile')
  const key = orgId
  const next = {
    apiBase: (profile.apiBase || store.apiBase || DEFAULT_API_BASE).replace(/\/+$/, ''),
    activeProfile: options.setActive === false ? store.activeProfile : key,
    profiles: { ...store.profiles, [key]: {
      orgId,
      orgName: profile.orgName || store.profiles[key]?.orgName || '',
      accessToken: profile.accessToken || '',
      refreshToken: profile.refreshToken || '',
      expiresAt: profile.expiresAt || '',
      user: profile.user || null,
    } },
  }
  if (options.setActive === false && !next.profiles[next.activeProfile]) {
    next.activeProfile = key
  }
  return next
}

function removeProfile(store, key) {
  const profiles = { ...store.profiles }
  delete profiles[key]
  const keys = Object.keys(profiles)
  const activeProfile = store.activeProfile === key ? (keys[0] || '') : store.activeProfile
  return { ...store, profiles, activeProfile }
}

function sessionFromProfile(store, profile, extra = {}) {
  return {
    apiBase: extra.apiBase || store.apiBase || DEFAULT_API_BASE.replace(/\/+$/, ''),
    accessToken: extra.accessToken || profile.accessToken || '',
    refreshToken: profile.refreshToken || '',
    expiresAt: profile.expiresAt || '',
    orgId: extra.orgId || profile.orgId || '',
    orgName: profile.orgName || '',
    user: profile.user || null,
    profileKey: profile.key || profile.orgId || '',
    envOverride: Boolean(extra.envOverride),
  }
}

function resolveSession(store, options = {}) {
  const persist = options.persist !== false
  const envToken = process.env.PIB_ACCESS_TOKEN || process.env.PIB_USER_TOKEN || ''
  const envProfile = process.env.PIB_PROFILE || ''
  const envOrgId = process.env.PIB_ORG_ID || ''
  const apiBase = (process.env.PIB_API_BASE || store.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '')

  if (envToken) {
    return {
      apiBase,
      accessToken: envToken,
      refreshToken: '',
      expiresAt: '',
      orgId: envOrgId,
      orgName: '',
      user: null,
      profileKey: '',
      envOverride: true,
    }
  }

  if (envOrgId) {
    const exact = listProfiles(store).filter((profile) => profile.orgId === envOrgId)
    if (exact.length === 0) {
      throw new Error(`No stored login for org ${envOrgId}. Run pib-skills login and approve that workspace.`)
    }
    if (exact.length > 1) {
      throw new Error(`Ambiguous stored login for org ${envOrgId}.`)
    }
    return sessionFromProfile({ ...store, apiBase }, exact[0], { apiBase })
  }

  if (envProfile) {
    const profile = requireUniqueMatch(store, envProfile, envProfile)
    return sessionFromProfile({ ...store, apiBase }, profile, { apiBase })
  }

  const active = store.profiles[store.activeProfile] || null
  if (!active || !active.accessToken) {
    throw new Error('Not signed in. Run pib-skills login.')
  }
  const profile = { key: store.activeProfile, ...active }
  const session = sessionFromProfile({ ...store, apiBase }, profile, { apiBase })
  if (persist) {
    // no-op: persist is for callers that update tokens
  }
  return session
}

function persistSession(store, session) {
  if (!session || session.envOverride || !session.profileKey) return store
  return writeStore(upsertProfile(store, {
    apiBase: session.apiBase,
    orgId: session.orgId || session.profileKey,
    orgName: session.orgName,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    user: session.user,
  }, { setActive: store.activeProfile === session.profileKey }))
}

function requestJson(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'http:' ? http : https
    const req = lib.request({
      method: options.method || 'GET',
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
        resolve({ status: res.statusCode || 0, json, text })
      })
    })
    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function unwrap(payload) {
  if (!payload || typeof payload !== 'object') return payload
  return payload.data ?? payload
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
}

async function refreshIfNeeded(session, store) {
  if (!session.refreshToken) return { session, store }
  const expiresAt = Date.parse(session.expiresAt || '')
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60 * 1000 && session.accessToken) {
    return { session, store }
  }
  const res = await requestJson(`${session.apiBase}/api/v1/oauth/token`, { method: 'POST' }, {
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  })
  const data = unwrap(res.json)
  if (res.status >= 400 || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'Refresh failed. Run pib-skills login again.')
  }
  const nextSession = {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000).toISOString(),
    orgId: data.org_id || session.orgId,
  }
  const nextStore = persistSession(store, nextSession)
  return { session: nextSession, store: nextStore }
}

async function cmdLogin() {
  const apiBase = DEFAULT_API_BASE.replace(/\/+$/, '')
  const started = await requestJson(`${apiBase}/api/v1/oauth/device/code`, { method: 'POST' }, {
    client_id: 'pib-skills-cli',
    client_label: process.env.PIB_CLIENT_LABEL || 'pib-skills CLI',
  })
  const data = unwrap(started.json)
  if (started.status >= 400 || !data?.device_code) {
    throw new Error(data?.error_description || data?.error || 'Could not start device login')
  }
  const verifyUrl = data.verification_uri_complete || `${data.verification_uri}?code=${encodeURIComponent(data.user_code)}`
  console.log(`Open this page and approve the agent:\n  ${verifyUrl}`)
  console.log(`User code: ${data.user_code}`)
  console.log('Approving another workspace adds a profile. Existing logins stay.')
  try { openBrowser(verifyUrl) } catch { /* ignore */ }

  const interval = Math.max(Number(data.interval) || 5, 5)
  const deadline = Date.now() + (Number(data.expires_in) || 600) * 1000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000))
    const tokenRes = await requestJson(`${apiBase}/api/v1/oauth/token`, { method: 'POST' }, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: data.device_code,
    })
    const tokenData = unwrap(tokenRes.json)
    const error = tokenData?.error || tokenRes.json?.error
    if (error === 'authorization_pending') continue
    if (error === 'slow_down') {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      continue
    }
    if (tokenRes.status >= 400 || !tokenData?.access_token) {
      throw new Error(tokenData?.error_description || error || 'Login failed')
    }
    const orgId = tokenData.org_id || ''
    if (!orgId) throw new Error('Login succeeded but the token did not include an org id.')
    const store = upsertProfile(loadStore(), {
      apiBase,
      orgId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + (Number(tokenData.expires_in) || 3600) * 1000).toISOString(),
    })
    writeStore(store)
    const who = await cmdWhoami(true)
    const count = Object.keys(loadStore().profiles).length
    console.log(`Signed in as ${who.email || who.uid} in ${who.orgName || who.orgId}. ${count} workspace profile(s) stored.`)
    return
  }
  throw new Error('Timed out waiting for approval')
}

function cmdUse(query) {
  const q = String(query || '').trim()
  if (!q) throw new Error('Usage: pib-skills use <org name or org id>')
  const store = loadStore()
  const profile = requireUniqueMatch(store, q, q)
  writeStore({ ...store, activeProfile: profile.key })
  const role = profile.user && profile.user.memberRole ? ` (${profile.user.memberRole})` : ''
  console.log(`Active workspace: ${profile.orgName || profile.orgId}${role}`)
  console.log(`orgId: ${profile.orgId}`)
}

function cmdOrgs() {
  const store = loadStore()
  const profiles = listProfiles(store)
  if (profiles.length === 0) {
    console.log('No stored workspace logins. Run pib-skills login.')
    return
  }
  for (const profile of profiles) {
    const active = profile.key === store.activeProfile ? ' (active)' : ''
    const role = profile.user && profile.user.memberRole ? ` role=${profile.user.memberRole}` : ''
    const name = profile.orgName || profile.orgId
    console.log(`${name}${active}`)
    console.log(`  orgId: ${profile.orgId}${role}`)
  }
}

function cmdLogout(args) {
  const all = args.includes('--all')
  const query = args.find((arg) => arg !== '--all')
  const file = credentialsPath()
  if (all || !query) {
    const store = loadStore()
    if (all || !store.activeProfile || Object.keys(store.profiles).length <= 1) {
      if (fs.existsSync(file)) fs.unlinkSync(file)
      console.log(all ? 'Signed out of all workspaces. Local credentials removed.' : 'Signed out. Local credentials removed.')
      return
    }
    const next = removeProfile(store, store.activeProfile)
    if (Object.keys(next.profiles).length === 0) {
      if (fs.existsSync(file)) fs.unlinkSync(file)
      console.log('Signed out. Local credentials removed.')
      return
    }
    writeStore(next)
    const remaining = next.profiles[next.activeProfile]
    console.log(`Removed active workspace. Active is now ${remaining?.orgName || remaining?.orgId || next.activeProfile}.`)
    return
  }
  const store = loadStore()
  const profile = requireUniqueMatch(store, query, query)
  const next = removeProfile(store, profile.key)
  if (Object.keys(next.profiles).length === 0) {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    console.log(`Removed ${profile.orgName || profile.orgId}. No stored logins left.`)
    return
  }
  writeStore(next)
  console.log(`Removed ${profile.orgName || profile.orgId}. Server grants are unchanged; revoke them in Settings if needed.`)
}

async function cmdWhoami(quiet = false) {
  let store = loadStore()
  let session = resolveSession(store)
  ;({ session, store } = await refreshIfNeeded(session, store))
  const res = await requestJson(`${session.apiBase}/api/v1/oauth/whoami`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(session.orgId ? { 'X-Org-Id': session.orgId } : {}),
    },
  })
  const data = unwrap(res.json)
  if (res.status >= 400) throw new Error(data?.error_description || data?.error || 'whoami failed')
  session = {
    ...session,
    orgId: data.orgId || session.orgId,
    orgName: data.orgName || session.orgName,
    user: data,
  }
  persistSession(store, session)
  if (!quiet) {
    console.log(JSON.stringify({
      ...data,
      activeProfile: session.profileKey || null,
      storedProfiles: listProfiles(loadStore()).map((profile) => ({
        orgId: profile.orgId,
        orgName: profile.orgName || null,
        memberRole: profile.user && profile.user.memberRole ? profile.user.memberRole : null,
        active: profile.key === loadStore().activeProfile,
      })),
    }, null, 2))
  }
  return data
}

async function cmdPrintAuth(args) {
  if (!args.includes('--json') && args.length > 0 && args[0] !== '--json') {
    throw new Error('Usage: pib-skills print-auth --json')
  }
  let store = loadStore()
  let session = resolveSession(store)
  ;({ session, store } = await refreshIfNeeded(session, store))
  persistSession(store, session)
  const user = session.user || {}
  process.stdout.write(`${JSON.stringify({
    accessToken: session.accessToken,
    orgId: session.orgId,
    orgName: session.orgName || user.orgName || null,
    memberRole: user.memberRole || null,
    expiresAt: session.expiresAt || null,
  })}\n`)
}

function cmdStatus() {
  const store = loadStore()
  const profiles = listProfiles(store)
  let session = null
  try {
    session = resolveSession(store)
  } catch {
    session = null
  }
  console.log(`credentials: ${credentialsPath()}`)
  console.log(`apiBase: ${store.apiBase}`)
  console.log(`signedIn: ${Boolean(session && session.accessToken)}`)
  console.log(`profiles: ${profiles.length}`)
  console.log(`activeProfile: ${store.activeProfile || '(none)'}`)
  console.log(`orgId: ${(session && session.orgId) || '(none)'}`)
  console.log(`expiresAt: ${(session && session.expiresAt) || '(none)'}`)
}

async function main() {
  const cmd = process.argv[2] || 'help'
  const args = process.argv.slice(3)
  try {
    if (cmd === 'login') await cmdLogin()
    else if (cmd === 'logout') cmdLogout(args)
    else if (cmd === 'whoami') await cmdWhoami(false)
    else if (cmd === 'status') cmdStatus()
    else if (cmd === 'use') cmdUse(args[0])
    else if (cmd === 'orgs') cmdOrgs()
    else if (cmd === 'print-auth') await cmdPrintAuth(args)
    else {
      console.log('Usage: pib-auth login|logout|whoami|status|use|orgs|print-auth')
      process.exit(cmd === 'help' || cmd === '--help' ? 0 : 1)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

module.exports = {
  credentialsPath,
  emptyStore,
  listProfiles,
  loadStore,
  matchProfiles,
  migrateStore,
  persistSession,
  removeProfile,
  requireUniqueMatch,
  resolveSession,
  upsertProfile,
  writeStore,
}

if (require.main === module) {
  main()
}
