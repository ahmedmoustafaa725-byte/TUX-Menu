import { menuIndex } from "./menu-data.js";
import { readSharedCart, writeSharedCart } from "./cart-storage.js";

function normalizeCurrencyValue(value) {
  if (typeof value === "string") {
    value = Number.parseFloat(value);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value * 100) / 100;
  return rounded < 0 ? 0 : rounded;
}

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
});

function formatCurrency(value) {
  try {
    return currencyFormatter.format(value || 0);
  } catch (err) {
    return `EGP ${(Number(value) || 0).toFixed(2)}`;
  }
}

function calculateSplitSuggestion(total) {
  const cents = Math.round(Math.max(total || 0, 0) * 100);
  if (!cents) {
    return { cash: 0, instapay: 0 };
  }
  const cashCents = Math.floor(cents / 2);
  const instapayCents = cents - cashCents;
  return {
    cash: cashCents / 100,
    instapay: instapayCents / 100,
  };
}

const cartItemsContainer = document.getElementById("cartItems");
const emptyCartEl = document.getElementById("emptyCart");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartDeliveryEl = document.getElementById("cartDeliveryFee");
const cartTotalEl = document.getElementById("cartTotal");
const cartSummaryEl = document.getElementById("cartSummary");
const clearCartBtn = document.getElementById("clearCart");
const deliveryFeeRow = document.getElementById("deliveryFeeRow");
const paymentSummaryEl = document.getElementById("paymentSummary");
const cashSummaryRow = document.getElementById("cashSummaryRow");
const cashSummaryAmount = document.getElementById("cashSummaryAmount");
const instapaySummaryRow = document.getElementById("instapaySummaryRow");
const instapaySummaryAmount = document.getElementById("instapaySummaryAmount");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");

let cart = [];
let checkoutSnapshot = {};

function sanitizeExtras(entryExtras = [], menuExtras = []) {
  return entryExtras
    .map((extra) => {
      const id = extra?.id;
      if (!id) return null;
      const menuExtra = menuExtras.find((option) => option.id === id) || null;
      const name = extra?.name || menuExtra?.name || id;
      const priceSource =
        typeof extra?.price === "number" || typeof extra?.price === "string"
          ? Number.parseFloat(extra.price)
          : menuExtra?.price || 0;
      return {
        id,
        name,
        price: normalizeCurrencyValue(priceSource),
      };
    })
    .filter(Boolean);
}

function buildCartFromStorage(seed) {
  if (!seed || typeof seed !== "object") {
    return [];
  }

  const detailLookup = new Map();
  if (Array.isArray(seed.details)) {
    seed.details.forEach((detail) => {
      const detailId = detail?.id || detail?.itemId;
      if (!detailId) return;
      detailLookup.set(detailId, detail);
    });
  }

  const baseEntries = Array.isArray(seed.details) && seed.details.length
    ? seed.details
    : Array.isArray(seed.cart) && seed.cart.length
      ? seed.cart
      : [];

  const mapped = [];
  baseEntries.forEach((entry) => {
    const entryId = entry?.id || entry?.itemId;
    if (!entryId) return;
    const menuItem = menuIndex.get(entryId);
    if (!menuItem) return;
    const quantity = Math.max(1, Number.parseInt(entry?.quantity, 10) || 1);
    const detail = detailLookup.get(entryId) || null;
    const priceSource =
      typeof detail?.price === "number" || typeof detail?.price === "string"
        ? Number.parseFloat(detail.price)
        : menuItem.price;
    const extras = sanitizeExtras(detail?.extras, Array.isArray(menuItem.extras) ? menuItem.extras : []);

    mapped.push({
      itemId: menuItem.id,
      name: detail?.name || menuItem.name,
      price: normalizeCurrencyValue(priceSource),
      quantity,
      extras,
    });
  });

  return mapped;
}

function calculateExtrasTotal(entry) {
  return (entry.extras || []).reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
}

function calculateItemTotal(entry) {
  return (entry.price + calculateExtrasTotal(entry)) * entry.quantity;
}

function calculateCartTotal() {
  return cart.reduce((total, entry) => total + calculateItemTotal(entry), 0);
}

