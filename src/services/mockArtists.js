// src/services/mockArtists.js
// Fuente única de artistas para Donaciones y perfil de artista.

import { listArtworks } from './mockArtworks.js';

const USERS_KEY = 'mock_users_v2';
const sleep = (ms = 120) => new Promise(r => setTimeout(r, ms));

// util
function slugify(s = '') {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

/**
 * Devuelve TODOS los usuarios con rol `artist` que existan en la plataforma,
 * incluyendo “Artista Demo”, y les agrega samples de obras (si tienen).
 * Estructura esperada por Donations.jsx:
 *   { slug, name, avatar, totalWorks, samples: string[] }
 */
export async function listArtists() {
  await sleep();

  const users = readUsers().filter(u => String(u.role) === 'artist');
  // Obras aprobadas (o las que tu mock devuelva)
  const works = await listArtworks({});

  // Mapear artistas con sus obras
  const items = users.map(u => {
    const name = u.name || u.email || 'Artista';
    const myWorks = works.filter(w => (w.artist || '').trim() === name.trim());
    const samples = myWorks.slice(0, 3).map(w => w.image).filter(Boolean);

    // Fallbacks visuales si el artista aún no tiene obras aprobadas
    const fallback = [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1465311440653-ba9b1d9b0f5b?q=80&w=800&auto=format&fit=crop',
    ];

    return {
      slug: slugify(name),
      name,
      avatar: u.avatar || u.avatarUrl || '',
      totalWorks: myWorks.length,
      samples: samples.length ? samples : fallback,
    };
  });

  // Orden alfabético por nombre
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Perfil de artista para la vista de donación.
 * Estructura usada por ArtistDonate.jsx:
 *   { name, avatar, bio, socials, works: [{id,title,image}] }
 */
export async function getArtistProfile(slug) {
  await sleep();

  const users = readUsers().filter(u => String(u.role) === 'artist');
  // Buscar por slug de nombre (o por email como fallback)
  const candidate = users.find(u => slugify(u.name || u.email) === slug);

  const name = candidate?.name || candidate?.email || slug.replace(/-/g, ' ');
  const avatar = candidate?.avatar || candidate?.avatarUrl || '';
  const bio = candidate?.bio || '';

  const worksAll = await listArtworks({});
  const works = worksAll
    .filter(w => (w.artist || '').trim() === String(name).trim())
    .map(w => ({ id: w.id, title: w.title, image: w.image }));

  return {
    name,
    avatar,
    bio,
    socials: { website: candidate?.website || '' },
    works,
  };
}
