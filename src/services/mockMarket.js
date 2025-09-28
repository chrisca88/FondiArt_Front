// src/services/mockMarket.js
import { getPortfolio } from './mockWallet.js'

// Clave de almacenamiento
const KEY = 'mock_market_listings_v1'
const sleep = (ms = 120) => new Promise(r => setTimeout(r, ms))

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}
function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
function nextId() {
  return 'L' + Math.random().toString(36).slice(2) + Date.now()
}

/**
 * Estructura listing:
 * { id, artworkId, symbol, title, price, qty, sellerId, sellerName, createdAt }
 */

export async function listListings() {
  await sleep()
  const list = load()
  return list.sort((a,b)=> b.createdAt - a.createdAt)
}

/**
 * Crea una publicación y descuenta (reserva) tokens del vendedor.
 */
export async function createListing({ user, artworkId, symbol, title, price, qty = 1 }) {
  await sleep()
  if (!user?.id) throw new Error('Usuario requerido')
  price = Number(price); qty = Number(qty)
  if (!(price > 0) || !(qty > 0)) throw new Error('Precio y cantidad deben ser positivos')

  // Verificar tenencia y descontar de la wallet (reservar)
  const k = `mock_wallet_v1_${user.id}`
  const w = JSON.parse(localStorage.getItem(k) || '{"cashARS":0,"positions":{}}')
  const current = Number(w.positions?.[artworkId] || 0)
  if (current < qty) throw new Error('No tenés suficientes tokens de ese activo')

  w.positions[artworkId] = current - qty
  localStorage.setItem(k, JSON.stringify(w))

  // Guardar listing
  const listing = {
    id: nextId(),
    artworkId, symbol, title,
    price, qty,
    sellerId: user.id,
    sellerName: user.name || user.email || 'Vendedor',
    createdAt: Date.now()
  }
  const list = load()
  list.push(listing)
  save(list)

  return listing
}

/** Cancela publicación y devuelve tokens al vendedor */
export async function cancelListing({ listingId, user }) {
  await sleep()
  if (!user?.id) throw new Error('Usuario requerido')
  const list = load()
  const idx = list.findIndex(l => l.id === listingId)
  if (idx === -1) throw new Error('Publicación no encontrada')
  const listing = list[idx]
  if (listing.sellerId !== user.id) throw new Error('Solo el vendedor puede cancelar')

  // Devolver tokens al vendedor
  const k = `mock_wallet_v1_${listing.sellerId}`
  const w = JSON.parse(localStorage.getItem(k) || '{"cashARS":0,"positions":{}}')
  w.positions = w.positions || {}
  w.positions[listing.artworkId] = Number(w.positions[listing.artworkId] || 0) + Number(listing.qty || 0)
  localStorage.setItem(k, JSON.stringify(w))

  // Quitar listing
  list.splice(idx, 1)
  save(list)
  return true
}

/** Compra (parcial o total) de la publicación */
export async function buyListing({ listingId, buyer, qty }) {
  await sleep()
  if (!buyer?.id) throw new Error('Usuario requerido')

  const list = load()
  const idx = list.findIndex(l => l.id === listingId)
  if (idx === -1) throw new Error('Publicación no encontrada')

  const listing = { ...list[idx] }
  if (buyer.id === listing.sellerId) throw new Error('No podés comprar tu propia publicación')

  // Cantidad a comprar
  let q = Math.floor(Number(qty) || 0)
  if (q < 1) throw new Error('Cantidad inválida')
  if (q > Number(listing.qty)) throw new Error('La cantidad supera la publicación')

  // Wallets
  const kBuyer  = `mock_wallet_v1_${buyer.id}`
  const kSeller = `mock_wallet_v1_${listing.sellerId}`
  const wBuyer  = JSON.parse(localStorage.getItem(kBuyer)  || '{"cashARS":0,"positions":{}}')
  const wSeller = JSON.parse(localStorage.getItem(kSeller) || '{"cashARS":0,"positions":{}}')

  const totalARS = Number(listing.price) * q
  if (Number(wBuyer.cashARS || 0) < totalARS) throw new Error('Saldo insuficiente en ARS')

  // Debitar comprador ARS y acreditar tokens
  wBuyer.cashARS = Math.round((Number(wBuyer.cashARS) - totalARS) * 100) / 100
  wBuyer.positions = wBuyer.positions || {}
  wBuyer.positions[listing.artworkId] = Number(wBuyer.positions[listing.artworkId] || 0) + q

  // Acreditar vendedor ARS
  wSeller.cashARS = Math.round((Number(wSeller.cashARS || 0) + totalARS) * 100) / 100

  // Persistir wallets
  localStorage.setItem(kBuyer,  JSON.stringify(wBuyer))
  localStorage.setItem(kSeller, JSON.stringify(wSeller))

  // Actualizar publicación
  if (q === listing.qty) {
    // compra total → eliminar
    list.splice(idx, 1)
  } else {
    list[idx] = { ...listing, qty: listing.qty - q }
  }
  save(list)

  return true
}
