import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const form = document.getElementById("orderForm");
const statusEl = document.getElementById("orderStatus");
const nameEl = document.getElementById("orderName");
const addressEl = document.getElementById("orderAddress");
const phoneEl = document.getElementById("orderPhone");
const emailEl = document.getElementById("orderEmail");
const itemsEl = document.getElementById("orderItems");
const notesEl = document.getElementById("orderNotes");
const submitBtn = document.getElementById("orderSubmit");
const recentOrdersList = document.getElementById("recentOrders");
const noOrdersEl = document.getElementById("noOrders");
const fulfillmentInputs = Array.from(document.querySelectorAll("input[name='fulfillment']"));
const paymentInputs = Array.from(document.querySelectorAll("input[name='payment']"));
const menuContainer = document.getElementById("menuList");
const cartItemsContainer = document.getElementById("cartItems");
const emptyCartEl = document.getElementById("emptyCart");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartDeliveryEl = document.getElementById("cartDeliveryFee");
const cartTotalEl = document.getElementById("cartTotal");
const deliveryFeeRow = document.getElementById("deliveryFeeRow");
const zoneSelect = document.getElementById("deliveryZone");
const deliveryZoneField = document.getElementById("deliveryZoneField");
const deliveryZoneNote = document.getElementById("deliveryZoneNote");
const clearCartBtn = document.getElementById("clearCart");
let currentUser = null;
let profileRef = null;
let emailConfig = { service: "", template: "", publicKey: "" };
let cart = [];

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
});
const deliveryZones = [
  { id: "zahraa-el-maadi", name: "Zahraa El Maadi", fee: 25 },
  { id: "kornish-el-maadi", name: "Kornish El Maadi", fee: 40 },
];

const burgerExtras = [
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

const hawawshiExtras = [
  { id: "mozzarella-cheese", name: "Mozzarella Cheese", price: 20 },
  { id: "tux-hawawshi-sauce", name: "TUX Hawawshi Sauce", price: 10 },
  { id: "hawawshi-condiments", name: "BBQ / Ketchup / Sweet Chili / Hot Sauce", price: 5 },
];

const menuData = [
  {
    id: "single-smashed-patty",
    name: "Single Smashed Patty",
    description: "Smashed patty, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
    price: 95,
    category: "Smash Burgers",
    extras: burgerExtras,
  },
  {
    id: "double-smashed-patty",
    name: "Double Smashed Patty",
    description: "Two smashed patties, cheese, TUX sauce, pickles, tomato, onion, lettuce.",
    price: 140,
    category: "Smash Burgers",
    extras: burgerExtras,
  },
  {
    id: "triple-smashed-patty",
    name: "Triple Smashed Patty",
    description: "Triple the patties with all the classic TUX toppings and sauce.",
    price: 160,
    category: "Smash Burgers",
    extras: burgerExtras,
  },
  {
    id: "quatro-smashed-patty",
    name: "TUX Quatro Smashed Patty",
    description: "Four smashed patties, cheese, caramelized onion, mushroom, TUX sauce.",
    price: 190,
    category: "Smash Burgers",
    extras: burgerExtras,
  },
  {
    id: "tuxify-single",
    name: "TUXIFY Single",
    description: "Brioche bun, beef patty, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
    price: 120,
    category: "TUXIFY",
    extras: burgerExtras,
  },
  {
    id: "tuxify-double",
    name: "TUXIFY Double",
    description: "Double beef patties with American cheese, pickles, onion, ketchup, TUXIFY sauce.",
    price: 160,
    category: "TUXIFY",
    extras: burgerExtras,
  },
  {
    id: "tuxify-triple",
    name: "TUXIFY Triple",
    description: "Three beef patties layered with American cheese and TUXIFY sauce.",
    price: 200,
    category: "TUXIFY",
    extras: burgerExtras,
  },
  {
  id: "tuxify-quatro",
    name: "TUXIFY Quatro",
    description: "Four beef patties, American cheese, pickles, chopped onion, ketchup, TUXIFY sauce.",
    price: 240,
    category: "TUXIFY",
    extras: burgerExtras,
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
    extras: hawawshiExtras,
  },
  {
  id: "tux-hawawshi",
    name: "TUX Hawawshi",
    description: "Baladi bread, hawawshi meat, mozzarella, onion, TUX hawawshi sauce.",
    price: 100,
    category: "Hawawshi",
    extras: hawawshiExtras,
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
    
  },
];
if (form) {
  emailConfig = {
    service: form.dataset.emailService?.trim() ?? "",
    template: form.dataset.emailTemplate?.trim() ?? "",
    publicKey: form.dataset.emailPublic?.trim() ?? "",
  };

  if (window.emailjs && emailConfig.publicKey) {
    window.emailjs.init(emailConfig.publicKey);
  }
}

function showStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#e96a6a" : "var(--muted)";
}

