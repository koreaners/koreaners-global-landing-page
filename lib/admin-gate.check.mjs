// 어드민 역할 게이트 점검: node lib/admin-gate.check.mjs
import assert from 'node:assert/strict'
import { gate, HOME } from './admin-gate.ts'

const DENY = '/admin/login?denied=1'
const PATHS = ['/admin', '/admin/finance', '/admin/payouts', '/admin/reports', '/admin/attendance', '/admin/finance/x', '/admin/financex']

for (const p of PATHS) assert.equal(gate('admin', p), null)

// receivables: 재무 페이지 하나만. 나머지는 전부 미수 탭으로
for (const p of PATHS) assert.equal(gate('receivables', p, true), p === '/admin/finance' ? null : HOME.receivables, p)
assert.equal(gate('receivables', new URL(HOME.receivables, 'http://x').pathname), null) // 보낸 곳이 다시 막히면 무한 리다이렉트

// exec: 기존 동작 그대로
assert.equal(gate('exec', '/admin/finance'), null)
assert.equal(gate('exec', '/admin/reports'), null)
assert.equal(gate('exec', '/admin/payouts'), HOME.exec)
assert.equal(gate('exec', '/admin'), HOME.exec)
assert.equal(gate('exec', '/admin/attendance'), HOME.exec)
assert.equal(gate('exec', '/admin/attendance', true), null)

// 모르는 역할, 미설정, 객체 기본 속성 이름은 전부 거부
for (const r of [undefined, '', 'creator', 'constructor', 'toString', 'Admin']) for (const p of PATHS) assert.equal(gate(r, p, true), DENY, `${r} ${p}`)
for (const r of ['constructor', 'toString', '__proto__']) assert.equal(Object.hasOwn(HOME, r), false)

console.log('admin-gate ok')
