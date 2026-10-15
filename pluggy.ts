import 'dotenv/config';
let pluggyApiKey: { value: string; expiresAt: number } | null = null;

async function getPluggyApiKey(): Promise<string> {
  if (pluggyApiKey && pluggyApiKey.expiresAt > Date.now()) return pluggyApiKey.value;

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.');
  }

  const response = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!response.ok) throw new Error(`Falha de autenticação Pluggy (HTTP ${response.status}).`);

  const data = await response.json() as { apiKey?: string };
  if (!data.apiKey) throw new Error('A Pluggy não retornou uma chave de API válida.');
  pluggyApiKey = { value: data.apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return data.apiKey;
}

export async function pluggyRequest(pathname: string, options: RequestInit = {}): Promise<any> {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(`https://api.pluggy.ai${pathname}`, {
    ...options, signal: AbortSignal.timeout(25000), headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json', 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`A Pluggy respondeu HTTP ${response.status}.`);
  return response.json();
}

