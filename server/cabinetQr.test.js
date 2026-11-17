const test = require('node:test');
const assert = require('node:assert/strict');
const { createCabinetQr, parseCabinetQr, verifyCabinetQrSignature } = require('./cabinetQr');

const secret = 'test-only-secret-for-qr-signing';
const fields = { reservationId: 42, slotNo: 3, date: '2026-11-15', time: '19:30', userId: 7 };

test('creates and parses a signed QR for a reservation', () => {
  const code = createCabinetQr(fields, secret);
  const parsed = parseCabinetQr(code);
  assert.deepEqual({ ...parsed, signature: undefined }, { ...fields, signature: undefined });
  assert.equal(verifyCabinetQrSignature(parsed, secret), true);
});

test('rejects manual IDs, altered fields, invalid dates and unsupported slots', () => {
  for (const value of [
    '42', '#42', 'SHSRS|R42|S13|2026-11-15|19:30|7|H' + 'a'.repeat(64),
    'SHSRS|R42|S3|2026-02-30|19:30|7|H' + 'a'.repeat(64),
    'SHSRS|R42|S3|2026-11-15|25:30|7|H' + 'a'.repeat(64),
    'SHSRS|R42|S3|2026-11-15|19:30|0|H' + 'a'.repeat(64),
    'SHSRS|R42|S3|2026-11-15|19:30|7|extra',
  ]) assert.equal(parseCabinetQr(value), null, value);
});

test('signature verification rejects tampering and wrong secrets', () => {
  const code = createCabinetQr(fields, secret);
  const parsed = parseCabinetQr(code);
  assert.equal(verifyCabinetQrSignature(parsed, 'wrong-secret'), false);
  const alteredPayload = code.replace('|S3|', '|S4|');
  const tampered = parseCabinetQr(alteredPayload);
  assert.ok(tampered);
  assert.equal(verifyCabinetQrSignature(tampered, secret), false);
});
