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

// Intenta obtener fecha de inicio desde distintos nombres comunes
const getStartDate = (auction) =>
  auction?.start_time ??
  auction?.startTime ??
  auction?.starts_at ??
  auction?.startsAt ??
  auction?.start_date ??
  auction?.startDate ??
  auction?.start_datetime ??
  auction?.startDateTime ??
  null;

// Intenta obtener artwork desde distintos nombres comunes
const getArtwork = (auction) =>
  auction?.artwork ?? auction?.artwork_detail ?? auction?.artworkDetail ?? auction?.obra ?? null;

// Intenta obtener un id de artwork (para el link)
const getArtworkId = (auction, artwork) =>
  artwork?.id ??
  artwork?._id ??
  auction?.artwork_id ??
  auction?.artworkId ??
  auction?.obra_id ??
  auction?.obraId ??
  null;

// Imagen: intenta varias propiedades comunes
const getArtworkImage = (artwork) =>
  artwork?.image_url ??
  artwork?.imageUrl ??
  artwork?.image ??
  artwork?.thumbnail_url ??
  artwork?.thumbnailUrl ??
  "";

// Título / artista
const getArtworkTitle = (artwork) => artwork?.title ?? artwork?.titulo ?? "Obra";
const getArtworkArtist = (artwork) => artwork?.artist ?? artwork?.artist_name ?? artwork?.artistName ?? artwork?.autor ?? "—";

// Precio base (si existiera)
const getStartingPrice = (auction) =>
  auction?.starting_price ??
  auction?.startingPrice ??
  auction?.base_price ??
  auction?.basePrice ??
  null;

export default function UpcomingAuctions() {
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("auctions/");
        const list = normalizeList(res.data);

        if (!mounted) return;
        setAuctions(list);
      } catch (e) {
        if (!mounted) return;
        setError("No se pudieron cargar las próximas subastas. Intentá nuevamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAuctions();
    return () => {
      mounted = false;
    };
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date();

    return auctions
      .map((a) => {
        const start = safeDate(getStartDate(a));
        return { ...a, __start: start };
      })
      .filter((a) => a.__start && a.__start > now)
      .sort((a, b) => a.__start - b.__start);
  }, [auctions]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Próximas subastas</h1>
          <p className="text-sm text-slate-600">
            Obras que comenzarán a subastarse próximamente.
          </p>
        </div>

        <Link
          to="/market"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Volver al marketplace
        </Link>
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

      {!loading && !error && upcoming.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No hay subastas próximas por el momento.
        </div>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((auction) => {
            const artwork = getArtwork(auction);
            const artworkId = getArtworkId(auction, artwork);
            const img = getArtworkImage(artwork);
            const title = getArtworkTitle(artwork);
            const artist = getArtworkArtist(artwork);
            const startLabel = formatDateTime(auction.__start);
            const startingPrice = getStartingPrice(auction);

            return (
              <div
                key={auction.id ?? auction._id ?? `${title}-${startLabel}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] w-full bg-slate-100">
                  {img ? (
                    <img
                      src={img}
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
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
                    <p className="text-sm text-slate-600 line-clamp-1">
                      {artist}
                    </p>
                  </div>

                  <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Comienza</span>
                      <span className="font-semibold">{startLabel}</span>
                    </div>

                    {startingPrice !== null && startingPrice !== undefined && (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-slate-600">Precio base</span>
                        <span className="font-semibold">
                          ${Number(startingPrice).toLocaleString("es-AR")}
                        </span>
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

                    <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Próxima
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
