'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pib-auth-'))
process.env.PIB_CONFIG_DIR = dir
delete process.env.PIB_ACCESS_TOKEN
delete process.env.PIB_USER_TOKEN
delete process.env.PIB_ORG_ID
delete process.env.PIB_PROFILE

const auth = require('./pib-auth.cjs')

function resetEnv() {
  delete process.env.PIB_ACCESS_TOKEN
  delete process.env.PIB_USER_TOKEN
  delete process.env.PIB_ORG_ID
  delete process.env.PIB_PROFILE
}

function seedTwoOrgs() {
  let store = auth.emptyStore('https://partnersinbiz.online')
  store = auth.upsertProfile(store, {
    orgId: 'org-a',
    orgName: 'Partners in Biz',
    accessToken: 'pib_dlg_a',
    refreshToken: 'pib_rt_a',
    user: { memberRole: 'owner', orgName: 'Partners in Biz' },
  })
  store = auth.upsertProfile(store, {
    orgId: 'org-b',
    orgName: 'RiseProof',
    accessToken: 'pib_dlg_b',
    refreshToken: 'pib_rt_b',
    user: { memberRole: 'member', orgName: 'RiseProof' },
  })
  return auth.writeStore(store)
}

test('migrates a flat credentials file into profiles', () => {
  const file = auth.credentialsPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({
    apiBase: 'https://partnersinbiz.online',
    accessToken: 'pib_dlg_old',
    refreshToken: 'pib_rt_old',
    orgId: 'pib-platform-owner',
    expiresAt: '2099-01-01T00:00:00.000Z',
    user: { email: 'peet@example.com', orgName: 'Partners in Biz', memberRole: 'owner' },
  }, null, 2))
  const store = auth.loadStore()
  assert.equal(store.activeProfile, 'pib-platform-owner')
  assert.equal(store.profiles['pib-platform-owner'].accessToken, 'pib_dlg_old')
  assert.equal(store.profiles['pib-platform-owner'].orgName, 'Partners in Biz')
})

test('login upsert keeps the other org', () => {
  const store = seedTwoOrgs()
  assert.equal(Object.keys(store.profiles).length, 2)
  assert.equal(store.profiles['org-a'].accessToken, 'pib_dlg_a')
  assert.equal(store.profiles['org-b'].accessToken, 'pib_dlg_b')
  assert.equal(store.activeProfile, 'org-b')
})

test('use matches org name', () => {
  const store = seedTwoOrgs()
  const rise = auth.requireUniqueMatch(store, 'RiseProof')
  assert.equal(rise.orgId, 'org-b')
  const partners = auth.requireUniqueMatch(store, 'partners in biz')
  assert.equal(partners.orgId, 'org-a')
})

test('ambiguous substring fails', () => {
  const store = seedTwoOrgs()
  assert.throws(() => auth.requireUniqueMatch(store, 'org-'), /Ambiguous/)
})

test('PIB_ORG_ID cannot pick an org with no profile', () => {
  seedTwoOrgs()
  process.env.PIB_ORG_ID = 'org-missing'
  try {
    assert.throws(() => auth.resolveSession(auth.loadStore()), /No stored login for org org-missing/)
  } finally {
    resetEnv()
  }
})

test('PIB_ORG_ID selects the matching stored profile token', () => {
  seedTwoOrgs()
  process.env.PIB_ORG_ID = 'org-a'
  try {
    const session = auth.resolveSession(auth.loadStore())
    assert.equal(session.orgId, 'org-a')
    assert.equal(session.accessToken, 'pib_dlg_a')
    assert.equal(session.envOverride, false)
  } finally {
    resetEnv()
  }
})

test('removing one profile leaves the other', () => {
  const store = seedTwoOrgs()
  const next = auth.removeProfile(store, 'org-a')
  assert.equal(Object.keys(next.profiles).length, 1)
  assert.ok(next.profiles['org-b'])
  assert.equal(next.activeProfile, 'org-b')
})
