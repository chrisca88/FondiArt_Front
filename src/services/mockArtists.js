// src/services/mockArtists.js
import { listArtworks } from './mockArtworks.js'

const KEY = 'mock_artists_v1'
const sleep = (ms=120)=> new Promise(r=>setTimeout(r,ms))

export function slugify(s=''){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}

function readProfiles(){
  return JSON.parse(localStorage.getItem(KEY) || '{}')
}
function writeProfiles(map){
  localStorage.setItem(KEY, JSON.stringify(map))
}

/** Lista artistas (derivados de obras aprobadas) + merge con perfiles */
export async function listArtists(){
  await sleep()
  const works = await listArtworks({})
  const byArtist = new Map()

  works.forEach(w=>{
    const slug = slugify(w.artist)
    if (!byArtist.has(slug)){
      byArtist.set(slug, {
        slug,
        name: w.artist,
        samples: [w.image],
        cover: w.image,
        totalWorks: 1
      })
    }else{
      const a = byArtist.get(slug)
      if (a.samples.length < 3) a.samples.push(w.image)
      a.totalWorks += 1
    }
  })

  const profiles = readProfiles()
  return Array.from(byArtist.values()).map(a=>{
    const p = profiles[a.slug] || {}
    return {
      ...a,
      avatar: p.avatar || '',
      bio: p.bio || '',
      socials: p.socials || {},
    }
  })
}

/** Perfil del artista + sus obras (aprobadas) */
export async function getArtistProfile(slug){
  await sleep()
  const list = await listArtists()
  const base = list.find(a=>a.slug === slug)

  const works = (await listArtworks({})).filter(w => slugify(w.artist) === slug)
  return {
    slug,
    name: base?.name || (works[0]?.artist || 'Artista'),
    avatar: base?.avatar || '',
    bio: base?.bio || '',
    socials: base?.socials || {},
    works, // todas aprobadas
  }
}

/** (Opcional) Actualizar avatar/bio/redes del artista en el mock */
export async function upsertArtistProfile(slug, data){
  await sleep(80)
  const map = readProfiles()
  map[slug] = { ...(map[slug] || {}), ...data }
  writeProfiles(map)
  return map[slug]
}
