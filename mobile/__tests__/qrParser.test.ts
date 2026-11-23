import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTableQrToken } from '../src/utils/qrParser.ts';

test('parseTableQrToken parses direct TBL- tokens', () => {
  const res = parseTableQrToken('TBL-TABLE1');
  assert.equal(res.valid, true);
  assert.equal(res.qrToken, 'TBL-TABLE1');
});

test('parseTableQrToken extracts token and network IP from URLs', () => {
  const networkUrl = parseTableQrToken('http://192.168.1.128:5173/table/TBL-A1B2');
  assert.equal(networkUrl.valid, true);
  assert.equal(networkUrl.qrToken, 'TBL-A1B2');
  assert.equal(networkUrl.host, '192.168.1.128');
  assert.equal(networkUrl.networkApiUrl, 'http://192.168.1.128:3000/api/v1');

  const webUrl = parseTableQrToken('https://myrestaurant.tn/table/TBL-ABC123');
  assert.equal(webUrl.valid, true);
  assert.equal(webUrl.qrToken, 'TBL-ABC123');
});

test('parseTableQrToken parses simple table numbers', () => {
  const res = parseTableQrToken('3');
  assert.equal(res.valid, true);
  assert.equal(res.qrToken, '3');
});

test('parseTableQrToken rejects invalid QR formats', () => {
  const invalid = parseTableQrToken('https://google.com');
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  const empty = parseTableQrToken('');
  assert.equal(empty.valid, false);
});
