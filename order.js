import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const selectors = {
  form: document.getElementById("orderForm"),
  status: document.getElementById("orderStatus"),
  name: document.getElementById("orderName"),
  address: document.getElementById("orderAddress"),
  phone: document.getElementById("orderPhone"),
  email: document.getElementById("orderEmail"),
  itemsField: document.getElementById("orderItems"),
  notes: document.getElementById("orderNotes"),
  submit: document.getElementById("orderSubmit"),
  recentOrders: document.getElementById("recentOrders"),
  noOrdersNotice: document.getElementById("noOrders"),
  menuContainer: document.getElementById("menuList"),
  cartContainer: document.getElementById("cartItems"),
  emptyCart: document.getElementById("emptyCart"),
  subtotal: document.getElementById("cartSubtotal"),
  delivery: document.getElementById("cartDeliveryFee"),
  total: document.getElementById("cartTotal"),
  deliveryRow: document.getElementById("deliveryFeeRow"),
  zoneSelect: document.getElementById("deliveryZone"),
  zoneField: document.getElementById("deliveryZoneField"),
  zoneNote: document.getElementById("deliveryZoneNote"),
  clearCart: document.getElementById("clearCart"),
};

const fulfillmentInputs = Array.from(document.querySelectorAll("input[name='fulfillment']"));
const paymentInputs = Array.from(document.querySelectorAll("input[name='payment']"));

const formatEGP = (value) => {
  try {
    return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }).format(value);
  } catch {
    return `EGP ${Number(value || 0).toFixed(2)}`;
  }
};

const DELIVERY_ZONES = [
  { id: "zahraa-el-maadi", name: "Zahraa El Maadi", fee: 25 },
  { id: "kornish-el-maadi", name: "Kornish El Maadi", fee: 40 },
];

const BURGER_EXTRAS = [
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
];

const HAWAWSHI_EXTRAS = [
  { id: "mozzarella-cheese", name: "Mozzarella Cheese", price: 20 },
  { id: "tux-hawawshi-sauce", name: "TUX Hawawshi Sauce", price: 10 },
  { id: "hawawshi-condiments", name: "BBQ / Ketchup / Sweet Chili / Hot Sauce", price: 5 },
];

const MENU = [
  {
    id: "single-smashed-patty",
    name: "Single Smashed Patty",
    description: "Smashed patty, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
    price: 95,
    category: "Smash Burgers",
    extras: BURGER_EXTRAS,
  },
  {
    id: "double-smashed-patty",
    name: "Double Smashed Patty",
    description: "Two smashed patties, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
    price: 140,
    category: "Smash Burgers",
    extras: BURGER_EXTRAS,
  },
  {
    id: "triple-smashed-patty",
    name: "Triple Smashed Patty",
    description: "Triple the patties with all the classic TUX toppings and sauce.",
    price: 160,
    category: "Smash Burgers",
    extras: BURGER_EXTRAS,
  },
  {
    id: "quatro-smashed-patty",
    name: "TUX Quatro Smashed Patty",
    description: "Four smashed patties, cheese, caramelized onion, mushroom, TUX sauce.",
    price: 190,
    category: "Smash Burgers",
    extras: BURGER_EXTRAS,
  },
  {
    id: "tuxify-single",
    name: "TUXIFY Single",
    description: "Brioche bun, beef patty, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
    price: 120,
    category: "TUXIFY",
    extras: BURGER_EXTRAS,
  },
  {
    id: "tuxify-double",
    name: "TUXIFY Double",
    description: "Double beef patties with American cheese, pickles, onion, ketchup, TUXIFY sauce.",
    price: 160,
    category: "TUXIFY",
    extras: BURGER_EXTRAS,
  },
  {
    id: "tuxify-triple",
    name: "TUXIFY Triple",
    description: "Three beef patties layered with American cheese and TUXIFY sauce.",
    price: 200,
    category: "TUXIFY",
    extras: BURGER_EXTRAS,
  },
  {
    id: "tuxify-quatro",
    name: "TUXIFY Quatro",
    description: "Four beef patties, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
    price: 240,
    category: "TUXIFY",
    extras: BURGER_EXTRAS,
  },
  {
    id: "classic-fries-small",
    name: "Classic Fries (Small)",
    price: 25,
    category: "Fries",
    extras: [],
  },
  {
    id: "classic-fries-large",
    name: "Classic Fries (Large)",
    price: 30,
    category: "Fries",
    extras: [],
  },
  {
    id: "cheese-fries",
    name: "Cheese Fries",
    price: 30,
    category: "Fries",
    extras: [],
  },
  {
    id: "chili-fries",
    name: "Chili Fries",
    price: 40,
    category: "Fries",
    extras: [],
  },
  {
    id: "tux-fries",
    name: "TUX Fries",
    description: "Fries, smashed patty, cheese, pickles, caramelised onion, jalapeño, TUX sauce.",
    price: 75,
    category: "Fries",
    extras: [],
  },
  {
    id: "doppy-fries",
    name: "Doppy Fries",
    price: 95,
    category: "Fries",
    extras: [],
  },
  {
    id: "classic-hawawshi",
    name: "Classic Hawawshi",
    description: "Baladi bread, hawawshi meat, onion. Served with chili sauce.",
    price: 80,
    category: "Hawawshi",
    extras: HAWAWSHI_EXTRAS,
  },
  {
    id: "tux-hawawshi",
    name: "TUX Hawawshi",
    description: "Baladi bread, hawawshi meat, mozzarella, onion, TUX hawawshi sauce.",
    price: 100,
    category: "Hawawshi",
    extras: HAWAWSHI_EXTRAS,
  },
  {
    id: "soda",
    name: "Soda",
    price: 20,
    category: "Drinks",
    extras: [],
  },
  {
    id: "water",
    name: "Water",
    price: 10,
    category: "Drinks",
    extras: [],
  },
];

