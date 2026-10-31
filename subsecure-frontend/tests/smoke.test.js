import test from 'node:test'
import assert from 'node:assert/strict'
import { formatINR, toNumber } from '../src/utils/currency.js'

test('currency utilities provide stable frontend formatting', () => {
  assert.equal(formatINR(620583), '₹6,20,583')
  assert.equal(toNumber('12.50'), 12.5)
  assert.equal(toNumber('not-a-number', 0), 0)
})
