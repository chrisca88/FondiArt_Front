// src/services/mockWallet.js
import { listArtworks } from './mockArtworks.js'

const PREFIX = 'mock_wallet_v1_'
const sleep = (ms = 300) => new Promise(r => setTimeout(r, ms))

function key(userId){ return `${PREFIX}${userId || 'anon'}` }
function donationsKey(userId){ return `${PREFIX}${userId || 'anon'}_donations` }

function seedIfEmpty(userId){
  const k = key(userId)
  if (!localStorage.getItem(k)){
    // Semilla simple: 100.000 ARS y sin posiciones
    const w = { cashARS: 100000, positions: {} } // { [artworkId]: qty }
    localStorage.setItem(k, JSON.stringify(w))
  }
  if (!localStorage.getItem(donationsKey(userId))){
    localStorage.setItem(donationsKey(userId), JSON.stringify([]))
  }
}

export async function getWallet(userId){
  seedIfEmpty(userId)
  await sleep(120)
  return JSON.parse(localStorage.getItem(key(userId)) || '{"cashARS":0,"positions":{}}')
}

export async function setWallet(userId, wallet){
  await sleep(80)
  localStorage.setItem(key(userId), JSON.stringify(wallet))
  return wallet
}

/**
 * Devuelve el "portfolio" uniendo posiciones con obras aprobadas.
 * Cada item incluye: artworkId, symbol, title, price (fractionFrom),
 * qty, valueARS (qty*price) y un flag `isCash` para saldo en ARS.
 */
export async function getPortfolio(user){
  const uid = user?.id || 'anon'
  const w = await getWallet(uid)
  const approved = await listArtworks({}) // solo aprobadas

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

  const totalTokens = tokens.reduce((acc, t) => acc + (t.valueARS || 0), 0)
  const balanceARS = Math.round((Number(w.cashARS || 0) + totalTokens) * 100) / 100

  return {
    balanceARS,
    cashARS: Number(w.cashARS || 0),
    items: tokens,
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

/* ===================== DONACIONES ===================== */

/** Registra una donación y descuenta saldo en ARS */
export async function donate(user, artistSlug, amount){
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
  list.push({ id: `d${Date.now()}`, artistSlug, amount: v, ts: new Date().toISOString() })
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
