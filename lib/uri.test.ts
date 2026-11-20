import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalUri, sameResource } from './uri.ts';

const encoded = 'content://org.telegram.gold.provider/media/Android/data/org.telegram.gold/files/Telegram/Telegram%20Files/%D9%82%D8%B3%D9%85%20%D8%A7%D9%84%D8%AA%D8%AE%D8%AF%D9%8A%D8%B1.pdf';
const decoded = 'content://org.telegram.gold.provider/media/Android/data/org.telegram.gold/files/Telegram/Telegram Files/قسم التخدير.pdf';

test('a decoded URI (spaces, Arabic) is restored to the exact string the provider granted', () => {
  assert.equal(canonicalUri(decoded), encoded);
});

test('an already encoded URI is unchanged', () => {
  assert.equal(canonicalUri(encoded), encoded);
});

test('characters Android leaves bare stay bare; others are encoded', () => {
  assert.equal(canonicalUri('content://a.b/files/My (1) file\'s_v2-final.pdf'), "content://a.b/files/My%20(1)%20file's_v2-final.pdf");
  assert.equal(canonicalUri('content://a.b/files/a&b+c=d.pdf'), 'content://a.b/files/a%26b%2Bc%3Dd.pdf');
});

test('query strings, odd input and non-URIs are left alone', () => {
  assert.equal(canonicalUri('content://a.b/x/y.pdf?id=1'), 'content://a.b/x/y.pdf?id=1');
  assert.equal(canonicalUri('not a uri'), 'not a uri');
  assert.equal(canonicalUri('content://a.b/100%.pdf'), 'content://a.b/100%.pdf'); // stray % cannot be decoded: kept
});

test('sameResource ignores encoding differences only', () => {
  assert.equal(sameResource(encoded, decoded), true);
  assert.equal(sameResource(encoded, encoded.replace('Telegram%20Files', 'Other')), false);
});
