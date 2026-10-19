import { createHash } from 'node:crypto';

export type StatementRow = { date: string; description: string; signedCents: number; externalId?: string; transfer: boolean; fingerprint: string };
export type ParsedStatement = { rows: StatementRow[]; accountNumber?: string; currency: string; warnings: string[] };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

function day(value: string) {
  let s = value.trim(), match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) s = `${match[3]}-${match[2]}-${match[1]}`;
  else if (/^\d{8}(?:\d{6}(?:\.\d+)?(?:\[[^\]]+\])?)?$/.test(s)) s = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(`${s}T12:00:00Z`)) || new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) !== s) throw new Error(`Data inválida: ${value.slice(0, 30)}.`);
  return s;
}

export function moneyCents(value: string, decimal: '.' | ',') {
  const s = value.trim().replace(/^R\$\s*/, '');
  const pattern = decimal === ',' ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/ : /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;
  if (!pattern.test(s)) throw new Error(`Valor inválido: ${value.slice(0, 30)}. Confira o separador decimal.`);
  const normalized = decimal === ',' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const [whole, fraction = ''] = normalized.replace(/^-/, '').split('.');
  const cents = (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (normalized.startsWith('-') ? -1 : 1);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 1e14) throw new Error('Valor fora do limite.');
  return cents;
}

// Quoted CSV fields may contain delimiters, escaped quotes and newlines.
function csv(text: string, delimiter: string) {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; } else field += c;
    } else if (c === delimiter || c === '\n' || c === '\r') {
      row.push(field); field = ''; closed = false;
      if (c !== delimiter) { if (row.some((v) => v.trim())) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"' && !field && !closed) quoted = true;
    else { if (closed || c === '"') throw new Error('CSV com aspas inválidas.'); field += c; }
  }
  if (quoted) throw new Error('CSV com campo entre aspas incompleto.');
  row.push(field); if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const tag = (s: string, name: string) => decode(s.match(new RegExp(`<${name}>\\s*([^<\\r\\n]*)`, 'i'))?.[1]?.trim() || '');

export function parseStatement(filename: string, content: string, options: { delimiter?: string; decimal?: string } = {}): ParsedStatement {
  if (typeof content !== 'string' || !content.trim() || Buffer.byteLength(content) > 1024 * 1024 || content.includes('\0')) throw new Error('Envie um arquivo de texto OFX ou CSV de até 1 MB.');
  content = content.replace(/^\uFEFF/, '');
  const raw: Omit<StatementRow, 'fingerprint'>[] = [], warnings: string[] = [];
  let accountNumber: string | undefined, currency = 'BRL';
  if (/\.ofx$/i.test(filename)) {
    if (!/<OFX[>\s]/i.test(content) || /<!DOCTYPE|<!ENTITY/i.test(content)) throw new Error('OFX inválido ou com declarações não permitidas.');
    currency = tag(content, 'CURDEF').toUpperCase();
    if (currency !== 'BRL') throw new Error('Nesta versão, importe somente extratos em BRL.');
    if ((content.match(/<STMTRS>/gi) || []).length !== 1 || /<CCSTMTRS>/i.test(content)) throw new Error('Use um OFX de uma única conta bancária, não de cartão.');
    accountNumber = tag(content, 'ACCTID');
    const blocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
    if ((content.match(/<STMTTRN>/gi) || []).length !== blocks.length) throw new Error('OFX com movimentação incompleta.');
    for (const [, block] of blocks) {
      const description = [tag(block, 'NAME'), tag(block, 'MEMO')].filter(Boolean).join(' — ');
      const externalId = tag(block, 'FITID');
      if (!externalId || externalId.length > 200) throw new Error('OFX sem identificador FITID válido.');
      raw.push({ date: day(tag(block, 'DTPOSTED')), description, signedCents: moneyCents(tag(block, 'TRNAMT'), '.'), externalId, transfer: tag(block, 'TRNTYPE').toUpperCase() === 'XFER' });
    }
  } else if (/\.csv$/i.test(filename)) {
    const delimiter = options.delimiter || ';', decimal = options.decimal || ',';
    if (![',', ';', '\t'].includes(delimiter) || ![',', '.'].includes(decimal)) throw new Error('Formato CSV inválido.');
    const table = csv(content, delimiter), header = table.shift()?.map(normalized) || [];
    const find = (aliases: string[]) => header.findIndex((h) => aliases.includes(h));
    const date = find(['data', 'date', 'data lancamento']), description = find(['descricao', 'description', 'historico', 'memo']), amount = find(['valor', 'amount']), id = find(['id', 'fitid', 'identificador']);
    if ([date, description, amount].some((v) => v < 0) || new Set(header).size !== header.length) throw new Error('CSV precisa de cabeçalhos únicos: data, descricao e valor. ID é opcional. Selecione o separador correto.');
    for (const [i, row] of table.entries()) {
      if (row.length !== header.length) throw new Error(`Linha ${i + 2}: quantidade de colunas diferente do cabeçalho.`);
      try { raw.push({ date: day(row[date]), description: row[description].trim(), signedCents: moneyCents(row[amount], decimal as '.' | ','), ...(id >= 0 && row[id].trim() ? { externalId: row[id].trim() } : {}), transfer: false }); }
      catch (error) { throw new Error(`Linha ${i + 2}: ${(error as Error).message}`); }
    }
    if (raw.some((row) => !row.externalId)) warnings.push('CSV sem ID: duplicatas são estimadas por data, descrição, valor e ocorrência. Confira lançamentos iguais e use sempre o mesmo formato de arquivo para esta conta.');
  } else throw new Error('Formato não suportado. Use OFX ou CSV; PDF e Excel ainda não estão disponíveis.');
  if (!raw.length || raw.length > 2000) throw new Error('O arquivo deve conter entre 1 e 2.000 movimentações.');
  const occurrences = new Map<string, number>(), ids = new Map<string, string>();
  const rows = raw.map((row) => {
    if (!row.description || row.description.length > 2000 || (row.externalId?.length || 0) > 200) throw new Error('Movimentação sem descrição ou com texto muito longo.');
    const signature = JSON.stringify([row.date, normalized(row.description), row.signedCents]);
    const occurrence = (occurrences.get(signature) || 0) + 1; occurrences.set(signature, occurrence);
    if (row.externalId && ids.has(row.externalId)) throw new Error('Identificador repetido no arquivo. Confira o extrato antes de importar.');
    if (row.externalId) ids.set(row.externalId, signature);
    return { ...row, transfer: row.transfer || /pix|transfer|\bted\b|\bdoc\b/i.test(normalized(row.description)), fingerprint: hash(row.externalId ? `id:${row.externalId}` : `${signature}:${occurrence}`) };
  });
  return { rows, accountNumber, currency, warnings };
}
