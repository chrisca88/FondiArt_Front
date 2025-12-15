// src/pages/auctions/UpcomingAuctions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

// Helpers para soportar distintos formatos de respuesta
const normalizeList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value) => {
  const d = safeDate(value);
  if (!d) return "—";
  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `$${n.toLocaleString("es-AR")}`;
};

// ✅ origin del backend (sin /api/v1)
const getApiOrigin = () => {
  try {
    const base = api?.defaults?.baseURL;
    if (!base) return "";
    return new URL(base).origin; // ej: https://api.fondiart.com.ar
  } catch {
    return "";
  }
};

// ✅ arregla URLs encodeadas / relativas
const fixImageUrl = (url) => {
  if (typeof url !== "string") return "";
  let u = url.trim();
  if (!u) return "";

  // Caso: URL encodeada tipo "...https%3A/...."
  const marker = "https%3A/";
  const idx = u.indexOf(marker);
  if (idx !== -1) {
    u = "https://" + u.substring(idx + marker.length);
    return u;
  }

  // Caso: "//res.cloudinary.com/..."
  if (u.startsWith("//")) return "https:" + u;

  // Caso: "/media/..." o "/uploads/..." (ruta relativa)
  if (u.startsWith("/")) {
    const origin = getApiOrigin();
    return origin ? `${origin}${u}` : u;
  }

  // Caso: "media/..." sin slash inicial
  if (!u.startsWith("http")) {
    const origin = getApiOrigin();
    return origin ? `${origin}/${u}` : u;
  }

  // Caso: ya es URL completa
  return u;
};

// Basado en AuctionSerializer
const getAuctionDate = (a) => a?.auction_date ?? a?.auctionDate ?? a?.date ?? null;
const getArtworkId = (a) => a?.artwork ?? a?.artwork_id ?? a?.artworkId ?? null;
const getTitle = (a) => a?.artwork_title ?? a?.title ?? "Obra";
const getArtistName = (a) => a?.artist_name ?? a?.artist?.name ?? "—";
const getRawImage = (a) => a?.artwork_image ?? a?.image ?? "";
const getStartPrice = (a) => a?.start_price ?? a?.startPrice ?? a?.start_price_amount ?? null;
const getFinalPrice = (a) => a?.final_price ?? a?.finalPrice ?? null;

const normalizeStatus = (a) => (a?.status || "").toString().toLowerCase();

export default function UpcomingAuctions() {
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [error, setError] = useState("");

  // "upcoming" | "finished"
  const [view, setView] = useState("upcoming");

  useEffect(() => {
    let mounted = true;

    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError("");

        // Si api.baseURL ya incluye /api/v1 -> /auctions/ está OK
        // Si NO incluye /api/v1 -> cambiar a '/api/v1/auctions/'
        const res = await api.get("/auctions/");
        const list = normalizeList(res.data);

        if (!mounted) return;
        setAuctions(list);
      } catch (e) {
        if (!mounted) return;
        setError("No se pudieron cargar las subastas. Intentá nuevamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAuctions();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();

    const mapped = auctions.map((a) => {
      const d = safeDate(getAuctionDate(a));
      return { ...a, __date: d };
    });

    if (view === "finished") {
      return mapped
        .filter((a) => {
          const st = normalizeStatus(a);
          if (st === "finished") return true;
          if (a.__date && a.__date <= now && (a.buyer !== null || getFinalPrice(a) !== null)) return true;
          return false;
        })
        .sort((a, b) => (b.__date?.getTime?.() || 0) - (a.__date?.getTime?.() || 0));
    }

    return mapped
      .filter((a) => {
        const st = normalizeStatus(a);
        if (st === "upcoming") return true;
        if (a.__date && a.__date > now) return true;
        return false;
      })
      .sort((a, b) => (a.__date?.getTime?.() || 0) - (b.__date?.getTime?.() || 0));
  }, [auctions, view]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {view === "finished" ? "Subastas finalizadas" : "Próximas subastas"}
          </h1>
          <p className="text-sm text-slate-600">
            {view === "finished"
              ? "Historial de subastas que ya finalizaron."
              : "Obras que comenzarán a subastarse próximamente."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            <Tab label="Próximas" active={view === "upcoming"} onClick={() => setView("upcoming")} />
            <Tab label="Finalizadas" active={view === "finished"} onClick={() => setView("finished")} />
          </div>

          <Link
            to="/market"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Volver al marketplace
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Cargando subastas…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          {view === "finished"
            ? "No hay subastas finalizadas por el momento."
            : "No hay subastas próximas por el momento."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const artworkId = getArtworkId(a);
            const img = fixImageUrl(getRawImage(a)); // ✅ FIX APLICADO
            const title = getTitle(a);
            const artist = getArtistName(a);
            const dateLabel = formatDateTime(a.__date);
            const startPrice = getStartPrice(a);
            const finalPrice = getFinalPrice(a);
            const st = normalizeStatus(a);

            return (
              <div
                key={a.id ?? `${title}-${dateLabel}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] w-full bg-slate-100">
                  {img ? (
                    <img
                      src={img}
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // fallback visual si la URL está rota
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML =
                            '<div class="flex h-full w-full items-center justify-center text-slate-400">Sin imagen</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-2">
                    <h2 className="line-clamp-1 text-lg font-bold">{title}</h2>
                    <p className="text-sm text-slate-600 line-clamp-1">{artist}</p>
                  </div>

                  <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">{view === "finished" ? "Finalizó" : "Fecha"}</span>
                      <span className="font-semibold">{dateLabel}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Precio inicial</span>
                      <span className="font-semibold">{formatMoney(startPrice)}</span>
                    </div>

                    {view === "finished" && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-600">Precio final</span>
                        <span className="font-semibold">{formatMoney(finalPrice)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {artworkId ? (
                      <Link
                        to={`/artworks/${artworkId}`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Ver obra
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-white"
                        title="No se encontró el ID de la obra"
                      >
                        Ver obra
                      </button>
                    )}

                    <span
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      title={`Estado: ${st || "—"}`}
                    >
                      {view === "finished" ? "Finalizada" : "Próxima"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? "bg-indigo-600 text-white" : "hover:bg-slate-50"}`}
      type="button"
    >
      {label}
    </button>
  );
}
