const storageKey = "tuxQuickCart";
const transferKey = "tuxQuickCartTransfer";
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

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
});

const quickMenu = [
  {
    id: "smash-burgers",
    title: "Smash Burgers",
    note: "Served with fries",
    items: [
      {
        id: "single-smashed-patty",
        name: "Single Smashed Patty",
        price: 95,
        description: "Smashed patty, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
      },
      {
        id: "double-smashed-patty",
        name: "Double Smashed Patty",
        price: 140,
        description: "Two smashed patties, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
      },
      {
        id: "triple-smashed-patty",
        name: "Triple Smashed Patty",
        price: 160,
        description: "Three smashed patties, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
      },
      {
        id: "quatro-smashed-patty",
        name: "TUX Quatro Smashed Patty",
        price: 190,
        description: "Four smashed patties, cheese, TUX sauce, caramelized onion, mushroom.",
      },
    ],
  },
  {
    id: "tuxify",
    title: "TUXIFY",
    items: [
      {
        id: "tuxify-single",
        name: "TUXIFY Single",
        price: 120,
        description: "Brioche bun, beef patty, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
      },
      {
        id: "tuxify-double",
        name: "TUXIFY Double",
        price: 160,
        description: "Double beef patties, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
      },
      {
        id: "tuxify-triple",
        name: "TUXIFY Triple",
        price: 200,
        description: "Triple beef patties, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
      },
      {
        id: "tuxify-quatro",
        name: "TUXIFY Quatro",
        price: 240,
        description: "Four beef patties, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
      },
    ],
  },
  {
    id: "fries",
    title: "Fries",
    items: [
      { id: "classic-fries-small", name: "Classic Fries (Small)", price: 25 },
      { id: "classic-fries-large", name: "Classic Fries (Large)", price: 30 },
      { id: "cheese-fries", name: "Cheese Fries", price: 30 },
      { id: "chili-fries", name: "Chili Fries", price: 40 },
      {
        id: "tux-fries",
        name: "TUX Fries",
        price: 75,
        description: "Fries, smashed patty, cheese, pickles, caramelised onion, jalapeño, TUX sauce.",
      },
      { id: "doppy-fries", name: "Doppy Fries", price: 95 },
    ],
  },
  {
    id: "hawawshi",
    title: "Hawawshi",
    note: "Served with chili sauce",
    items: [
      {
        id: "classic-hawawshi",
        name: "Classic Hawawshi",
        price: 80,
        description: "Baladi bread, hawawshi meat, onion. Served with chili sauce.",
      },
      {
        id: "tux-hawawshi",
        name: "TUX Hawawshi",
        price: 100,
        description: "Baladi bread, hawawshi meat, mozzarella, onion, TUX hawawshi sauce.",
      },
    ],
  },
  {
    id: "burger-extras",
    title: "Burger Extras",
    items: [
      { id: "extra-smashed-patty", name: "Extra Smashed Patty", price: 40 },
      { id: "bacon", name: "Bacon", price: 20 },
      { id: "cheese", name: "Cheese", price: 15 },
      { id: "ranch", name: "Ranch", price: 10 },
      { id: "mushroom", name: "Mushroom", price: 15 },
      { id: "caramelized-onion", name: "Caramelized Onion", price: 10 },
      { id: "jalapeno", name: "Jalapeño", price: 10 },
      { id: "tux-sauce", name: "TUX Sauce", price: 10 },
      { id: "extra-bun", name: "Extra Bun", price: 10 },
      { id: "pickle", name: "Pickle", price: 5 },
      { id: "condiments", name: "BBQ / Ketchup / Sweet Chili / Hot Sauce", price: 5 },
    ],
  },
  {
    id: "hawawshi-extras",
    title: "Hawawshi Extras",
    items: [
      { id: "mozzarella-cheese", name: "Mozzarella Cheese", price: 20 },
      { id: "tux-hawawshi-sauce", name: "TUX Hawawshi Sauce", price: 10 },
      { id: "hawawshi-condiments", name: "BBQ / Ketchup / Sweet Chili / Hot Sauce", price: 5 },
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    items: [
      { id: "soda", name: "Soda", price: 20 },
      { id: "water", name: "Water", price: 10 },
    ],
  },
];

const menuIndex = new Map(quickMenu.flatMap((group) => group.items.map((item) => [item.id, item])));

function defaultState() {
  return {
    cart: [],
    checkout: {
      name: "",
      phone: "",
      email: "",
      notes: "",
      paymentMethod: "cash",
      cashAmount: 0,
      instapayAmount: 0,
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      checkout: {
        ...defaultState().checkout,
        ...(parsed.checkout || {}),
      },
      cart: Array.isArray(parsed.cart)
        ? parsed.cart
            .map((entry) => ({
              id: entry.id,
              quantity: Math.max(1, Number.parseInt(entry.quantity, 10) || 1),
            }))
            .filter((entry) => menuIndex.has(entry.id))
        : [],
    };
  } catch (err) {
    console.warn("Failed to parse stored cart", err);
    return defaultState();
  }
}

const state = loadState();

const quickNavToggle = document.getElementById("quickNavToggle");
const quickNavPanel = document.getElementById("quickNavPanel");
const cartPanel = document.getElementById("quickCartPanel");
const orderDock = document.getElementById("orderDock");
const cartDock = document.getElementById("cartDock");
const accountDock = document.getElementById("accountDock");
const heroOrderBtn = document.getElementById("heroOrderBtn");
const quickOrderList = document.getElementById("quickOrderList");
const quickCartItems = document.getElementById("quickCartItems");
const quickCartSummary = document.getElementById("quickCartSummary");
const quickSubtotal = document.getElementById("quickSubtotal");
const quickTotal = document.getElementById("quickTotal");
const quickCartClear = document.getElementById("quickCartClear");
const quickCartForm = document.getElementById("quickCartForm");
const quickName = document.getElementById("quickName");
const quickPhone = document.getElementById("quickPhone");
const quickNotes = document.getElementById("quickNotes");
const quickPaymentSplit = document.getElementById("quickPaymentSplit");
const quickCashAmount = document.getElementById("quickCashAmount");
const quickInstapayAmount = document.getElementById("quickInstapayAmount");
const quickCartStatus = document.getElementById("quickCartStatus");

let activeOverlay = null;

function formatCurrency(value) {
  try {
    return currencyFormatter.format(value || 0);
  } catch (err) {
    return `EGP ${(Number(value) || 0).toFixed(2)}`;
  }
}

let persistHandle = null;
let persistHandleUsesIdle = false;

function writeStateToStorage() {  try {
    const payload = {
      cart: state.cart.map((entry) => ({ id: entry.id, quantity: entry.quantity })),
      checkout: { ...state.checkout },
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to store cart", err);
  }
}
function cancelScheduledPersist() {
  if (persistHandle === null) return;
  if (
    persistHandleUsesIdle &&
    typeof window !== "undefined" &&
    typeof window.cancelIdleCallback === "function"
  ) {
    window.cancelIdleCallback(persistHandle);
  } else {
    clearTimeout(persistHandle);
  }
  persistHandle = null;
}

function persistState(options = {}) {
  const immediate = options.immediate === true;
  if (immediate) {
    cancelScheduledPersist();
    writeStateToStorage();
    return;
  }

  if (persistHandle !== null) {
    return;
  }

  const flush = () => {
    persistHandle = null;
    writeStateToStorage();
  };

  if (
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
  ) {
    persistHandleUsesIdle = true;
    persistHandle = window.requestIdleCallback(flush, { timeout: 250 });
  } else {
    persistHandleUsesIdle = false;
    persistHandle = window.setTimeout(flush, 120);
  }
}
function calculateSubtotal() {
  return state.cart.reduce((total, entry) => {
    const menuItem = menuIndex.get(entry.id);
    if (!menuItem) return total;
    return total + menuItem.price * entry.quantity;
  }, 0);
}

function updateCartBadge() {
  if (!cartDock) return;
  const count = state.cart.reduce((sum, entry) => sum + entry.quantity, 0);
  if (count > 0) {
    cartDock.dataset.count = String(count);
  } else {
    delete cartDock.dataset.count;
  }
   const badgeLabel = cartDock.querySelector('[data-role="cart-count"]');
  if (badgeLabel) {
    badgeLabel.textContent = count > 0 ? `${count} item${count === 1 ? '' : 's'} in cart` : 'Cart is empty';
  }
}

function openOverlay(panel) {
  if (!panel) return;
  if (activeOverlay === panel) {
    closeOverlay();
    return;
  }
  closeOverlay();
  panel.classList.add("is-open");
  document.body.classList.add("has-overlay");
  activeOverlay = panel;
  if (panel === quickNavPanel && quickNavToggle) {
    quickNavToggle.setAttribute("aria-expanded", "true");
  }
}

function closeOverlay() {
  if (!activeOverlay) return;
  activeOverlay.classList.remove("is-open");
  document.body.classList.remove("has-overlay");
  if (activeOverlay === quickNavPanel && quickNavToggle) {
    quickNavToggle.setAttribute("aria-expanded", "false");
  }
  activeOverlay = null;
}

function renderQuickMenu() {
  if (!quickOrderList) return;
  const fragment = document.createDocumentFragment();
  quickMenu.forEach((group) => {
    const category = document.createElement("div");
    category.className = "quick-order__category";
    category.textContent = group.title;
    fragment.appendChild(category);

    if (group.note) {
      const note = document.createElement("div");
      note.className = "quick-order__note";
      note.textContent = group.note;
      fragment.appendChild(note);
    }

    group.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "quick-order__card";
      card.dataset.itemId = item.id;

      const title = document.createElement("h4");
      title.textContent = item.name;
      card.appendChild(title);

      if (item.description) {
        const desc = document.createElement("p");
        desc.className = "muted";
        desc.style.fontSize = "13px";
        desc.style.margin = "0";
        desc.textContent = item.description;
        card.appendChild(desc);
      }

      const price = document.createElement("div");
      price.className = "quick-order__price";
      price.textContent = formatCurrency(item.price);
      card.appendChild(price);

      const actions = document.createElement("div");
      actions.className = "quick-order__actions";

      const qtyLabel = document.createElement("label");
      qtyLabel.className = "muted";
      qtyLabel.style.display = "flex";
      qtyLabel.style.flexDirection = "column";
      qtyLabel.style.fontSize = "12px";
      qtyLabel.style.gap = "4px";
      qtyLabel.textContent = "Qty";

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = "20";
      qtyInput.value = "1";
      qtyInput.dataset.role = "quantity";
      qtyLabel.appendChild(qtyInput);
      actions.appendChild(qtyLabel);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn small";
      addBtn.textContent = "Add";
      addBtn.dataset.action = "add";
      actions.appendChild(addBtn);

      card.appendChild(actions);
      fragment.appendChild(card);
    });
  });
  quickOrderList.textContent = "";
  quickOrderList.appendChild(fragment);
}

