export const CART_STORAGE_KEY = "tuxQuickCart";
export const CART_TRANSFER_KEY = "tuxQuickCartTransfer";

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function safeParse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to parse stored cart payload", err);
    return null;
  }
}

export function readSharedCart() {
  if (!isBrowser()) {
    return { cart: [], details: [], checkout: {}, metadata: {} };
  }

  const raw = window.localStorage?.getItem(CART_STORAGE_KEY) ?? null;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return { cart: [], details: [], checkout: {}, metadata: {} };
  }

  const cart = Array.isArray(parsed.cart) ? parsed.cart : [];
  const details = Array.isArray(parsed.details) ? parsed.details : [];
  const checkout = parsed.checkout && typeof parsed.checkout === "object" ? parsed.checkout : {};
  const metadata = parsed.metadata && typeof parsed.metadata === "object" ? parsed.metadata : {};

  return { cart, details, checkout, metadata };
}

function normalizeCartEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      id: entry?.id,
      quantity: Math.max(1, Number.parseInt(entry?.quantity, 10) || 1),
    }))
    .filter((entry) => typeof entry.id === "string" && entry.id);
}

function normalizeDetails(details) {
  if (!Array.isArray(details)) return [];
  return details
    .map((entry) => ({
      id: entry?.id,
      name: entry?.name || "",
      price: Number.parseFloat(entry?.price) || 0,
      quantity: Math.max(1, Number.parseInt(entry?.quantity, 10) || 1),
      extras: Array.isArray(entry?.extras)
        ? entry.extras.map((extra) => ({
            id: extra?.id,
            name: extra?.name || "",
            price: Number.parseFloat(extra?.price) || 0,
          }))
        : [],
    }))
    .filter((entry) => typeof entry.id === "string" && entry.id);
}

function cleanCheckout(checkout) {
  if (!checkout || typeof checkout !== "object") return {};
  const trimmed = {};
  for (const [key, value] of Object.entries(checkout)) {
    if (typeof value === "string") {
      trimmed[key] = value.trim();
      continue;
    }
    trimmed[key] = value;
  }
  return trimmed;
}

export function writeSharedCart({
  cart = [],
  details = [],
  checkout = {},
  metadata = {},
  timestamp = Date.now(),
} = {}) {
  if (!isBrowser()) {
    return { cart: [], details: [], checkout: {}, metadata: {} };
  }

  const normalizedCart = normalizeCartEntries(cart);
  const normalizedDetails = normalizeDetails(details);
  const normalizedCheckout = cleanCheckout(checkout);
  const normalizedMetadata = {
    ...metadata,
    updatedAt: timestamp,
  };

  const payload = {
    cart: normalizedCart,
    details: normalizedDetails,
    checkout: normalizedCheckout,
    metadata: normalizedMetadata,
  };

  try {
    window.localStorage?.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Unable to persist shared cart to localStorage", err);
  }

  const transferPayload = {
    cart: normalizedCart,
    details: normalizedDetails,
    checkout: normalizedCheckout,
    metadata: normalizedMetadata,
    createdAt: timestamp,
  };

  try {
    window.sessionStorage?.setItem(CART_TRANSFER_KEY, JSON.stringify(transferPayload));
  } catch (err) {
    console.warn("Unable to persist shared cart to sessionStorage", err);
  }

  if (isBrowser()) {
    const detail = {
      cart: normalizedCart,
      details: normalizedDetails,
      checkout: normalizedCheckout,
      metadata: normalizedMetadata,
    };

    try {
      window.dispatchEvent(new CustomEvent("tux-cart-sync", { detail }));
    } catch (err) {
      console.warn("Failed to dispatch cart sync event", err);
    }

    try {
      window.postMessage(
        {
          type: "tux-cart-sync",
          payload: detail,
        },
        "*"
      );
    } catch (err) {
      console.warn("Failed to postMessage cart sync", err);
    }

    return detail;
  }

  return {
    cart: normalizedCart,
    details: normalizedDetails,
    checkout: normalizedCheckout,
    metadata: normalizedMetadata,
  };
}