function updatePaymentSummary(total) {
  if (!paymentSummaryEl) return;
  if (!cart.length) {
    paymentSummaryEl.classList.add("hidden");
    if (cashSummaryRow) cashSummaryRow.style.display = "none";
    if (instapaySummaryRow) instapaySummaryRow.style.display = "none";
    return;
  }
  const method = checkoutSnapshot.paymentMethod || "cash";
  const showSummary = method === "split" || method === "cash" || method === "instapay";
  paymentSummaryEl.classList.toggle("hidden", !showSummary);

  if (!showSummary) {
    return;
  }

  const normalizedCash = normalizeCurrencyValue(checkoutSnapshot.cashAmount);
  const normalizedInstapay = normalizeCurrencyValue(checkoutSnapshot.instapayAmount);

  const suggestion = calculateSplitSuggestion(total);

  const cashValue =
    method === "cash"
      ? total
      : method === "split" && normalizedCash
        ? normalizedCash
        : method === "split"
          ? suggestion.cash
          : normalizedCash;

  const instapayValue =
    method === "instapay"
      ? total
      : method === "split" && normalizedInstapay
        ? normalizedInstapay
        : method === "split"
          ? suggestion.instapay
          : normalizedInstapay;

  if (cashSummaryRow) {
    const showCash = method === "cash" || method === "split";
    cashSummaryRow.style.display = showCash ? "flex" : "none";
    if (showCash && cashSummaryAmount) {
      cashSummaryAmount.textContent = formatCurrency(cashValue);
    }
  }

  if (instapaySummaryRow) {
    const showInstapay = method === "instapay" || method === "split";
    instapaySummaryRow.style.display = showInstapay ? "flex" : "none";
    if (showInstapay && instapaySummaryAmount) {
      instapaySummaryAmount.textContent = formatCurrency(instapayValue);
    }
  }
}

function renderCart() {
  const hasItems = cart.length > 0;

  if (cartItemsContainer) {
    cartItemsContainer.innerHTML = "";
    if (!hasItems) {
      if (emptyCartEl) {
        emptyCartEl.style.display = "block";
        cartItemsContainer.appendChild(emptyCartEl);
      }
    } else {
      if (emptyCartEl) emptyCartEl.style.display = "none";
      cart.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.dataset.index = String(index);

        const row = document.createElement("div");
        row.className = "cart-item__row";

        const title = document.createElement("div");
        title.className = "cart-item__name";
        title.textContent = `${entry.quantity}× ${entry.name}`;
        row.appendChild(title);

        const price = document.createElement("div");
        price.textContent = formatCurrency(calculateItemTotal(entry));
        row.appendChild(price);

        li.appendChild(row);

        if (entry.extras && entry.extras.length) {
          const extras = document.createElement("div");
          extras.className = "cart-item__extras";
          extras.textContent = `Extras: ${entry.extras.map((extra) => extra.name).join(", ")}`;
          li.appendChild(extras);
        }

        const controls = document.createElement("div");
        controls.className = "cart-item__controls";

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.className = "cart-item__btn";
        decrease.dataset.action = "decrease";
        decrease.dataset.index = String(index);
        decrease.textContent = "−";
        controls.appendChild(decrease);

        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.min = "1";
        qtyInput.max = "20";
        qtyInput.value = String(entry.quantity);
        qtyInput.className = "cart-item__qty";
        qtyInput.dataset.action = "quantity";
        qtyInput.dataset.index = String(index);
        controls.appendChild(qtyInput);

        const increase = document.createElement("button");
        increase.type = "button";
        increase.className = "cart-item__btn";
        increase.dataset.action = "increase";
        increase.dataset.index = String(index);
        increase.textContent = "+";
        controls.appendChild(increase);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "cart-item__btn";
        remove.dataset.action = "remove";
        remove.dataset.index = String(index);
        remove.textContent = "Remove";
        controls.appendChild(remove);

        li.appendChild(controls);
        cartItemsContainer.appendChild(li);
      });
    }
  }

  const subtotal = calculateCartTotal();
  if (cartSubtotalEl) cartSubtotalEl.textContent = formatCurrency(subtotal);
  if (cartDeliveryEl) {
    cartDeliveryEl.textContent = "Set during checkout";
  }
  if (deliveryFeeRow) {
    deliveryFeeRow.style.display = "none";
  }
  if (cartTotalEl) cartTotalEl.textContent = formatCurrency(subtotal);
  updatePaymentSummary(subtotal);

  if (cartSummaryEl) {
    cartSummaryEl.classList.toggle("hidden", !hasItems);
  }
  if (clearCartBtn) {
    clearCartBtn.classList.toggle("hidden", !hasItems);
  }
}