function updateSplitVisibility() {
  if (!quickPaymentSplit) return;
  const isSplit = state.checkout.paymentMethod === "split";
  quickPaymentSplit.hidden = !isSplit;
  if (!isSplit) {
    if (quickCashAmount) quickCashAmount.value = "";
    if (quickInstapayAmount) quickInstapayAmount.value = "";
    return;
  }
  const total = calculateSubtotal();
   state.checkout.cashAmount = normalizeCurrencyValue(state.checkout.cashAmount);
  state.checkout.instapayAmount = normalizeCurrencyValue(state.checkout.instapayAmount);
  if (!state.checkout.cashAmount && !state.checkout.instapayAmount && total > 0) {
  const suggestion = calculateSplitSuggestion(total);
    state.checkout.cashAmount = suggestion.cash;
    state.checkout.instapayAmount = suggestion.instapay;
  }
  if (quickCashAmount) {
 quickCashAmount.value = state.checkout.cashAmount
      ? state.checkout.cashAmount.toFixed(2)
      : "";  }
  if (quickInstapayAmount) {
 quickInstapayAmount.value = state.checkout.instapayAmount
      ? state.checkout.instapayAmount.toFixed(2)
      : "";  }
}

function updateCartSummary({ persist = true } = {}) {
  const subtotal = calculateSubtotal();
  if (quickSubtotal) quickSubtotal.textContent = formatCurrency(subtotal);
  if (quickTotal) quickTotal.textContent = formatCurrency(subtotal);

  const hasItems = state.cart.length > 0;
  if (quickCartSummary) quickCartSummary.hidden = !hasItems;
  if (quickCartClear) quickCartClear.hidden = !hasItems;

  if (state.checkout.paymentMethod === "cash") {
    state.checkout.cashAmount = normalizeCurrencyValue(subtotal);
    state.checkout.instapayAmount = 0;
  } else if (state.checkout.paymentMethod === "instapay") {
    state.checkout.cashAmount = 0;
    state.checkout.instapayAmount = normalizeCurrencyValue(subtotal);
  }

  if (state.checkout.paymentMethod !== "split") {
    updateSplitVisibility();
  } else if (state.checkout.paymentMethod === "split") {
    updateSplitVisibility();
  }

  if (subtotal === 0 && quickCartStatus) {
    quickCartStatus.textContent = "";
  }

  if (persist) persistState();
}

