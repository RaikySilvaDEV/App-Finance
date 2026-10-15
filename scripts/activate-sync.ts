import 'dotenv/config';
import { activatePluggySync, syncItem } from '../sync.js';
import { financeStorage } from '../auth.js';

// Run only after the public deployment contains /api/integrations/pluggy.
// Secret headers are saved to the database and Pluggy, never printed.
await activatePluggySync();
console.log('Notificações da Pluggy ativadas.');
await financeStorage.ensure();
const users = financeStorage.sql ? await financeStorage.sql`SELECT id,state FROM users` : financeStorage.local().prepare('SELECT id,state FROM users').all();
let saved = 0, failed = 0;
for (const user of users as any[]) {
  for (const itemId of JSON.parse(user.state || '{}').itemIds || []) {
    try { await syncItem(user.id, itemId); saved++; }
    catch { failed++; }
  }
}
console.log(`Sincronização inicial: ${saved} conexões salvas; ${failed} indisponíveis.`);
if (failed) process.exitCode = 1;
