// src/services/mockArtworks.js
const KEY = 'mock_artworks_v1';
const sleep = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const seed = [
  {
    id: 'a1',
    title: 'Composición en Azul',
    artist: 'L. Moretti',
    price: 4200,
    fractionFrom: 50,
    fractionsLeft: 120,
    fractionsTotal: 200,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
    tags: ['Abstracto', 'Acrílico'],
    rating: 4.8,
    createdAt: '2025-07-12',
    // sin status => "approved" por compat
  },
  {
    id: 'a2',
    title: 'Luz en el Taller',
    artist: 'M. Campos',
    price: 2700,
    fractionFrom: 30,
    fractionsLeft: 80,
    fractionsTotal: 150,
    image:
      'https://images.unsplash.com/photo-1474073705359-5da2a8270c64?q=80&w=1600&auto=format&fit=crop',
    tags: ['Realismo', 'Óleo'],
    rating: 4.6,
    createdAt: '2025-06-05',
  },
  {
    id: 'a3',
    title: 'Paisaje Onírico',
    artist: 'C. Navarro',
    price: 3600,
    fractionFrom: 40,
    fractionsLeft: 40,
    fractionsTotal: 100,
    image:
      'https://images.unsplash.com/photo-1465311440653-ba9b1d9b0f5b?q=80&w=1600&auto=format&fit=crop',
    tags: ['Paisaje', 'Mixta'],
    rating: 4.9,
    createdAt: '2025-05-22',
  },
  {
    id: 'a4',
    title: 'Rojo Vibrante',
    artist: 'A. Suárez',
    price: 1900,
    fractionFrom: 20,
    fractionsLeft: 15,
    fractionsTotal: 80,
    image:
      'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1600&auto=format&fit=crop',
    tags: ['Abstracto'],
    rating: 4.5,
    createdAt: '2025-08-01',
  },
  {
    id: 'a5',
    title: 'Ciudad Nocturna',
    artist: 'I. Duarte',
    price: 5400,
    fractionFrom: 60,
    fractionsLeft: 200,
    fractionsTotal: 500,
    image:
      'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop',
    tags: ['Urbano', 'Acrílico'],
    rating: 4.7,
    createdAt: '2025-07-28',
  },
  {
    id: 'a6',
    title: 'Trama Botánica',
    artist: 'F. Paredes',
    price: 2300,
    fractionFrom: 25,
    fractionsLeft: 60,
    fractionsTotal: 120,
    image:
      'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1600&auto=format&fit=crop',
    tags: ['Naturaleza'],
    rating: 4.6,
    createdAt: '2025-06-16',
  },
  {
    id: 'a7',
    title: 'Movimiento',
    artist: 'Y. Kato',
    price: 3100,
    fractionFrom: 35,
    fractionsLeft: 5,
    fractionsTotal: 60,
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
    tags: ['Minimal', 'Tinta'],
    rating: 4.8,
    createdAt: '2025-08-05',
  },
  {
    id: 'a8',
    title: 'Líneas de Agua',
    artist: 'N. Brizuela',
    price: 1500,
    fractionFrom: 15,
    fractionsLeft: 70,
    fractionsTotal: 120,
    image:
      'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop',
    tags: ['Geométrico'],
    rating: 4.4,
    createdAt: '2025-04-11',
  },
  {
    id: 'a9',
    title: 'Sol de Invierno',
    artist: 'P. Ibáñez',
    price: 2850,
    fractionFrom: 28,
    fractionsLeft: 110,
    fractionsTotal: 140,
    image:
      'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=1600&auto=format&fit=crop',
    tags: ['Impresionismo'],
    rating: 4.7,
    createdAt: '2025-07-02',
  },
  {
    id: 'a10',
    title: 'Cian y Carbón',
    artist: 'K. Rossi',
    price: 3900,
    fractionFrom: 45,
    fractionsLeft: 22,
    fractionsTotal: 90,
    image:
      'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1600&auto=format&fit=crop',
    tags: ['Mixta', 'Abstracto'],
    rating: 4.9,
    createdAt: '2025-08-10',
  },
];

const GALLERY_FALLBACK = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1465311440653-ba9b1d9b0f5b?q=80&w=1600&auto=format&fit=crop',
];

/* ---------------- Rating helpers ---------------- */
function calcAvg(by) {
  const vals = Object.values(by || {});
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, c) => a + c, 0) / vals.length) * 10) / 10;
}
function ensureRatings(obj) {
  if (!obj.ratings) {
    obj.ratings = { by: {}, count: 0, avg: Number(obj.rating || 0) || 0 };
  }
  obj.rating = obj.ratings.avg;
  return obj;
}
function saveList(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
/* ------------------------------------------------ */

function withDefaults(item) {
  const description =
    item.description?.trim() ||
    'Obra publicada por su artista. Pieza única/serie limitada. Técnica y medidas provistas por el autor.';
  const gallery =
    Array.isArray(item.gallery) && item.gallery.length
      ? item.gallery
      : [item.image, ...GALLERY_FALLBACK.slice(0, 2)];

  ensureRatings(item);
  return { ...item, description, gallery };
}

function seedIfEmpty() {
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, JSON.stringify(seed));
  }
}