const state = {
  user: null,
  profileRef: null,
  cart: [],
  cachedAddress: "",
};

const config = {
  email: {
    service: "",
    template: "",
    publicKey: "",
    from: "",
    cc: "",
    bcc: "",
    replyTo: "",
  },
  sync: {
    collection: "",
    restaurantId: "",
    webhook: "",
    settingsDoc: "",
  },
};

function compact(object) {
  return Object.entries(object || {}).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    if (typeof value === "string") {
      const t = value.trim();
      if (!t.length) return acc;
      acc[key] = t;
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
}

function applyDatasetConfig() {
  if (!selectors.form) return;
  const { dataset } = selectors.form;

  config.email.service = dataset.emailService?.trim() || "";
  config.email.template = dataset.emailTemplate?.trim() || "";
  config.email.publicKey = dataset.emailPublic?.trim() || "";
  config.email.from = dataset.emailFrom?.trim() || "ahmeedmostafaa@hotmail.com";
  config.email.cc = dataset.emailCc?.trim() || "";
  config.email.bcc = dataset.emailBcc?.trim() || "";
  config.email.replyTo = dataset.emailReply?.trim() || "";

  config.sync.collection = dataset.syncCollection?.trim() || "";
  config.sync.restaurantId = dataset.syncRestaurant?.trim() || "";
  config.sync.webhook = dataset.syncWebhook?.trim() || "";
  config.sync.settingsDoc = dataset.settingsDoc?.trim() || "";

  if (config.email.publicKey && window.emailjs) {
    try {
      window.emailjs.init(config.email.publicKey);
    } catch (e) {
      console.warn("Failed to init EmailJS", e);
    }
  }
}

async function loadRemoteSettings() {
  if (!config.sync.settingsDoc) return;
  try {
    const segments = config.sync.settingsDoc.split("/").map((s) => s.trim()).filter(Boolean);
    if (!segments.length || segments.length % 2 !== 0) return;
    const settingsRef = doc(db, ...segments);
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) return;
    const data = snap.data();

    if (data.email) {
      const { service, template, publicKey, fromEmail, ccEmail, bccEmail, replyTo } = data.email;
      config.email.service = service?.trim() || config.email.service;
      config.email.template = template?.trim() || config.email.template;
      config.email.publicKey = publicKey?.trim() || config.email.publicKey;
      config.email.from = fromEmail?.trim() || config.email.from;
      config.email.cc = ccEmail?.trim() || config.email.cc;
      config.email.bcc = bccEmail?.trim() || config.email.bcc;
      config.email.replyTo = replyTo?.trim() || config.email.replyTo;
      if (config.email.publicKey && window.emailjs) {
        try {
          window.emailjs.init(config.email.publicKey);
        } catch (e) {
          console.warn("Failed to re-init EmailJS", e);
        }
      }
    }
    if (data.integrations) {
      const { collectionPath, restaurantId, webhookUrl } = data.integrations;
      config.sync.collection = collectionPath?.trim() || config.sync.collection;
      config.sync.restaurantId = restaurantId?.trim() || config.sync.restaurantId;
      config.sync.webhook = webhookUrl?.trim() || config.sync.webhook;
    }
  } catch (e) {
    console.warn("Could not load remote order settings", e);
  }
}