function mapCartForStorage() {
  return cart.map((entry) => ({
    id: entry.itemId,
    quantity: Math.max(1, Number.parseInt(entry.quantity, 10) || 1),
  }));
}

function mapCartDetailsForStorage() {
  return cart.map((entry) => ({
    id: entry.itemId,
    name: entry.name,
    price: normalizeCurrencyValue(entry.price),
    quantity: Math.max(1, Number.parseInt(entry.quantity, 10) || 1),
    extras: (entry.extras || []).map((extra) => ({
      id: extra.id,
      name: extra.name,
      price: normalizeCurrencyValue(extra.price),
    })),
  }));
}

function syncSharedCart(reason = "cart-page-update") {
  try {
    writeSharedCart({
      cart: mapCartForStorage(),
      details: mapCartDetailsForStorage(),
      checkout: checkoutSnapshot,
      metadata: { reason, source: "cart-page" },
    });
  } catch (err) {
    console.warn("Failed to sync cart page state", err);
  }
}

function hydrateFromStorage() {
  const stored = readSharedCart();
  checkoutSnapshot = stored.checkout && typeof stored.checkout === "object" ? stored.checkout : {};
  cart = buildCartFromStorage(stored);
  renderCart();
}

function handleCartMutation(reason) {
  renderCart();
  syncSharedCart(reason);
}

cartItemsContainer?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || !cart[index]) return;

  if (action === "remove") {
    cart.splice(index, 1);
    handleCartMutation("cart-remove");
    return;
  }

  if (action === "increase") {
    cart[index].quantity = Math.min(cart[index].quantity + 1, 99);
    handleCartMutation("cart-increase");
    return;
  }

  if (action === "decrease") {
    cart[index].quantity = Math.max(1, cart[index].quantity - 1);
    handleCartMutation("cart-decrease");
  }
});

cartItemsContainer?.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.action !== "quantity") return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || !cart[index]) return;

  const nextValue = parseInt(target.value, 10);
  if (Number.isNaN(nextValue) || nextValue < 1) {
    target.value = String(cart[index].quantity);
    return;
  }

  cart[index].quantity = Math.min(nextValue, 99);
  handleCartMutation("cart-quantity");
});

clearCartBtn?.addEventListener("click", () => {
  if (!cart.length) return;
  cart = [];
  handleCartMutation("cart-clear");
});

mobileMenuButton?.addEventListener("click", () => {
  if (!mobileMenu) return;
  const isExpanded = mobileMenuButton.getAttribute("aria-expanded") === "true";
  mobileMenuButton.setAttribute("aria-expanded", String(!isExpanded));
  mobileMenu.classList.toggle("hidden");
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.add("hidden");
    mobileMenuButton?.setAttribute("aria-expanded", "false");
  });
});

function handleExternalSync(detail = {}) {
  cart = buildCartFromStorage(detail);
  if (detail.checkout && typeof detail.checkout === "object") {
    checkoutSnapshot = detail.checkout;
  }
  renderCart();
}

if (typeof window !== "undefined") {
  window.addEventListener("tux-cart-sync", (event) => {
    handleExternalSync(event?.detail || {});
  });
  window.addEventListener("message", (event) => {
    if (event?.data && event.data.type === "tux-cart-sync") {
      handleExternalSync(event.data.payload || {});
    }
  });
}

hydrateFromStorage();
updatePaymentSummary(calculateCartTotal());
syncSharedCart("cart-page-init");
