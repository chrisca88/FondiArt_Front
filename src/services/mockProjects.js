// src/services/mockProjects.js
// Mock simple para proyectos de artistas con donaciones

const KEY = 'mock_projects_v1';
const sleep = (ms = 150) => new Promise(r => setTimeout(r, ms));

const fallbackImgs = [
  'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
];

function slugifyName(name = '') {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

// --- Seed inicial -----------------------------------------------------------
function seedIfEmpty() {
  const list = load();
  if (list.length) return;

  const seed = [
    {
      id: 'prj-1',
      artistSlug: 'c-navarro',
      artistName: 'C. Navarro',
      ownerId: 'u-artist', // este sí pertenece al artista demo logueable
      title: 'Serie “Montañas de Luz”',
      description: 'Colección de 6 piezas de gran formato inspiradas en paisajes oníricos. Busco financiar materiales y alquiler de estudio por 3 meses.',
      cover: fallbackImgs[2],
      goalARS: 250000,
      raisedARS: 65000,
      backers: 12,
      status: 'active',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    },
    {
      id: 'prj-2',
      artistSlug: 'l-moretti',
      artistName: 'L. Moretti',
      // importante: NO usar el mismo ownerId del artista demo
      ownerId: 'owner-l-moretti',
      title: 'Libro-objeto “Azules”',
      description: 'Edición de arte de 50 ejemplares, con serigrafías y poemas. Fondos destinados a impresión y encuadernación.',
      cover: fallbackImgs[0],
      goalARS: 180000,
      raisedARS: 42000,
      backers: 9,
      status: 'active',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25,
    },
  ];
  save(seed);
}

/**
 * Migración suave para instalaciones previas:
 * - Si hay proyectos con ownerId 'u-artist' pero artistSlug !== 'c-navarro',
 *   reasigna el ownerId a 'owner-<artistSlug>' para que no aparezcan en
 *   "Mis proyectos" del artista demo.
 * - Si algún proyecto no tiene ownerId, lo deriva del slug.
 */
function migrateOwners() {
  const list = load();
  let changed = false;

  for (const p of list) {
    if (!p.ownerId) {
      p.ownerId = p.artistSlug ? `owner-${p.artistSlug}` : 'owner-unknown';
      changed = true;
    } else if (p.ownerId === 'u-artist' && p.artistSlug && p.artistSlug !== 'c-navarro') {
      p.ownerId = `owner-${p.artistSlug}`;
      changed = true;
    }
  }

  if (changed) save(list);
}

function ensureSeedAndMigrate() {
  seedIfEmpty();
  migrateOwners();
}

/* ================== API pública ================== */

export async function listByArtist(artistSlug) {
  ensureSeedAndMigrate();
  await sleep();
  return load()
    .filter(p => p.artistSlug === artistSlug && p.status !== 'archived')
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Listar por dueño (artista autenticado) */
export async function listByOwner(ownerId) {
  ensureSeedAndMigrate();
  await sleep();
  return load()
    .filter(p => p.ownerId === ownerId && p.status !== 'archived')
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getById(id) {
  ensureSeedAndMigrate();
  await sleep();
  const it = load().find(p => p.id === id);
  if (!it) throw new Error('Proyecto no encontrado');
  return it;
}

export async function createProject({ user, title, description, cover, goalARS }) {
  ensureSeedAndMigrate();
  await sleep(200);

  const list = load();
  const artistName = user?.name || 'Artista';
  const artistSlug = slugifyName(artistName);

  const item = {
    id: 'prj-' + Date.now(),
    artistSlug,
    artistName,
    ownerId: user?.id || null, // dueño real: el usuario autenticado
    title: (title || 'Proyecto sin título').trim(),
    description: (description || '').trim(),
    cover: cover || fallbackImgs[Math.floor(Math.random()*fallbackImgs.length)],
    goalARS: Number(goalARS) || 0,
    raisedARS: 0,
    backers: 0,
    status: 'active',
    createdAt: Date.now(),
  };

  list.unshift(item);
  save(list);
  return item;
}

export async function updateProject(id, updates = {}) {
  ensureSeedAndMigrate();
  await sleep(160);

  const list = load();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Proyecto no encontrado');

  const merged = { ...list[idx], ...updates };
  list[idx] = merged;
  save(list);
  return merged;
}

export async function addDonation(projectId, amount) {
  ensureSeedAndMigrate();
  await sleep(120);
  const list = load();
  const idx = list.findIndex(p => p.id === projectId);
  if (idx === -1) throw new Error('Proyecto no encontrado');

  list[idx].raisedARS = Math.round((Number(list[idx].raisedARS || 0) + Number(amount || 0)) * 100) / 100;
  list[idx].backers = Number(list[idx].backers || 0) + 1;
  save(list);
  return list[idx];
}

/** Archivar proyecto */
export async function archiveProject(id) {
  return updateProject(id, { status: 'archived' });
}