function showStatus(message, isError = false) {
  if (!selectors.status) return;
  selectors.status.textContent = message;
  selectors.status.style.color = isError ? "#e74c3c" : "var(--muted)";
}

function activeFulfillment() {
  return fulfillmentInputs.find((i) => i.checked)?.value || "pickup";
}

function activePayment() {
  return paymentInputs.find((i) => i.checked)?.value || "cash";
}

function activeZone() {
  const zoneId = selectors.zoneSelect?.value || "";
  return DELIVERY_ZONES.find((z) => z.id === zoneId) || null;
}

function resetAddressForPickup() {
  if (!selectors.address) return;
  state.cachedAddress = selectors.address.value.trim() || state.cachedAddress;
  selectors.address.value = "";
  selectors.address.placeholder = "Pickup — no address needed";
}

function restoreAddressForDelivery() {
  if (!selectors.address) return;
  selectors.address.placeholder = "Street, City (required for delivery)";
  if (!selectors.address.value && state.cachedAddress) {
    selectors.address.value = state.cachedAddress;
  }
}

function updateFulfillmentUI() {
  const needsDelivery = activeFulfillment() === "delivery";

  if (selectors.address) {
    selectors.address.required = needsDelivery;
    selectors.address.disabled = !needsDelivery;
    const wrapper = selectors.address.closest("label");
    if (wrapper) {
      wrapper.style.display = needsDelivery ? "" : "none";
      wrapper.setAttribute("aria-hidden", needsDelivery ? "false" : "true");
    }
    if (needsDelivery) restoreAddressForDelivery();
    else resetAddressForPickup();
  }

  if (selectors.zoneSelect) {
    selectors.zoneSelect.required = needsDelivery;
    selectors.zoneSelect.disabled = !needsDelivery;
    if (!needsDelivery) selectors.zoneSelect.value = "";
  }

  if (selectors.zoneField) selectors.zoneField.style.display = needsDelivery ? "" : "none";
  if (selectors.zoneNote) selectors.zoneNote.style.display = needsDelivery ? "" : "none";
  if (selectors.deliveryRow) selectors.deliveryRow.style.display = needsDelivery ? "flex" : "none";

  refreshCart();
}

function calculateExtrasTotal(extras) {
  return extras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
}

function lineTotal(entry) {
  const extras = calculateExtrasTotal(entry.extras || []);
  return (entry.price + extras) * entry.quantity;
}

function cartSubtotal() {
  return state.cart.reduce((sum, e) => sum + lineTotal(e), 0);
}

function buildCartSummary() {
  return state.cart
    .map((entry) => {
      const extras = entry.extras?.length ? ` + ${entry.extras.map((x) => `${x.name}`).join(", ")}` : "";
      return `${entry.quantity}× ${entry.name}${extras}`;
    })
    .join("\n");
}

function updateHiddenItemsField() {
  if (selectors.itemsField) {
    selectors.itemsField.value = buildCartSummary();
  }
}

