// src/services/mockWallet.js
import { listArtworks, getArtworkById, sellFractions, setArtworkStatus } from './mockArtworks.js'


const PREFIX = 'mock_wallet_v1_'
const sleep = (ms = 300) => new Promise(r => setTimeout(r, ms))

function key(userId){ return `${PREFIX}${userId || 'anon'}` }
function donationsKey(userId){ return `${PREFIX}${userId || 'anon'}_donations` }

function seedIfEmpty(userId){
  const k = key(userId)
  if (!localStorage.getItem(k)){
    // Semilla simple: 100.000 ARS, sin posiciones y sin directas
    const w = { cashARS: 100000, positions: {}, ownedDirect: {} } // ownedDirect: { [artworkId]: true }
    localStorage.setItem(k, JSON.stringify(w))
  }
  if (!localStorage.getItem(donationsKey(userId))){
    localStorage.setItem(donationsKey(userId), JSON.stringify([]))
  }
}

export async function getWallet(userId){
  seedIfEmpty(userId)
  await sleep(120)
  // ensure shape para wallets viejas
  const w = JSON.parse(localStorage.getItem(key(userId)) || '{"cashARS":0,"positions":{}}')
  if (!w.ownedDirect) w.ownedDirect = {}
  if (!w.positions)   w.positions   = {}
  return w
}

export async function setWallet(userId, wallet){
  // normaliza forma antes de guardar
  const w = { cashARS: 0, positions: {}, ownedDirect: {}, ...wallet }
  await sleep(80)
  localStorage.setItem(key(userId), JSON.stringify(w))
  return w
}

/**
 * Devuelve el "portfolio" uniendo posiciones con obras aprobadas.
 * - tokens fraccionados (positions)
 * - obras directas (ownedDirect) como qty=1 y price = directPrice|price
 */
export async function getPortfolio(user){
  const uid = user?.id || 'anon'
  const w = await getWallet(uid)
  const approved = await listArtworks({}) // solo aprobadas

  // ---- Tokens (fraccionadas) ----
  const tokens = approved.map(a => {
    const symbol = `TK-${String(a.id).slice(-4).toUpperCase()}`
    const price = Number(a.fractionFrom || 0)
    const qty = Number(w.positions?.[a.id] || 0)
    const valueARS = Math.round(qty * price * 100) / 100
    return {
      artworkId: a.id,
      title: a.title,
      symbol,
      price,
      qty,
      valueARS,
      image: a.image,
    }
  })

  // ---- Obras directas ----
  const directs = approved
    .filter(a => a.directSale && w.ownedDirect?.[a.id])
    .map(a => {
      const symbol = `ART-${String(a.id).slice(-4).toUpperCase()}`
      const price = Number(a.directPrice ?? a.price ?? 0)
      const qty = 1
      const valueARS = price
      return {
        artworkId: a.id,
        title: a.title,
        symbol,
        price,
        qty,
        valueARS,
        image: a.image,
      }
    })

  const allItems = [...tokens, ...directs]
  const totalTokens = allItems.reduce((acc, t) => acc + (t.valueARS || 0), 0)
  const balanceARS = Math.round((Number(w.cashARS || 0) + totalTokens) * 100) / 100

  return {
    balanceARS,
    cashARS: Number(w.cashARS || 0),
    items: allItems,
  }
}

/** (Demo) Suma una compra ficticia a la wallet del usuario */
export async function demoBuy(user, artworkId, qty){
  const uid = user?.id || 'anon'
  const w = await getWallet(uid)
  w.positions = w.positions || {}
  w.positions[artworkId] = Number(w.positions[artworkId] || 0) + Number(qty || 0)
  return setWallet(uid, w)
}

/* ===================== COMPRAS REALES (mock) ===================== */
/**
 * Compra `qty` fracciones de una obra (tokenizada)
 */