/** Lista para el marketplace: solo obras aprobadas (excluye subastadas) */
export async function listArtworks({ q = '', sort = 'relevance' } = {}) {
  seedIfEmpty();
  await sleep();
  let items = JSON.parse(localStorage.getItem(KEY) || '[]');

  // Solo aprobadas visibles en marketplace (no 'auctioned')
  items = items.filter((x) => (x.status || 'approved') === 'approved');

  if (q) {
    const s = q.toLowerCase();
    items = items.filter(
      (x) =>
        x.title.toLowerCase().includes(s) ||
        x.artist.toLowerCase().includes(s) ||
        x.tags.join(' ').toLowerCase().includes(s)
    );
  }

  if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  else if (sort === 'newest')
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else items.sort((a, b) => (b.rating || 0) - (a.rating || 0)); // relevance

  return items.map(withDefaults);
}

/** Lista las obras del artista (todas: pendientes y aprobadas y subastadas) */
export async function listMyArtworks(user) {
  seedIfEmpty();
  await sleep(200);
  const me = user?.name || 'Artista Demo';
  let items = JSON.parse(localStorage.getItem(KEY) || '[]');
  items = items.filter((i) => i.artist === me);
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return items.map(withDefaults);
}

// --- crear obra ---
export async function createArtwork({
  title,
  description = '',
  artist,
  price,
  fractionFrom,
  fractionsTotal,
  image,
  tags = [],
  gallery = [],
}) {
  seedIfEmpty();
  await sleep(350);

  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const item = {
    id: `u${Date.now()}`,
    title: title?.trim() || 'Obra sin título',
    artist: artist || 'Artista Demo',
    description,
    price: Number(price) || 0,
    fractionFrom: Number(fractionFrom) || 0,
    fractionsTotal: Number(fractionsTotal) || 0,
    fractionsLeft: Number(fractionsTotal) || 0,
    image: image || GALLERY_FALLBACK[0],
    tags: tags.length ? tags : ['Mixta'],
    rating: 0,
    ratings: { by: {}, count: 0, avg: 0 },
    createdAt: new Date().toISOString().slice(0, 10),
    status: 'pending', // arranca pendiente
    gallery:
      Array.isArray(gallery) && gallery.length
        ? gallery
        : [image || GALLERY_FALLBACK[0], ...GALLERY_FALLBACK.slice(1, 3)],
  };

  list.unshift(item);
  saveList(list);
  return withDefaults(item);
}

// --- actualizar obra ---
export async function updateArtwork(id, updates = {}) {
  seedIfEmpty();
  await sleep(300);

  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Obra no encontrada');

  const prev = list[idx];
  // preservar fracciones vendidas
  const sold = (prev.fractionsTotal || 0) - (prev.fractionsLeft || 0);
  const nextTotal = Number(updates.fractionsTotal ?? prev.fractionsTotal) || 0;
  const nextLeft = Math.max(0, nextTotal - sold);

  const merged = {
    ...prev,
    ...updates,
    fractionsTotal: nextTotal,
    fractionsLeft: nextLeft,
    image: (updates.gallery && updates.gallery[0]) || updates.image || prev.image,
    tags: Array.isArray(updates.tags) ? updates.tags : prev.tags,
    gallery:
      Array.isArray(updates.gallery) && updates.gallery.length
        ? updates.gallery
        : prev.gallery?.length
        ? prev.gallery
        : [prev.image, ...GALLERY_FALLBACK.slice(0, 2)],
  };

  ensureRatings(merged);
  list[idx] = merged;
  saveList(list);
  return withDefaults(merged);
}

export async function getArtworkById(id) {
  seedIfEmpty();
  await sleep(250);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const found = list.find((i) => i.id === id);
  if (!found) throw new Error('Obra no encontrada');
  return withDefaults(found);
}

/* ---------------- VENTA DE FRACCIONES ---------------- */
export async function sellFractions(id, qty){
  seedIfEmpty();
  await sleep(120);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Obra no encontrada');

  const it = list[idx];
  const q = Math.max(1, Number(qty) || 1);
  if (q > Number(it.fractionsLeft || 0)) throw new Error('No hay suficientes fracciones disponibles.');
  it.fractionsLeft = Number(it.fractionsLeft || 0) - q;

  list[idx] = it;
  saveList(list);
  return withDefaults(it);
}