function renderCartRows() {
  if (!selectors.cartContainer || !selectors.emptyCart) return;
  selectors.cartContainer.innerHTML = "";
  if (!state.cart.length) {
    selectors.emptyCart.style.display = "block";
    return;
  }
  selectors.emptyCart.style.display = "none";

  state.cart.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "cart-item";

    const header = document.createElement("div");
    header.className = "cart-item__row";
    header.innerHTML = `<span>${entry.quantity}× ${entry.name}</span><span>${formatEGP(lineTotal(entry))}</span>`;
    item.appendChild(header);

    if (entry.extras?.length) {
      const extras = document.createElement("div");
      extras.className = "cart-item__extras";
      extras.textContent = `Extras: ${entry.extras.map((x) => x.name).join(", ")}`;
      item.appendChild(extras);
    }

    const controls = document.createElement("div");
    controls.className = "cart-item__controls";

    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.dataset.action = "decrement";
    decrement.dataset.index = String(index);
    decrement.textContent = "−";

    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.max = "20";
    qty.value = String(entry.quantity);
    qty.dataset.action = "quantity";
    qty.dataset.index = String(index);

    const increment = document.createElement("button");
    increment.type = "button";
    increment.dataset.action = "increment";
    increment.dataset.index = String(index);
    increment.textContent = "+";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.action = "remove";
    remove.dataset.index = String(index);
    remove.textContent = "Remove";

    controls.append(decrement, qty, increment, remove);
    item.appendChild(controls);
    selectors.cartContainer.appendChild(item);
  });
}

function renderTotals() {
  if (!selectors.subtotal || !selectors.delivery || !selectors.total) return;
  const subtotal = cartSubtotal();
  const needsDelivery = activeFulfillment() === "delivery";
  const zone = needsDelivery ? activeZone() : null;
  const deliveryFee = zone ? zone.fee : 0;

  selectors.subtotal.textContent = formatEGP(subtotal);
  selectors.delivery.textContent = needsDelivery ? (zone ? formatEGP(deliveryFee) : "Select zone") : formatEGP(0);
  selectors.total.textContent = formatEGP(subtotal + (needsDelivery ? deliveryFee : 0));
}

function refreshCart() {
  renderCartRows();
  updateHiddenItemsField();
  renderTotals();
}

function handleCartControls(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || !state.cart[index]) return;

  if (action === "remove") {
    const [removed] = state.cart.splice(index, 1);
    refreshCart();
    showStatus(`${removed?.name || "Item"} removed from cart.`);
    return;
  }
  if (action === "increment") {
    state.cart[index].quantity = Math.min(state.cart[index].quantity + 1, 99);
    refreshCart();
    return;
  }
  if (action === "decrement") {
    state.cart[index].quantity = Math.max(state.cart[index].quantity - 1, 1);
    refreshCart();
    return;
  }
  if (action === "quantity" && target instanceof HTMLInputElement) {
    const next = parseInt(target.value, 10);
    if (Number.isNaN(next) || next < 1) {
      target.value = String(state.cart[index].quantity);
      return;
    }
    state.cart[index].quantity = Math.min(next, 99);
    refreshCart();
  }
}

function createExtrasList(menuItem) {
  if (!menuItem.extras?.length) return null;
  const wrapper = document.createElement("div");
  wrapper.className = "order-menu-card__extras";
  wrapper.hidden = true;
  wrapper.setAttribute("aria-hidden", "true");

  menuItem.extras.forEach((extra) => {
    const label = document.createElement("label");
    label.className = "order-menu-card__extra";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.extraId = extra.id;
    checkbox.dataset.extraName = extra.name;
    checkbox.dataset.extraPrice = String(extra.price);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`${extra.name} (+${formatEGP(extra.price)})`));
    wrapper.appendChild(label);
  });

  return wrapper;
}

