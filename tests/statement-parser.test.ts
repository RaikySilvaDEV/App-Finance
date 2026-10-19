import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement, moneyCents } from '../statement-parser.js';

test('money parsing preserves exact integer cents at high values', () => {
  assert.equal(moneyCents('999999999999.99', '.'), 99999999999999);
  assert.equal(moneyCents('-0,29', ','), -29);
  assert.throws(() => moneyCents('1000000000000.01', '.'));
});

export const ofx = (account = '123', amount = '-12.34', id = 'one') => `OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL<BANKACCTFROM><ACCTID>${account}</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>XFER<DTPOSTED>20261018120000[-3:BRT]<TRNAMT>${amount}<FITID>${id}<MEMO>Transferência &amp; PIX</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
test('OFX reads SGML, date, exact cents, ID and transfer without deriving a balance', () => {
  const result = parseStatement('bank.ofx', ofx());
  assert.equal(result.accountNumber, '123'); assert.equal(result.rows[0].date, '2026-10-18');
  assert.equal(result.rows[0].signedCents, -1234); assert.equal(result.rows[0].transfer, true);
  assert.equal(result.rows[0].description, 'Transferência & PIX'); assert.equal('balance' in result, false);
  assert.equal(result.rows[0].fingerprint, parseStatement('other.ofx', ofx('123', '-12.34')).rows[0].fingerprint);
});
test('CSV handles Brazilian decimals, BOM, quotes, embedded delimiter and newline', () => {
  const parsed = parseStatement('bank.csv', '\uFEFFdata;descricao;valor;id\r\n18/10/2026;"Mercado; \"\"Loja\"\"\nCentro";-1.234,56;a\r\n2026-10-19;Salário;2500,00;b');
  assert.equal(parsed.rows.length, 2); assert.equal(parsed.rows[0].signedCents, -123456);
  assert.equal(parsed.rows[1].signedCents, 250000);
});
test('CSV preserves two equal legitimate transactions and stable overlap fingerprints', () => {
  const header = 'data;descricao;valor\n', line = '18/10/2026;Café;-5,00\n';
  const rows = parseStatement('bank.csv', header + line + line).rows;
  assert.notEqual(rows[0].fingerprint, rows[1].fingerprint);
  assert.equal(rows[0].fingerprint, parseStatement('overlap.csv', header + line).rows[0].fingerprint);
});
test('invalid dates, ambiguous numbers, duplicate IDs, malformed and unsupported files fail closed', () => {
  for (const [name, content] of [
    ['a.csv', 'data;descricao;valor\n31/02/2026;Erro;5,00'],
    ['a.csv', 'data;descricao;valor\n18/10/2026;Erro;1.23'],
    ['a.csv', 'data;descricao;valor\n18/10/2026;"Erro;1,00'],
    ['a.csv', 'data;descricao;valor;id\n18/10/2026;A;1,00;x\n19/10/2026;B;1,00;x'],
    ['a.ofx', ofx().replace('<CURDEF>BRL', '<CURDEF>USD')],
    ['a.ofx', ofx().replace('</STMTTRN>', '')],
    ['a.pdf', 'PDF'], ['a.ofx', '<!DOCTYPE x>' + ofx()],
  ]) assert.throws(() => parseStatement(name, content), name);
});
