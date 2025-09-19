// js/main.js
const DATA_URL = "./data/airbnb_listings.json"; // change if your filename is different

// Simple state
let ALL = [];
let FILTERED = [];
const FAVS = new Set(JSON.parse(localStorage.getItem("favs") || "[]"));

// Helpers to read different dataset shapes safely
const get = (obj, path, fallback = "") =>
  path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj) ??
  fallback;

const pick = (obj, keys, fallback = "") => {
  for (const k of keys) if (obj?.[k] != null) return obj[k];
  return fallback;
};

const parsePriceNumber = (p) => {
  if (p == null) return null;
  if (typeof p === "number") return p;
  // Try to parse strings like "$123.00", "123", "123.45"
  const num = String(p).replace(/[^0-9.]/g, "");
  return num ? Number(num) : null;
};

const thumbFor = (x) =>
  pick(x, ["thumbnail_url", "picture_url"], get(x, "images.picture_url", "https://placehold.co/600x400?text=No+Image"));

const hostNameFor = (x) =>
  pick(x, ["host_name"], get(x, "host.name", "Unknown host"));

const hostPicFor = (x) =>
  pick(x, ["host_picture_url"], get(x, "host.picture_url", "https://placehold.co/64x64?text=?"));

const isSuperhost = (x) =>
  Boolean(pick(x, ["host_is_superhost"], get(x, "host.is_superhost", false)));

const titleFor = (x) => pick(x, ["name", "listing_name", "title"], "Untitled");
const descFor = (x) => pick(x, ["description", "summary"], "No description");
const amenitiesFor = (x) => {
  const a = x.amenities;
  if (Array.isArray(a)) return a;
  if (typeof a === "string") {
    // sometimes amenities are a string like "Wifi, Kitchen, …"
    return a.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};
const priceFor = (x) => {
  // try a few common shapes
  const v =
    pick(x, ["price"], null) ??
    get(x, "pricing.price", null) ??
    get(x, "price.rate", null);
  return parsePriceNumber(v);
};

const idFor = (x, idx) =>
  pick(x, ["id", "listing_id", "_id"], `${idx}-${titleFor(x)}`);

// Rendering
function cardHTML(x, idx) {
  const id = idFor(x, idx);
  const favActive = FAVS.has(id) ? "active" : "";
  const name = titleFor(x);
  const desc = descFor(x);
  const amenities = amenitiesFor(x).slice(0, 6); // show a few
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
            ${amenities.map(a => `<span class="badge text-bg-secondary me-1 mb-1">${a}</span>`).join("")}
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

  // Hook up favorite buttons (creative addition: persistent favorites)
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

// Search hook (your navbar already has a search box)
function wireSearch() {
  const input = document.querySelector('input[type="search"]');
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    FILTERED =
      q.length === 0
        ? ALL
        : ALL.filter((x) => {
            const hay =
              `${titleFor(x)} ${descFor(x)} ${amenitiesFor(x).join(" ")} ${hostNameFor(x)}`
                .toLowerCase();
            return hay.includes(q);
          });
    render(FILTERED.slice(0, 50));
  });
}

async function main() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  const data = await res.json();

  // Accept either an array or an object with a property that holds the array
  const items = Array.isArray(data)
    ? data
    : data.listings || data.results || data.data || [];

  ALL = items.slice(0, 50); // first 50
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
        Could not load listings. Check <code>DATA_URL</code> and run a local server.
        <div class="mt-2"><code>${err.message}</code></div>
      </div>
    </div>
  `;
});