function createMenuCard(menuItem) {
  const card = document.createElement("article");
  card.className = "order-menu-card";
  card.dataset.itemId = menuItem.id;

  const header = document.createElement("div");
  header.className = "order-menu-card__header";

  const title = document.createElement("h4");
  title.textContent = menuItem.name;
  header.appendChild(title);

  const price = document.createElement("span");
  price.className = "order-menu-card__price";
  price.textContent = formatEGP(menuItem.price);
  header.appendChild(price);
  card.appendChild(header);

  if (menuItem.description) {
    const description = document.createElement("p");
    description.className = "order-menu-card__description";
    description.textContent = menuItem.description;
    card.appendChild(description);
  }

  const controls = document.createElement("div");
  controls.className = "order-menu-card__controls";

  const qtyLabel = document.createElement("label");
  qtyLabel.textContent = "Quantity";
  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.max = "20";
  qtyInput.value = "1";
  qtyInput.dataset.role = "quantity";
  qtyLabel.appendChild(qtyInput);
  controls.appendChild(qtyLabel);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "btn";
  addButton.textContent = "Add to cart";
  addButton.addEventListener("click", () => addItemToCart(menuItem, card));
  controls.appendChild(addButton);
  card.appendChild(controls);

  if (menuItem.extras?.length) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "order-menu-card__extras-toggle";
    toggle.textContent = "Add extras";
    toggle.setAttribute("aria-expanded", "false");

    const extrasList = createExtrasList(menuItem);
    if (extrasList) {
      toggle.addEventListener("click", () => {
        const nextState = extrasList.hidden;
        extrasList.hidden = !nextState;
        extrasList.setAttribute("aria-hidden", extrasList.hidden ? "true" : "false");
        toggle.setAttribute("aria-expanded", extrasList.hidden ? "false" : "true");
        toggle.textContent = extrasList.hidden ? "Add extras" : "Hide extras";
      });
      card.appendChild(toggle);
      card.appendChild(extrasList);
    }
  }

  return card;
}