function renderCart({ persist = true } = {}) {
  if (!quickCartItems) return;
 quickCartItems.textContent = "";

  const fragment = document.createDocumentFragment();
  if (!state.cart.length) {
    const empty = document.createElement("div");
    empty.className = "quick-cart__empty";
    empty.textContent = "Your cart is empty.";
  fragment.appendChild(empty);
    quickCartItems.appendChild(fragment);
    updateCartSummary({ persist });
    updateCartBadge();
    return;
  }

  state.cart.forEach((entry, index) => {
    const menuItem = menuIndex.get(entry.id);
    if (!menuItem) return;

    const itemEl = document.createElement("div");
    itemEl.className = "quick-cart__item";
    itemEl.dataset.index = String(index);

    const row = document.createElement("div");
    row.className = "quick-cart__row";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${entry.quantity}× ${menuItem.name}</strong>`;
    row.appendChild(title);

    const price = document.createElement("div");
    price.className = "quick-order__price";
    price.textContent = formatCurrency(menuItem.price * entry.quantity);
    row.appendChild(price);

    itemEl.appendChild(row);

    const controls = document.createElement("div");
    controls.className = "quick-cart__controls";

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.action = "decrease";
    decrease.dataset.index = String(index);
    decrease.textContent = "−";
    controls.appendChild(decrease);

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.max = "99";
    qtyInput.value = String(entry.quantity);
    qtyInput.dataset.action = "quantity";
    qtyInput.dataset.index = String(index);
    controls.appendChild(qtyInput);

    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.action = "increase";
    increase.dataset.index = String(index);
    increase.textContent = "+";
    controls.appendChild(increase);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.action = "remove";
    remove.dataset.index = String(index);
    remove.textContent = "Remove";
    controls.appendChild(remove);

    itemEl.appendChild(controls);
    fragment.appendChild(itemEl);
  });
  quickCartItems.appendChild(fragment);

  updateCartSummary({ persist });
  updateCartBadge();
}

function addToCart(itemId, quantity = 1) {
  const menuItem = menuIndex.get(itemId);
  if (!menuItem) return;
  const qty = Math.min(99, Math.max(1, quantity));
  const existing = state.cart.find((entry) => entry.id === itemId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + qty);
  } else {
    state.cart.push({ id: itemId, quantity: qty });
  }
  persistState();
  renderCart({ persist: false });
  updateCartSummary({ persist: true });
  updateCartBadge();
}

function setPaymentMethod(method) {
  state.checkout.paymentMethod = method;
  updateCartSummary({ persist: true });
}

function validatePaymentBreakdown() {
  if (!quickCartStatus) return true;
  quickCartStatus.textContent = "";

  const total = Math.round(calculateSubtotal() * 100) / 100;
  if (!total) return true;

  if (state.checkout.paymentMethod === "split") {
 const cash = normalizeCurrencyValue(quickCashAmount?.value || "0");
    const instapay = normalizeCurrencyValue(quickInstapayAmount?.value || "0");
    state.checkout.cashAmount = cash;
    state.checkout.instapayAmount = instapay;
    const paid = Math.round((cash + instapay) * 100) / 100;
    if (!cash || !instapay) {
      quickCartStatus.textContent = "Enter both cash and Instapay amounts.";
      return false;
    }
    if (paid !== total) {
      quickCartStatus.textContent = `Split payments should add up to ${formatCurrency(total)}.`;
      return false;
    }
  }

  return true;
}

function hydrateForm() {
  if (quickName) quickName.value = state.checkout.name || "";
  if (quickPhone) quickPhone.value = state.checkout.phone || "";
  if (quickNotes) quickNotes.value = state.checkout.notes || "";

  const method = state.checkout.paymentMethod || "cash";
  const radios = quickCartForm?.elements?.quickPayment;
  if (radios) {
    if (radios instanceof RadioNodeList) {
      Array.from(radios).forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = input.value === method;
        }
      });
    } else if (radios instanceof HTMLInputElement) {
      radios.checked = radios.value === method;
    }
  }
  updateSplitVisibility();
  updateCartSummary({ persist: false });
  updateCartBadge();
}
function applySharedCheckoutSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") return;

  if (typeof snapshot.name === "string") {
    state.checkout.name = snapshot.name;
  }
  if (typeof snapshot.phone === "string") {
    state.checkout.phone = snapshot.phone;
  }
  if (typeof snapshot.notes === "string") {
    state.checkout.notes = snapshot.notes;
  }
  if (typeof snapshot.email === "string") {
    state.checkout.email = snapshot.email;
  }
  if (typeof snapshot.paymentMethod === "string") {
    state.checkout.paymentMethod = snapshot.paymentMethod;
  }
  if (typeof snapshot.cashAmount !== "undefined") {
    state.checkout.cashAmount = normalizeCurrencyValue(snapshot.cashAmount);
  }
  if (typeof snapshot.instapayAmount !== "undefined") {
    state.checkout.instapayAmount = normalizeCurrencyValue(snapshot.instapayAmount);
  }

  hydrateForm();
}

function handleSharedCartSync(detail = {}) {
  const incomingCart = Array.isArray(detail.cart)
    ? detail.cart
        .map((entry) => ({
          id: entry?.id,
          quantity: Math.max(1, Number.parseInt(entry?.quantity, 10) || 1),
        }))
        .filter((entry) => typeof entry.id === "string" && menuIndex.has(entry.id))
    : [];

  state.cart = incomingCart;
  renderCart({ persist: false });

  if (detail.checkout && typeof detail.checkout === "object") {
    applySharedCheckoutSnapshot(detail.checkout);
  }
}

function getAuthUser() {
  return window.__tuxAuthUser || null;
}
function navigateToOrderPage() {
  const destination = getAuthUser()
    ? "order.html"
    : `account.html?redirect=${encodeURIComponent("order.html")}`;
  window.location.href = destination;
}
function handlePlaceOrder(event) {
  event.preventDefault();
  if (!state.cart.length) {
    if (quickCartStatus) quickCartStatus.textContent = "Add items to your cart first.";
    return;
  }

  if (quickCartForm && !quickCartForm.reportValidity()) {
    return;
  }

  if (!validatePaymentBreakdown()) {
    return;
  }

  state.checkout.name = quickName?.value.trim() || "";
  state.checkout.phone = quickPhone?.value.trim() || "";
  state.checkout.notes = quickNotes?.value.trim() || "";

  persistState({ immediate: true });

  const transferPayload = {
    cart: state.cart.map((entry) => ({ id: entry.id, quantity: entry.quantity })),
checkout: {
      ...state.checkout,
      cashAmount: normalizeCurrencyValue(state.checkout.cashAmount),
      instapayAmount: normalizeCurrencyValue(state.checkout.instapayAmount),
    },    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(transferKey, JSON.stringify(transferPayload));
  } catch (err) {
    console.warn("Could not persist transfer payload", err);
  }

  navigateToOrderPage();

}

function attachEvents() {
  quickNavToggle?.addEventListener("click", () => openOverlay(quickNavPanel));

  orderDock?.addEventListener("click", navigateToOrderPage);
  heroOrderBtn?.addEventListener("click", navigateToOrderPage);

  cartDock?.addEventListener("click", () => openOverlay(cartPanel));

  document.addEventListener("click", (event) => {
    if (!activeOverlay) return;
    if (event.target instanceof HTMLElement) {
      if (event.target.matches("[data-close]")) {
        closeOverlay();
      }
      if (event.target.matches("[data-close-panel]")) {
        closeOverlay();
      }
      if (event.target === activeOverlay) {
        closeOverlay();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOverlay();
    }
  });

  if (quickOrderList) {
    quickOrderList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action !== "add") return;
      const card = target.closest("article[data-item-id]");
      if (!card) return;
      const itemId = card.getAttribute("data-item-id");
      if (!itemId) return;
      const qtyInput = card.querySelector("input[data-role='quantity']");
      const quantity = qtyInput ? Number.parseInt(qtyInput.value, 10) || 1 : 1;
      addToCart(itemId, quantity);
    });
  }

  quickCartItems?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    const index = Number.parseInt(target.dataset.index || "", 10);
    if (Number.isNaN(index) || !state.cart[index]) return;

    if (action === "remove") {
      state.cart.splice(index, 1);
    } else if (action === "increase") {
      state.cart[index].quantity = Math.min(99, state.cart[index].quantity + 1);
    } else if (action === "decrease") {
      state.cart[index].quantity = Math.max(1, state.cart[index].quantity - 1);
    }

    persistState();
    renderCart({ persist: false });
    updateCartSummary({ persist: true });
    updateCartBadge();
  });

  quickCartItems?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.action !== "quantity") return;
    const index = Number.parseInt(target.dataset.index || "", 10);
    if (Number.isNaN(index) || !state.cart[index]) return;
    const nextValue = Math.max(1, Math.min(99, Number.parseInt(target.value, 10) || 1));
    state.cart[index].quantity = nextValue;
    target.value = String(nextValue);
    persistState();
    renderCart({ persist: false });
    updateCartSummary({ persist: true });
    updateCartBadge();
  });

  quickCartClear?.addEventListener("click", () => {
    state.cart = [];
  persistState({ immediate: true });
    renderCart({ persist: false });
    updateCartSummary({ persist: true });
    updateCartBadge();
  });

  quickCartForm?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "quickPayment") {
      setPaymentMethod(target.value);
      updateSplitVisibility();
      updateCartSummary({ persist: true });
    }
  });

  quickCartForm?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === quickName) {
      state.checkout.name = quickName.value;
      persistState();
    } else if (target === quickPhone) {
      state.checkout.phone = quickPhone.value;
      persistState();
    } else if (target === quickNotes) {
      state.checkout.notes = quickNotes.value;
      persistState();
    } else if (target === quickCashAmount || target === quickInstapayAmount) {
      validatePaymentBreakdown();
      persistState();
    }
  });

  quickCartForm?.addEventListener("submit", handlePlaceOrder);

  document.addEventListener("tux-auth-change", (event) => {
    const detail = event.detail || {};
 const summary = detail.user || null;

    if (accountDock) {
      accountDock.href = summary ? "profile.html" : "account.html";
    }

    const nextEmail = summary?.email || "";
    if (state.checkout.email !== nextEmail) {
      state.checkout.email = nextEmail;
      persistState();
    }
  });
}

function initRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");
 if (!revealEls.length) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (
    prefersReducedMotion ||
    typeof window === "undefined" ||
    !("IntersectionObserver" in window)
 ) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const makeVisible = (el) => {
    el.classList.add("is-visible");
  };
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
   if (entry.isIntersecting || entry.intersectionRatio > 0) {
          makeVisible(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
{
      root: null,
      rootMargin: "0px 0px -10%",
      threshold: 0,
    }  );

 revealEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.9) {
      makeVisible(el);
    } else {
      observer.observe(el);
    }
  });}

renderQuickMenu();
renderCart({ persist: false });
hydrateForm();
attachEvents();
initRevealAnimations();
updateCartSummary({ persist: false });
updateCartBadge();
if (typeof window !== "undefined") {
  window.addEventListener("tux-cart-sync", (event) => {
    handleSharedCartSync(event?.detail || {});
  });
  window.addEventListener("message", (event) => {
    if (event?.data && event.data.type === "tux-cart-sync") {
      handleSharedCartSync(event.data.payload || {});
    }
  });
  window.addEventListener("pagehide", () => persistState({ immediate: true }));
}