function selectedFulfillment() {
  const selected = fulfillmentInputs.find((input) => input.checked);
  return selected ? selected.value : "pickup";
}
function selectedPayment() {
  const selected = paymentInputs.find((input) => input.checked);
  return selected ? selected.value : "cash";
}

function getSelectedZone() {
  if (!zoneSelect) return null;
  const zoneId = zoneSelect.value;
  if (!zoneId) return null;
  return deliveryZones.find((zone) => zone.id === zoneId) || null;
}

function updateFulfillmentUI() {
  const needsDelivery = selectedFulfillment() === "delivery";

  if (addressEl) {
    addressEl.required = needsDelivery;
    addressEl.placeholder = needsDelivery
      ? "Street, City (required for delivery)"
      : "Street, City (optional for pickup)";
  }

  if (zoneSelect) {
    zoneSelect.required = needsDelivery;
    zoneSelect.disabled = !needsDelivery;
    if (!needsDelivery) {
      zoneSelect.value = "";
    }
  }
  if (deliveryZoneField) {
    deliveryZoneField.style.display = needsDelivery ? "" : "none";
  }

  if (deliveryZoneNote) {
    deliveryZoneNote.style.display = needsDelivery ? "" : "none";
  }

  if (!needsDelivery && deliveryFeeRow) {
    deliveryFeeRow.style.display = "none";
  }

  updateCartUI();
}

fulfillmentInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateFulfillmentUI();
  });
});
zoneSelect?.addEventListener("change", () => {
  updateCartUI();
});
function formatCurrency(value) {
  try {
    return currencyFormatter.format(value);
  } catch (err) {
    return `EGP ${Number(value || 0).toFixed(2)}`;
  }
}

function formatPayment(method) {
  return method === "card" ? "Card on delivery" : "Cash";
}

