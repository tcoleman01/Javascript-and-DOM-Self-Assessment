// js/main.js
// A simple Airbnb-like listing viewer that reads from a local JSON file.

const CANDIDATES = [
  "./package.json",        // first choice
  "./package-lock.json",   // fallback
];

async function resolveDataUrl() {
  for (const url of CANDIDATES) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        console.log("[data] using", url);
        return url;
      }
    } catch {
      /* try next */
    }
  }
  throw new Error(`None of these paths worked: ${CANDIDATES.join(", ")}`);
}

// ------- state -------
let ALL = [];
let FILTERED = [];
const FAVS = new Set(JSON.parse(localStorage.getItem("favs") || "[]"));

// ------- helpers -------
const get = (obj, path, fallback = "") =>
  path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj) ?? fallback;

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) if (obj?.[k] != null) return obj[k];
  return fallback;
};

const parsePriceNumber = (p) => {
  if (p == null) return null;
  if (typeof p === "number") return p;
  const num = String(p).replace(/[^0-9.]/g, "");
  return num ? Number(num) : null;
};

const thumbFor = (x) =>
  pick(x, ["thumbnail_url", "picture_url"], get(x, "images.picture_url", "https://placehold.co/600x400?text=No+Image"));

const hostNameFor = (x) => pick(x, ["host_name"], get(x, "host.name", "Unknown host"));

const hostPicFor = (x) =>
  pick(x, ["host_picture_url"], get(x, "host.picture_url", "https://placehold.co/64x64?text=?"));

const isSuperhost = (x) => Boolean(pick(x, ["host_is_superhost"], get(x, "host.is_superhost", false)));

const titleFor = (x) => pick(x, ["name", "listing_name", "title"], "Untitled");
const descFor = (x) => pick(x, ["description", "summary"], "No description");

const amenitiesFor = (x) => {
  const a = x.amenities;
  if (Array.isArray(a)) return a;
  if (typeof a === "string")
    return a.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  return [];
};

const priceFor = (x) => {
  const v =
    pick(x, ["price"], null) ??
    get(x, "pricing.price", null) ??
    get(x, "price.rate", null);
  return parsePriceNumber(v);
};

const idFor = (x, idx) => pick(x, ["id", "listing_id", "_id"], `${idx}-${titleFor(x)}`);

// ------- rendering -------
function cardHTML(x, idx) {
  const id = idFor(x, idx);
  const favActive = FAVS.has(id) ? "active" : "";
  const name = titleFor(x);
  const desc = descFor(x);
  const amenities = amenitiesFor(x).slice(0, 6);
  const price = priceFor(x);
  const priceText = price != null ? `$${price.toLocaleString()}` : "—";
  const hostName = hostNameFor(x);
  const hostPic = hostPicFor(x);
  const superhost = isSuperhost(x);
  const thumb = thumbFor(x);

  return `
    <div class="col-12 col-sm-6 col-lg-4 mb-4">
      <div class="listing card h-100 shadow-sm">
        <img src="${thumb}" alt="${name}" class="card-img-top" loading="lazy">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title me-2">${name}</h5>
            <button class="btn btn-sm btn-light fav ${favActive}" data-fav="${id}" title="Toggle favorite">❤</button>
          </div>
          <p class="card-text flex-grow-1">${desc}</p>
          <div class="amenities mb-2">
            ${amenities.map((a) => `<span class="badge text-bg-secondary me-1 mb-1">${a}</span>`).join("")}
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <div class="host">
              <img src="${hostPic}" alt="${hostName}">
              <div>
                <div>${hostName}${superhost ? " ⭐" : ""}</div>
                <small class="text-muted">${superhost ? "Superhost" : ""}</small>
              </div>
            </div>
            <strong>${priceText}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function render(list) {
  const listings = document.getElementById("listings");
  listings.innerHTML = list.map(cardHTML).join("");
  listings.querySelectorAll("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fav");
      if (FAVS.has(id)) FAVS.delete(id);
      else FAVS.add(id);
      localStorage.setItem("favs", JSON.stringify([...FAVS]));
      btn.classList.toggle("active");
    });
  });
}

function wireSearch() {
  const input = document.querySelector('input[type="search"]');
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    FILTERED = q
      ? ALL.filter((x) => {
          const hay = `${titleFor(x)} ${descFor(x)} ${amenitiesFor(x).join(" ")} ${hostNameFor(x)}`.toLowerCase();
          return hay.includes(q);
        })
      : ALL;
    render(FILTERED.slice(0, 50));
  });
}

async function main() {
  const url = await resolveDataUrl();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const json = await res.json();

  // Expect a "listings" array inside package.json (see step 2 below)
  const items = Array.isArray(json)
    ? json
    : json.listings || json.results || json.data || [];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      `No listings found in ${url}. Add a "listings": [] array to your ${url.replace("./","")}.`
    );
  }

  ALL = items.slice(0, 50);
  FILTERED = ALL;

  render(FILTERED);
  wireSearch();
}

main().catch((err) => {
  console.error(err);
  const listings = document.getElementById("listings");
  listings.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        Could not load listings.
        <div class="mt-2"><code>${err.message}</code></div>
      </div>
    </div>
  `;
});