function groupMenuItems() {
  return MENU.reduce((groups, item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

function renderMenu() {
  if (!selectors.menuContainer) return;
  selectors.menuContainer.innerHTML = "";
  const grouped = groupMenuItems();
  Object.entries(grouped).forEach(([category, items]) => {
    const section = document.createElement("section");
    section.className = "menu-group";

    const heading = document.createElement("h4");
    heading.textContent = category;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "menu-items";
    items.forEach((item) => list.appendChild(createMenuCard(item)));
    section.appendChild(list);

    selectors.menuContainer.appendChild(section);
  });
}

function addItemToCart(menuItem, cardElement) {
  const qtyField = cardElement.querySelector("input[data-role='quantity']");
  let quantity = parseInt(qtyField?.value ?? "1", 10);
  if (Number.isNaN(quantity) || quantity < 1) quantity = 1;
  if (quantity > 99) quantity = 99;
  if (qtyField) qtyField.value = String(quantity);

  const extras = Array.from(cardElement.querySelectorAll("input[data-extra-id]:checked")).map((checkbox) => ({
    id: checkbox.dataset.extraId,
    name: checkbox.dataset.extraName,
    price: Number(checkbox.dataset.extraPrice) || 0,
  }));

  state.cart.push({
    itemId: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity,
    extras,
  });

  cardElement.querySelectorAll("input[data-extra-id]").forEach((checkbox) => {
    checkbox.checked = false;
  });
  const extrasFieldset = cardElement.querySelector(".order-menu-card__extras");
  const toggle = cardElement.querySelector(".order-menu-card__extras-toggle");
  if (extrasFieldset instanceof HTMLElement) {
    extrasFieldset.hidden = true;
    extrasFieldset.setAttribute("aria-hidden", "true");
  }
  if (toggle instanceof HTMLButtonElement) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Add extras";
  }
  if (qtyField) qtyField.value = "1";

  refreshCart();
  showStatus(`${menuItem.name} added to cart.`);
}

function clearCart() {
  if (!state.cart.length) return;
  state.cart = [];
  refreshCart();
  showStatus("Cart cleared. Add items again when you're ready.");
}

async function sendConfirmationEmail(order, orderId) {
  if (!window.emailjs || !config.email.service || !config.email.template) return;
  const templateParams = {
    order_id: orderId,
    to_email: order.email,
    from_email: config.email.from || "ahmeedmostafaa@hotmail.com",
    reply_to: config.email.replyTo || order.email,
    customer_name: order.customerName,
    order_items: order.items,
    order_total: formatEGP(order.total),
    fulfillment: order.fulfillment === "delivery" ? "Delivery" : "Pickup",
    payment_method: order.paymentMethod === "card" ? "Instapay on delivery" : "Cash",
    phone: order.phone,
    address: order.address || "Pickup order",
    notes: order.instructions || "None",
    delivery_zone: order.deliveryZone || "",
    restaurant_id: config.sync.restaurantId || "",
  };
  if (config.email.cc) templateParams.cc_email = config.email.cc;
  if (config.email.bcc) templateParams.bcc_email = config.email.bcc;

  try {
    await window.emailjs.send(config.email.service, config.email.template, templateParams);
  } catch (e) {
    console.warn("Confirmation email failed", e);
  }
}

async function syncOrderToBoard(order, orderId) {
  if (!config.sync.collection) return;
  const segments = config.sync.collection.split("/").map((s) => s.trim()).filter(Boolean);
  if (!segments.length) return;
  try {
    const targetCollection = collection(db, ...segments);
    await addDoc(targetCollection, {
      ...order,
      orderId,
      source: "web",
      syncedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Failed to sync order to main board", e);
  }
}

async function postOrderWebhook(order, orderId) {
  if (!config.sync.webhook) return;
  try {
    await fetch(config.sync.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, orderId }),
    });
  } catch (e) {
    console.warn("Order webhook failed", e);
  }
}

async function storeOrderUnderProfile(order) {
  if (!state.profileRef) return null;
  const ordersRef = collection(state.profileRef, "orders");
  const docRef = await addDoc(ordersRef, order);
  return docRef.id;
}

function formatTimestamp(value) {
  try {
    if (!value) return new Date().toLocaleString();
    if (typeof value.toDate === "function") return value.toDate().toLocaleString();
    if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
  } catch (e) {
    console.warn("Failed to format timestamp", e);
  }
  return new Date().toLocaleString();
}

async function loadRecentOrders() {
  if (!state.profileRef || !selectors.recentOrders || !selectors.noOrdersNotice) return;
  try {
    const snapshot = await getDocs(
      query(collection(state.profileRef, "orders"), orderBy("createdAt", "desc"), limit(5)),
    );
    selectors.recentOrders.innerHTML = "";
    if (snapshot.empty) {
      selectors.noOrdersNotice.style.display = "block";
      return;
    }
    selectors.noOrdersNotice.style.display = "none";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement("li");

      const heading = document.createElement("h4");
      heading.textContent = `${data.customerName || "Your order"} • ${formatTimestamp(data.createdAt)}`;
      item.appendChild(heading);

      const badge = document.createElement("span");
      badge.className = `badge ${data.fulfillment === "delivery" ? "delivery" : "pickup"}`;
      badge.textContent = data.fulfillment === "delivery" ? "Delivery" : "Pickup";
      item.appendChild(badge);

      const items = document.createElement("p");
      items.textContent = data.items || "(No items recorded)";
      item.appendChild(items);

      const payment = document.createElement("p");
      payment.textContent = `Payment: ${data.paymentMethod === "card" ? "Instapay on delivery" : "Cash"}`;
      item.appendChild(payment);

      if (typeof data.total === "number") {
        const total = document.createElement("p");
        total.textContent = `Total: ${formatEGP(data.total)}`;
        item.appendChild(total);
      }

      selectors.recentOrders.appendChild(item);
    });
  } catch (e) {
    console.error("Failed to load recent orders", e);
  }
}