function renderMenu() {
  if (!menuContainer) return;

  const grouped = menuData.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  menuContainer.innerHTML = "";

  Object.entries(grouped).forEach(([category, items]) => {
    const groupEl = document.createElement("section");
    groupEl.className = "menu-group";

    const heading = document.createElement("h4");
    heading.textContent = category;
    groupEl.appendChild(heading);

    const list = document.createElement("div");
    list.className = "menu-items";

    items.forEach((menuItem) => {
      const card = document.createElement("article");
      card.className = "order-menu-card";
      card.dataset.itemId = menuItem.id;

      const header = document.createElement("div");
      header.className = "order-menu-card__header";

      const name = document.createElement("h5");
      name.className = "order-menu-card__name";
      name.textContent = menuItem.name;
      header.appendChild(name);

      if (menuItem.description) {
        const desc = document.createElement("p");
        desc.className = "order-menu-card__desc";
        desc.textContent = menuItem.description;
        header.appendChild(desc);
      }

      const price = document.createElement("span");
      price.className = "order-menu-card__price";
      price.textContent = formatCurrency(menuItem.price);
      header.appendChild(price);

      card.appendChild(header);

      if (menuItem.extras && menuItem.extras.length) {
         const extrasToggle = document.createElement("button");
        extrasToggle.type = "button";
        extrasToggle.className = "btn outline small order-menu-card__extras-toggle";
        extrasToggle.textContent = "Add extras";
        extrasToggle.setAttribute("aria-expanded", "false");

        const extrasFieldset = document.createElement("fieldset");
        extrasFieldset.className = "order-menu-card__extras";
 extrasFieldset.hidden = true;
        extrasFieldset.setAttribute("aria-hidden", "true");
        const legend = document.createElement("legend");
        legend.textContent = "Extras";
        extrasFieldset.appendChild(legend);

        menuItem.extras.forEach((extra) => {
          const label = document.createElement("label");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.extraId = extra.id;
          checkbox.dataset.extraName = extra.name;
          checkbox.dataset.extraPrice = String(extra.price);
          label.appendChild(checkbox);

          const nameSpan = document.createElement("span");
          nameSpan.textContent = extra.name;
          label.appendChild(nameSpan);

          const priceSpan = document.createElement("span");
          priceSpan.textContent = formatCurrency(extra.price);
          label.appendChild(priceSpan);

          extrasFieldset.appendChild(label);
        });
extrasToggle.addEventListener("click", () => {
          const willShow = extrasFieldset.hidden;
          extrasFieldset.hidden = !willShow;
          extrasFieldset.setAttribute("aria-hidden", extrasFieldset.hidden ? "true" : "false");
          extrasToggle.setAttribute("aria-expanded", willShow ? "true" : "false");
          extrasToggle.textContent = willShow ? "Hide extras" : "Add extras";
        });

        card.appendChild(extrasToggle);
        card.appendChild(extrasFieldset);
      }

      const actions = document.createElement("div");
      actions.className = "order-menu-card__actions";

      const qtyLabel = document.createElement("label");
      qtyLabel.className = "order-menu-card__qty";
      qtyLabel.textContent = "Qty";

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.max = "10";
      qtyInput.value = "1";
      qtyInput.dataset.role = "quantity";
      qtyLabel.appendChild(qtyInput);
      actions.appendChild(qtyLabel);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn green small";
      addBtn.textContent = "Add to cart";
      addBtn.addEventListener("click", () => handleAddToCart(menuItem, card));
      actions.appendChild(addBtn);

      card.appendChild(actions);
      list.appendChild(card);
    });

    groupEl.appendChild(list);
    menuContainer.appendChild(groupEl);
  });
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

function buildCartSummary() {
  if (!cart.length) return "";
  return cart
    .map((entry) => {
      const extrasPart = entry.extras && entry.extras.length
        ? ` with ${entry.extras.map((extra) => extra.name).join(", ")}`
        : "";
      const lineTotal = formatCurrency(calculateItemTotal(entry));
      return `${entry.quantity}× ${entry.name}${extrasPart ? extrasPart : ""} — ${lineTotal}`;
    })
    .join("\n");
}

function updateItemsField() {
  if (!itemsEl) return;
  itemsEl.value = buildCartSummary();
}

function updateCartUI() {
  if (!cartItemsContainer || !cartTotalEl || !cartSubtotalEl || !cartDeliveryEl) return;

  cartItemsContainer.innerHTML = "";

  if (!cart.length) {
    if (emptyCartEl) emptyCartEl.style.display = "block";
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

const subtotal = calculateCartTotal();
  const zone = getSelectedZone();
  const deliveryFee = zone ? zone.fee : 0;

  cartSubtotalEl.textContent = formatCurrency(subtotal);
  cartDeliveryEl.textContent = zone ? formatCurrency(deliveryFee) : "Select zone";
  cartTotalEl.textContent = formatCurrency(subtotal + deliveryFee);

  if (deliveryFeeRow) {
    deliveryFeeRow.style.display = selectedFulfillment() === "delivery" ? "flex" : "none";
  }
  updateItemsField();
}

function handleAddToCart(menuItem, cardEl) {
  const qtyInput = cardEl.querySelector("input[data-role='quantity']");
  let quantity = parseInt(qtyInput?.value ?? "1", 10);

  if (Number.isNaN(quantity) || quantity < 1) quantity = 1;
  if (quantity > 20) quantity = 20;
  if (qtyInput) qtyInput.value = String(quantity);

  const extras = Array.from(cardEl.querySelectorAll("input[data-extra-id]:checked")).map((checkbox) => ({
    id: checkbox.dataset.extraId,
    name: checkbox.dataset.extraName,
    price: Number(checkbox.dataset.extraPrice) || 0,
  }));

  cart.push({
    itemId: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    quantity,
    extras,
  });

  cardEl.querySelectorAll("input[data-extra-id]").forEach((checkbox) => {
    checkbox.checked = false;
  });
const extrasFieldset = cardEl.querySelector(".order-menu-card__extras");
  const extrasToggleBtn = cardEl.querySelector(".order-menu-card__extras-toggle");

  if (extrasFieldset instanceof HTMLElement) {
    extrasFieldset.hidden = true;
    extrasFieldset.setAttribute("aria-hidden", "true");
  }

  if (extrasToggleBtn instanceof HTMLButtonElement) {
    extrasToggleBtn.setAttribute("aria-expanded", "false");
    extrasToggleBtn.textContent = "Add extras";
  }
  if (qtyInput) qtyInput.value = "1";

  updateCartUI();
  showStatus(`${menuItem.name} added to cart.`);
}

cartItemsContainer?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || !cart[index]) return;

  if (action === "remove") {
    const [removed] = cart.splice(index, 1);
    updateCartUI();
    showStatus(`${removed?.name ?? "Item"} removed from cart.`);
    return;
  }

  if (action === "increase") {
    cart[index].quantity += 1;
    updateCartUI();
    return;
  }

  if (action === "decrease") {
    cart[index].quantity = Math.max(1, cart[index].quantity - 1);
    updateCartUI();
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
  updateCartUI();
});