/* ---------------- Rating API pública ---------------- */
export async function getArtworkRating(artworkId, userId) {
  seedIfEmpty();
  await sleep(120);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const it = list.find((i) => i.id === artworkId);
  if (!it) throw new Error('Obra no encontrada');
  ensureRatings(it);
  const my = userId ? Number(it.ratings.by[userId] || 0) : 0;
  return { avg: it.ratings.avg, count: it.ratings.count, my };
}

export async function rateArtwork(artworkId, userId, value) {
  seedIfEmpty();
  await sleep(100);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = list.findIndex((i) => i.id === artworkId);
  if (idx === -1) throw new Error('Obra no encontrada');

  const it = list[idx];
  ensureRatings(it);

  const v = Math.min(5, Math.max(1, Number(value) || 0));
  if (!v || !userId) return withDefaults(it);

  it.ratings.by[userId] = v;
  it.ratings.count = Object.keys(it.ratings.by).length;
  it.ratings.avg = calcAvg(it.ratings.by);
  it.rating = it.ratings.avg;

  list[idx] = it;
  saveList(list);
  return withDefaults(it);
}

/* ---------------- Admin helpers ---------------- */
export async function listPendingArtworks() {
  seedIfEmpty();
  await sleep(200);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const pending = list.filter((it) => (it.status || 'approved') === 'pending');
  pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return pending.map(withDefaults);
}

export async function adminListArtworks({ status = 'pending', q = '' } = {}) {
  // status: 'pending' | 'approved' | 'auctioned' | 'all'
  seedIfEmpty();
  await sleep(200);
  let list = JSON.parse(localStorage.getItem(KEY) || '[]');

  if (status !== 'all') {
    list = list.filter((it) => {
      const st = it.status || 'approved';
      return st === status;
    });
  }

  if (q) {
    const s = q.toLowerCase();
    list = list.filter(
      (x) =>
        x.title.toLowerCase().includes(s) ||
        x.artist.toLowerCase().includes(s)
    );
  }

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list.map(withDefaults);
}

export async function setArtworkStatus(id, status) {
  const allowed = ['pending', 'approved']; // cerrar subasta usa closeAuction()
  if (!allowed.includes(status)) throw new Error('Estado inválido');

  seedIfEmpty();
  await sleep(150);

  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Obra no encontrada');

  list[idx].status = status;
  saveList(list);
  return withDefaults(list[idx]);
}

/* ==================== Subastas (admin) ==================== */
const todayISO = () => new Date().toISOString().slice(0,10);

/** Lista obras por categoría de subasta */
export async function listAuctions(filter = 'today') {
  // filter: 'today' | 'upcoming' | 'finished' | 'all'
  seedIfEmpty();
  await sleep(150);

  const t = todayISO();
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');

  const isApproved = (it) => (it.status || 'approved') === 'approved';
  const isAuctioned = (it) => it.status === 'auctioned';
  const date = (it) => String(it.auctionDate || '');

  let out = list;
  if (filter === 'today') {
    out = list.filter((it) => isApproved(it) && date(it) === t);
  } else if (filter === 'upcoming') {
    out = list.filter((it) => isApproved(it) && date(it) > t);
  } else if (filter === 'finished') {
    out = list.filter((it) => isAuctioned(it));
  }

  // orden útil: por fecha asc, y las finalizadas por soldAt desc
  if (filter === 'finished') {
    out.sort((a,b)=> new Date(b.auction?.soldAt || b.createdAt) - new Date(a.auction?.soldAt || a.createdAt));
  } else {
    out.sort((a,b)=> String(a.auctionDate||'') > String(b.auctionDate||'') ? 1 : -1);
  }

  return out.map(withDefaults);
}

export async function getAuctionById(id) {
  return getArtworkById(id); // alias semántico
}

/** Cierra una subasta, guarda ganador y marca como subastada */
export async function closeAuction(id, { winnerName, winnerDni, finalPrice }) {
  seedIfEmpty();
  await sleep(180);

  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Obra no encontrada');

  const it = list[idx];

  // ✅ Validación: no permitir cerrar antes de la fecha de subasta
  const auctionDate = String(it.auctionDate || '');
  if (!auctionDate) {
    throw new Error('La obra no tiene fecha de subasta asignada.');
  }
  const today = todayISO();
  if (today < auctionDate) {
    throw new Error(`La subasta solo puede cerrarse el día ${auctionDate}.`);
  }

  list[idx] = {
    ...it,
    status: 'auctioned',
    auction: {
      winnerName: (winnerName || '').trim(),
      winnerDni: (winnerDni || '').trim(),
      finalPrice: Number(finalPrice) || 0,
      soldAt: new Date().toISOString(),
    },
  };

  saveList(list);
  return withDefaults(list[idx]);
}