export async function buyFractions(user, artworkId, qty){
  const uid = user?.id || 'anon'
  seedIfEmpty(uid)

  const q = Math.max(1, Number(qty) || 0)
  const w = await getWallet(uid)
  const art = await getArtworkById(artworkId)
  const unit = Number(art.fractionFrom || 0)
  const total = Math.round(unit * q * 100) / 100

  if (!unit) throw new Error('La obra no tiene precio de fracción válido.')
  if (q > Number(art.fractionsLeft || 0)) throw new Error('No hay suficientes fracciones disponibles.')
  if (Number(w.cashARS || 0) < total) throw new Error('Fondos insuficientes en tu wallet.')

  // 1) Descontar efectivo y sumar posición
  w.cashARS = Math.round((Number(w.cashARS) - total) * 100) / 100
  w.positions = w.positions || {}
  w.positions[artworkId] = Number(w.positions[artworkId] || 0) + q
  await setWallet(uid, w)

  // 2) Reducir fracciones disponibles de la obra
  const updatedArtwork = await sellFractions(artworkId, q)

  await sleep(120)
  return { wallet: w, artwork: updatedArtwork, total, qty: q }
}

/**
 * Compra de una obra en VENTA DIRECTA (pieza completa):
 * - Valida que sea directa y precio > 0
 * - Valida fondos
 * - Descuenta ARS
 * - Marca la obra como ownedDirect (qty=1)
 * Retorna { wallet, artwork, total }
 */
export async function buyArtworkDirect(user, artworkId){
  const uid = user?.id || 'anon'
  seedIfEmpty(uid)

  const w   = await getWallet(uid)
  const art = await getArtworkById(artworkId)

  const isDirect = !!art.directSale
  const price    = Number(art.directPrice ?? art.price ?? 0)

  if (!isDirect)                       throw new Error('Esta obra no es de venta directa.')
  if (!price)                          throw new Error('La obra no tiene precio de venta directa válido.')
  if (w.ownedDirect?.[artworkId])      throw new Error('Ya compraste esta obra.')
  if (Number(w.cashARS || 0) < price)  throw new Error('Fondos insuficientes en tu wallet.')

  // 1) Descontar efectivo y marcar como poseída por el comprador
  w.cashARS = Math.round((Number(w.cashARS) - price) * 100) / 100
  w.ownedDirect = w.ownedDirect || {}
  w.ownedDirect[artworkId] = true
  await setWallet(uid, w)

  // 2) Marcar la obra como "vendida" a nivel global -> deja de aparecer en el marketplace
  await setArtworkStatus(artworkId, 'sold')

  // 3) (opcional) traer la obra actualizada
  const updated = await getArtworkById(artworkId)

  await sleep(120)
  return { wallet: w, artwork: updated, total: price }
}


/* ===================== DONACIONES ===================== */

export async function donate(user, artistSlug, amount, projectId = null){
  const uid = user?.id || 'anon'
  seedIfEmpty(uid)
  const w = await getWallet(uid)
  const v = Math.max(0, Number(amount) || 0)

  if (!v) throw new Error('Ingresá un monto válido.')
  if (Number(w.cashARS || 0) < v) throw new Error('Fondos insuficientes.')

  w.cashARS = Math.round((Number(w.cashARS) - v) * 100) / 100
  await setWallet(uid, w)

  const k = donationsKey(uid)
  const list = JSON.parse(localStorage.getItem(k) || '[]')
  list.push({
    id: `d${Date.now()}`,
    artistSlug,
    projectId: projectId || null,
    amount: v,
    ts: new Date().toISOString(),
  })
  localStorage.setItem(k, JSON.stringify(list))

  await sleep(120)
  return { cashARS: w.cashARS }
}

export async function getDonations(user){
  const uid = user?.id || 'anon'
  seedIfEmpty(uid)
  await sleep(60)
  return JSON.parse(localStorage.getItem(donationsKey(uid)) || '[]')
}