clearCartBtn?.addEventListener("click", () => {
  if (!cart.length) return;
  cart = [];
  updateCartUI();
  showStatus("Cart cleared. Add items again when you're ready.");
});

renderMenu();
updateCartUI();

function formatDate(timestamp) {
  try {
    if (!timestamp) return new Date().toLocaleString();
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString();
    }
    if (typeof timestamp.seconds === "number") {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
  } catch (err) {
    console.error("Failed to format timestamp", err);
  }
  return new Date().toLocaleString();
}

async function loadRecentOrders() {
  if (!profileRef || !recentOrdersList) return;
  try {
    const ordersQuery = query(collection(profileRef, "orders"), orderBy("createdAt", "desc"), limit(5));
    const snapshot = await getDocs(ordersQuery);

    recentOrdersList.innerHTML = "";

    if (snapshot.empty) {
      if (noOrdersEl) noOrdersEl.style.display = "block";
      return;
    }

    if (noOrdersEl) noOrdersEl.style.display = "none";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");

      const heading = document.createElement("h4");
      heading.textContent = `${data.customerName || "Your order"} • ${formatDate(data.createdAt)}`;
      li.appendChild(heading);

      const badge = document.createElement("span");
      badge.className = `badge ${data.fulfillment === "delivery" ? "delivery" : "pickup"}`;
      badge.textContent = data.fulfillment === "delivery" ? "Delivery" : "Pickup";
      li.appendChild(badge);

      const details = document.createElement("p");
      details.textContent = data.items || "(No details provided)";
      li.appendChild(details);

      if (data.instructions) {
        const notes = document.createElement("p");
        notes.textContent = `Notes: ${data.instructions}`;
        li.appendChild(notes);
      }

      const statusLine = document.createElement("p");
      statusLine.textContent = `Status: ${data.status || "pending"}`;
      li.appendChild(statusLine);
if (data.paymentMethod) {
        const paymentLine = document.createElement("p");
        paymentLine.textContent = `Payment: ${formatPayment(data.paymentMethod)}`;
        li.appendChild(paymentLine);
      }

      if (typeof data.total === "number") {
        const totalLine = document.createElement("p");
const deliveryNote =
          data.fulfillment === "delivery" && typeof data.deliveryFee === "number"
            ? ` (includes ${formatCurrency(data.deliveryFee)} delivery fee)`
            : "";
        totalLine.textContent = `Total: ${formatCurrency(data.total)}${deliveryNote}`;
        li.appendChild(totalLine);
              } else if (typeof data.subtotal === "number") {
        const subtotalLine = document.createElement("p");
        subtotalLine.textContent = `Subtotal: ${formatCurrency(data.subtotal)}`;
        li.appendChild(subtotalLine);
      }
      if (data.fulfillment === "delivery" && data.address) {
        const address = document.createElement("p");
        address.textContent = `Deliver to: ${data.address}`;
        li.appendChild(address);
      }
  if (data.fulfillment === "delivery" && data.deliveryZone) {
        const zoneLine = document.createElement("p");
        zoneLine.textContent = `Zone: ${data.deliveryZone}`;
        li.appendChild(zoneLine);
      }
      recentOrdersList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load recent orders", err);
  }
}

