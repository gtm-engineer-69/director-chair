import { lib } from '../../lib/data.mjs';
export const GET = () => new Response(JSON.stringify(lib), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
