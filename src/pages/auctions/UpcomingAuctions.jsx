// src/pages/auctions/UpcomingAuctions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

// ===================== helpers =====================
const normalizeList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
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
  if (!value) return "—";
  return `$${Number(value).toLocaleString("es-AR")}`;
};

// ===================== image utils =====================
const getApiOrigin = () => {
  try {
    const base = api?.defaults?.baseURL;
    if (!base) return "";
    return new URL(base).origin;
  } catch {
    return "";
  }
};

const fixImageUrl = (url) => {
  console.log("[UpcomingAuctions] raw artwork_image:", url);

  if (typeof url !== "string") return "";

  let u = url.trim();
  if (!u) return "";

  const marker = "https%3A/";
  const idx = u.indexOf(marker);
  if (idx !== -1) {
    const fixed = "https://" + u.substring(idx + marker.length);
    console.log("[UpcomingAuctions] decoded encoded url:", fixed);
    return fixed;
  }

  if (u.startsWith("//")) {
    const fixed = "https:" + u;
    console.log("[UpcomingAuctions] protocol-relative url:", fixed);
    return fixed;
  }

  if (u.startsWith("/")) {
    const fixed = `${getApiOrigin()}${u}`;
    console.log("[UpcomingAuctions] relative url fixed:", fixed);
    return fixed;
  }

  if (!u.startsWith("http")) {
    const fixed = `${getApiOrigin()}/${u}`;
    console.log("[UpcomingAuctions] no-protocol url fixed:", fixed);
    return fixed;
  }

  console.log("[UpcomingAuctions] final image url:", u);
  return u;
};

// ===================== serializer mapping =====================
const getAuctionDate = (a) => a?.auction_date;
const getArtworkId = (a) => a?.artwork;
const getTitle = (a) => a?.artwork_title ?? "Obra";
const getArtistName = (a) => a?.artist_name ?? "—";
const getRawImage = (a) => a?.artwork_image;
const getStartPrice = (a) => a?.start_price;
const getFinalPrice = (a) => a?.final_price;
const normalizeStatus = (a) => (a?.status || "").toLowerCase();

// ===================== component =====================
export default function UpcomingAuctions() {
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("upcoming"); // upcoming | finished

  useEffect(() => {
    let mounted = true;

    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/auctions/");

        console.log("[UpcomingAuctions] RAW API RESPONSE:", res.data);

        const list = normalizeList(res.data);
        if (!mounted) return;

        setAuctions(list);
      } catch (e) {
        console.error("[UpcomingAuctions] API ERROR:", e);
        if (mounted) setError("No se pudieron cargar las subastas.");
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

    return auctions
      .map((a) => ({ ...a, __date: safeDate(getAuctionDate(a)) }))
      .filter((a) => {
        const st = normalizeStatus(a);
        if (view === "finished") {
          return st === "finished";
        }
        return st === "upcoming" || (a.__date && a.__date > now);
      });
  }, [auctions, view]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {view === "finished" ? "Subastas finalizadas" : "Próximas subastas"}
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setView("upcoming")}
            className={`px-4 py-2 rounded-xl text-sm ${
              view === "upcoming"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200"
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setView("finished")}
            className={`px-4 py-2 rounded-xl text-sm ${
              view === "finished"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200"
            }`}
          >
            Finalizadas
          </button>
        </div>
      </div>

      {loading && <div>Cargando subastas…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => {
          const rawImg = getRawImage(a);
          const img = fixImageUrl(rawImg);

          console.log("[UpcomingAuctions] FINAL IMAGE USED:", img);

          return (
            <div
              key={a.id}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <div className="aspect-[4/3] bg-slate-100">
                {img ? (
                  <img
                    src={img}
                    alt={getTitle(a)}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      console.error(
                        "[UpcomingAuctions] IMAGE LOAD ERROR:",
                        img
                      );
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-5">
                <h2 className="font-bold">{getTitle(a)}</h2>
                <p className="text-sm text-slate-600">{getArtistName(a)}</p>
                <p className="text-sm mt-2">
                  Fecha: {formatDateTime(a.__date)}
                </p>
                <p className="text-sm">
                  Precio inicial: {formatMoney(getStartPrice(a))}
                </p>

                <Link
                  to={`/artworks/${getArtworkId(a)}`}
                  className="mt-3 inline-block text-sm font-semibold text-indigo-600"
                >
                  Ver obra
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