async function sendConfirmationEmail(order) {
  if (!window.emailjs || !emailConfig.service || !emailConfig.template || !emailConfig.publicKey) {
    return;
  }

  try {
    await window.emailjs.send(emailConfig.service, emailConfig.template, {
      to_email: order.email,
      to_name: order.customerName || "TUX Guest",
      order_id: order.id,
      fulfillment: order.fulfillment === "delivery" ? "Delivery" : "Pickup",
 payment_method: formatPayment(order.paymentMethod),
      delivery_zone: order.fulfillment === "delivery" ? order.deliveryZone || "" : "Pickup",
      delivery_fee: typeof order.deliveryFee === "number" ? formatCurrency(order.deliveryFee) : "",
      order_details: order.items,
      address: order.fulfillment === "delivery" ? (order.address || "") : "Pickup at TUX",
      phone: order.phone,
      instructions: order.instructions || "",
 order_subtotal: typeof order.subtotal === "number" ? formatCurrency(order.subtotal) : "",
      order_total:
        typeof order.total === "number"
          ? formatCurrency(order.total)
          : typeof order.subtotal === "number"
            ? formatCurrency(order.subtotal)
            : "",
      placed_at: new Date().toLocaleString(),
    });
  } catch (err) {
    console.error("Failed to send confirmation email", err);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = `account.html?redirect=${encodeURIComponent("order.html")}`;
    return;
  }

  currentUser = user;
  profileRef = doc(db, "profiles", user.uid);

  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.name && nameEl) nameEl.value = data.name;
      if (data.address && addressEl) addressEl.value = data.address;
      if (data.phone && phoneEl) phoneEl.value = data.phone;
    } else {
      await setDoc(profileRef, { createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (err) {
    console.error("Failed to load profile", err);
  }

  if (emailEl) emailEl.value = user.email || "";
  if (nameEl && !nameEl.value) nameEl.value = user.displayName || "";

  updateFulfillmentUI();
  loadRecentOrders();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !profileRef) {
    showStatus("Please log in again to place an order.", true);
    return;
  }

  const name = nameEl.value.trim();
  const address = addressEl.value.trim();
  const phone = phoneEl.value.trim();
  const instructions = notesEl.value.trim();
  const fulfillment = selectedFulfillment();
  const paymentMethod = selectedPayment();
  const items = buildCartSummary();
  const subtotal = calculateCartTotal();
const selectedZone = getSelectedZone();
  if (!cart.length || !items) {    showStatus("Cart is Empty.", true);
    return;
  }

  if (fulfillment === "delivery" && !address) {
    showStatus("Delivery orders need an address.", true);
    return;
  }
  if (fulfillment === "delivery" && !selectedZone) {
    showStatus("Please choose your delivery zone.", true);
    return;
  }
  const deliveryFee = fulfillment === "delivery" ? selectedZone?.fee ?? 0 : 0;
  const total = subtotal + deliveryFee;
  updateItemsField();

  submitBtn.disabled = true;
  showStatus("Sending your order…");

  const createdAt = serverTimestamp();
  const orderPayload = {
    userId: currentUser.uid,
    customerName: name,
    phone,
    address: address || null,
    email: currentUser.email || emailEl?.value.trim() || "",
    items,
    instructions: instructions || null,
    fulfillment,
paymentMethod,
    deliveryZoneId: selectedZone?.id ?? null,
    deliveryZone: selectedZone?.name ?? null,
    deliveryFee,
    status: "pending",
    createdAt,
    cart: cart.map((entry) => ({
      itemId: entry.itemId,
      name: entry.name,
      quantity: entry.quantity,
      price: entry.price,
      extras: entry.extras,
      lineTotal: calculateItemTotal(entry),
    })),
    subtotal,
        total,

  };

  try {
    await setDoc(profileRef, {
      name,
      address,
      phone,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const ordersCol = collection(profileRef, "orders");
    const orderDocRef = await addDoc(ordersCol, orderPayload);

    try {
      await setDoc(doc(db, "orders", orderDocRef.id), {
        ...orderPayload,
        profileUid: currentUser.uid,
        profileOrderId: orderDocRef.id,
      });
    } catch (err) {
      console.warn("Could not copy order to shared collection", err);
    }

    await sendConfirmationEmail({
      ...orderPayload,
      id: orderDocRef.id,
      email: orderPayload.email,
    });

    showStatus("Order placed! Check your email for a confirmation.");
    cart = [];
    updateCartUI();
    if (itemsEl) itemsEl.value = "";
    if (notesEl) notesEl.value = "";
    loadRecentOrders();
  } catch (err) {
    console.error("Failed to place order", err);
    showStatus(err.message || "Something went wrong. Try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

updateFulfillmentUI();
