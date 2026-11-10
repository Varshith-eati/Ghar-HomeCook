import { handleKitchen } from './kitchens.mjs';

const roles = new Set(['customer', 'cook']);
const localities = ['Koramangala', 'HSR Layout', 'Indiranagar', 'BTM Layout'];
const diets = ['No preference', 'Vegetarian', 'Vegan', 'Jain', 'High protein', 'Non-vegetarian'];
const mealPreferences = ['lunch', 'dinner', 'both'];

function reply(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function identity(request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!id || !email) return null;
  let name = request.headers.get('oai-authenticated-user-full-name') || '';
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(name); } catch { name = ''; }
  }
  return { id, email, name };
}

function field(value, label, limit, required = true) {
  if (typeof value !== 'string' || value.trim().length > limit || (required && !value.trim())) {
    throw new Error('Please check ' + label + '.');
  }
  return value.trim();
}

function choice(value, options, label) {
  if (!options.includes(value)) throw new Error('Choose a valid ' + label + '.');
  return value;
}

function validate(role, input) {
  const name = field(input.name, 'your name', 70);
  if (role === 'customer') {
    return {
      name,
      locality: choice(input.locality, localities, 'delivery area'),
      diet: choice(input.diet, diets, 'dietary preference'),
      timing: choice(input.timing, mealPreferences, 'meal preference')
    };
  }
  if (!Array.isArray(input.areas) || !input.areas.length || input.areas.some(area => !localities.includes(area))) {
    throw new Error('Select at least one valid service area.');
  }
  return {
    name,
    kitchen: field(input.kitchen, 'your kitchen name', 80),
    cuisine: field(input.cuisine, 'your signature cuisine', 70),
    bio: field(input.bio, 'your kitchen introduction', 300, false),
    areas: [...new Set(input.areas)]
  };
}

export async function handleAccount(request, env) {
  const url = new URL(request.url);
  const user = identity(request);
  if (!user) return reply({ error: 'Please sign in to continue.' }, 401);
  if (url.pathname === '/api/kitchens' || url.pathname.startsWith('/api/menu-photos/')) return handleKitchen(request, env, user);
  if (url.pathname === '/api/account' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT role, details, revision FROM ghar_profiles WHERE user_id = ?'
    ).bind(user.id).all();
    const profiles = {};
    for (const row of results) profiles[row.role] = { ...JSON.parse(row.details), revision: row.revision };
    return reply({ user, profiles });
  }
  const role = url.pathname.split('/').pop();
  if (url.pathname !== '/api/profile/' + role || !roles.has(role)) return reply({ error: 'Unknown profile.' }, 404);
  if (request.method !== 'PUT') return reply({ error: 'Use PUT to save a profile.' }, 405);
  if (request.headers.get('origin') !== url.origin) return reply({ error: 'Save from this site.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply({ error: 'Expected a JSON profile.' }, 415);
  if (Number(request.headers.get('content-length')) > 8192) return reply({ error: 'Profile is too large.' }, 413);
  const body = await request.text();
  if (body.length > 8192) return reply({ error: 'Profile is too large.' }, 413);
  let profile, revision;
  try {
    const input = JSON.parse(body);
    revision = input.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Reload your profile and try again.');
    profile = validate(role, input);
  } catch (error) {
    return reply({ error: error instanceof SyntaxError ? 'Invalid profile data.' : error.message }, 400);
  }
  const sql = revision === 0
    ? 'INSERT INTO ghar_profiles (user_id, role, details, revision) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, role) DO NOTHING'
    : 'UPDATE ghar_profiles SET details = ?, revision = revision + 1 WHERE user_id = ? AND role = ? AND revision = ?';
  const details = JSON.stringify(profile);
  const params = revision === 0 ? [user.id, role, details] : [details, user.id, role, revision];
  const result = await env.DB.prepare(sql).bind(...params).run();
  if (result.meta.changes !== 1) return reply({ error: 'This profile changed in another tab. Reload to see the latest version.' }, 409);
  return reply({ profile: { ...profile, revision: revision + 1 } });
}
