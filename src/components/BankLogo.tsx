import React from 'react';
const icons: Record<string, string> = { itau: 'itau', nubank: 'nubank', 'mercado pago': 'mercadopago', santander: 'santander', neon: 'neon' };
export function bankDisplayName(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/nubank|nu pagamentos|nu financeira/.test(normalized)) return 'Nubank';
  if (normalized.includes('itau')) return 'Itaú';
  if (normalized.includes('santander')) return 'Santander';
  if (normalized.includes('mercado pago')) return 'Mercado Pago';
  if (/\bneon\b/.test(normalized)) return 'Neon';
  return name;
}
export function BankLogo({ name, className = 'h-9 w-9' }: { name: string; className?: string }) {
  const normalized = bankDisplayName(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const bank = Object.keys(icons).find((key) => normalized.includes(key));
  return <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>{bank ? <img src={bank === 'neon' ? '/banks/neon-current.png' : `/banks/${icons[bank]}.svg`} alt={`Logo ${name}`} className="h-full w-full scale-110 object-contain" /> : <span aria-hidden="true" className="text-xs font-semibold text-slate-300">{name.slice(0, 2).toUpperCase()}</span>}</span>;
}