async function populateProfileDefaults(user) {
  state.user = user;
  state.profileRef = doc(db, "profiles", user.uid);
  try {
    const snapshot = await getDoc(state.profileRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.name && selectors.name) selectors.name.value = data.name;
      if (data.phone && selectors.phone) selectors.phone.value = data.phone;
      if (data.address && selectors.address) {
        selectors.address.value = data.address;
        state.cachedAddress = data.address;
      }
    } else {
      await setDoc(state.profileRef, { createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (e) {
    console.error("Failed to load profile", e);
  }
  if (selectors.email) selectors.email.value = user.email || "";
  if (selectors.name && !selectors.name.value) selectors.name.value = user.displayName || "";
  updateFulfillmentUI();
  loadRecentOrders();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!state.user || !state.profileRef) {
    showStatus("Please log in again to place an order.", true);
    return;
  }
  if (!state.cart.length) {
    showStatus("Your cart is empty.", true);
    return;
  }

  const name = selectors.name?.value.trim() || "";
  const phone = selectors.phone?.value.trim() || "";
  const fulfillment = activeFulfillment();
  const paymentMethod = activePayment();
  const instructions = selectors.notes?.value.trim() || "";
  const zone = fulfillment === "delivery" ? activeZone() : null;
  const address = fulfillment === "delivery" ? (selectors.address?.value.trim() || "") : "";

  if (fulfillment === "delivery" && !address) {
    showStatus("Delivery orders need an address.", true);
    return;
  }
  if (fulfillment === "delivery" && !zone) {
    showStatus("Please select your delivery zone.", true);
    return;
  }

  const subtotal = cartSubtotal();
  const deliveryFee = fulfillment === "delivery" && zone ? zone.fee : 0;
  const total = subtotal + deliveryFee;
  const items = buildCartSummary();

  const timestamp = serverTimestamp();
  const orderPayload = compact({
    userId: state.user.uid,
    customerName: name,
    phone,
    email: state.user.email || selectors.email?.value.trim() || "",
    items,
    fulfillment,
    paymentMethod,
    instructions,
    address,
    deliveryZone: zone?.name,
    deliveryZoneId: zone?.id,
    deliveryFee,
    subtotal,
    total,
    restaurantId: config.sync.restaurantId || undefined,
    createdAt: timestamp,
    cart: state.cart.map((entry) => ({
      itemId: entry.itemId,
      name: entry.name,
      quantity: entry.quantity,
      price: entry.price,
      extras: entry.extras,
      lineTotal: lineTotal(entry),
    })),
  });

  if (fulfillment === "delivery" && address) {
    state.cachedAddress = address;
  }

  selectors.submit?.setAttribute("disabled", "true");
  showStatus("Sending your order…");

  try {
    await setDoc(
      state.profileRef,
      compact({
        name,
        phone,
        address: fulfillment === "delivery" ? address : undefined,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );

    const orderId = await storeOrderUnderProfile(orderPayload);
    if (!orderId) throw new Error("Could not create order");

    await Promise.all([
      syncOrderToBoard(orderPayload, orderId),
      postOrderWebhook(orderPayload, orderId),
      sendConfirmationEmail(orderPayload, orderId),
    ]);

    showStatus("Order placed! Check your email for confirmation.");
    state.cart = [];
    if (selectors.notes) selectors.notes.value = "";
    refreshCart();
    loadRecentOrders();
  } catch (e) {
    console.error("Failed to submit order", e);
    showStatus(e.message || "Something went wrong. Try again.", true);
  } finally {
    selectors.submit?.removeAttribute("disabled");
  }
}

function initAuthWatcher() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = `account.html?redirect=${encodeURIComponent("order.html")}`;
      return;
    }
    populateProfileDefaults(user);
  });
}

function initEventListeners() {
  selectors.cartContainer?.addEventListener("click", handleCartControls);
  selectors.cartContainer?.addEventListener("change", handleCartControls);
  selectors.clearCart?.addEventListener("click", clearCart);
  selectors.zoneSelect?.addEventListener("change", refreshCart);
  fulfillmentInputs.forEach((input) => input.addEventListener("change", updateFulfillmentUI));
  selectors.form?.addEventListener("submit", handleSubmit);
}

function bootstrap() {
  if (!selectors.form) return;
  applyDatasetConfig();
  renderMenu();
  refreshCart();
  updateFulfillmentUI();
  initEventListeners();
  initAuthWatcher();
  loadRemoteSettings();
}

bootstrap();
