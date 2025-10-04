import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const form = document.getElementById("profileForm");
const statusEl = document.getElementById("profileStatus");
const nameEl = document.getElementById("profileName");
const addressEl = document.getElementById("profileAddress");
const phoneEl = document.getElementById("profilePhone");
const emailEl = document.getElementById("profileEmail");
const ordersList = document.getElementById("profileOrders");
const emptyOrders = document.getElementById("profileOrdersEmpty");
const COUNTRY_CODE = "+20";
const phonePattern = /^\d{10}$/;
const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
});
function navigateTo(url) {
  const locationObj = typeof globalThis !== "undefined" ? globalThis.location : undefined;
  if (!locationObj) {
    console.warn("Attempted to navigate without a global location object.", { url });
    return;
  }

  if (typeof locationObj.assign === "function") {
    locationObj.assign(url);
    return;
  }

  try {
    locationObj.href = url;
  } catch (err) {
    console.warn("Failed to update global location href.", err);
  }
}
function extractPhoneDigits(value) {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("20")) {
    return digits.slice(2);
  }
  if (digits.length === 10) {
    return digits;
  }
  return "";
}

function formatPhoneForStorage(input) {
  const digits = (input || "").replace(/\D/g, "");
  if (!phonePattern.test(digits)) {
    return null;
  }
  return `${COUNTRY_CODE}${digits}`;
}

let profileRef = null;
let currentUser = null;

function showStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#e96a6a" : "var(--muted)";
}

function formatDate(timestamp) {
  try {
  let date;

    if (!timestamp) {
      date = new Date();
    } else if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (typeof timestamp.seconds === "number") {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    }
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "--/--/----";
    }
     const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const rawHours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const period = rawHours >= 12 ? "PM" : "AM";
    const hours12 = rawHours % 12 || 12;
    const hours = String(hours12).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes} ${period}`;
  } catch (err) {
    console.error("Failed to format timestamp", err);
  }
  return "--/--/----";
}
function formatCurrency(value) {
  try {
    return currencyFormatter.format(value);
  } catch (err) {
    return `EGP ${Number(value || 0).toFixed(2)}`;
  }
}

function formatPayment(method, breakdown = null) {
  if (method === "split") {
    const parts = [];
    if (breakdown?.cash) {
      parts.push(`Cash ${formatCurrency(breakdown.cash)}`);
    }
    if (breakdown?.instapay) {
      parts.push(`Instapay ${formatCurrency(breakdown.instapay)}`);
    }
    return parts.length ? parts.join(" + ") : "Split payment";
  }

  if (method === "instapay" || method === "card") {
    if (breakdown?.instapay) {
      return `Instapay ${formatCurrency(breakdown.instapay)}`;
    }
    return "Instapay";
  }

  if (breakdown?.cash) {
    return `Cash ${formatCurrency(breakdown.cash)}`;
  }

  return "Cash";
}
async function loadOrders() {
  if (!profileRef || !ordersList) return;
  try {
const ordersQuery = query(
      collection(profileRef, "orders"),
      orderBy("createdAt", "asc")
    ); 
    const snapshot = await getDocs(ordersQuery);

    ordersList.innerHTML = "";

    if (snapshot.empty) {
      if (emptyOrders) emptyOrders.style.display = "block";
      return;
    }

    if (emptyOrders) emptyOrders.style.display = "none";
    let maxHistoryIndex = 0;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
            const storedHistoryIndex = data.historyIndex;

      const hasStoredHistoryIndex =
       typeof storedHistoryIndex === "number" && Number.isFinite(storedHistoryIndex);
      let historyIndex;

      if (hasStoredHistoryIndex) {
        historyIndex = storedHistoryIndex;
        if (storedHistoryIndex > maxHistoryIndex) {
          maxHistoryIndex = storedHistoryIndex;
        }
      } else {
        historyIndex = maxHistoryIndex + 1;
        maxHistoryIndex = historyIndex;
      }
       const card = document.createElement("article");
      card.className = "order-card";
      card.setAttribute("role", "listitem");

      const infoColumn = document.createElement("div");
      infoColumn.className = "order-card__info";

      const header = document.createElement("div");
      header.className = "order-card__header";

      const titleWrapper = document.createElement("div");
      titleWrapper.className = "order-card__title";

      const heading = document.createElement("h4");
      const orderIdentifier = data.orderNo ? `Order ${data.orderNo}` : "Order";
const firstItemLine = (data.items || "")
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      const orderTitle = firstItemLine || "TUX order";
      heading.textContent = `${historyIndex}. ${orderIdentifier} — ${orderTitle}`;
      titleWrapper.appendChild(heading);

      const timestamp = document.createElement("p");
      timestamp.className = "order-card__timestamp";
      timestamp.textContent = formatDate(data.createdAt);
      titleWrapper.appendChild(timestamp);

      header.appendChild(titleWrapper);
      infoColumn.appendChild(header);

      const detailsColumn = document.createElement("div");
      detailsColumn.className = "order-card__details";

      const isDelivery = data.fulfillment === "delivery";      const badge = document.createElement("span");
      badge.className = `order-card__badge ${
        isDelivery ? "order-card__badge--delivery" : "order-card__badge--pickup"
      }`;
      badge.textContent = isDelivery ? "Delivery" : "Pickup";
      detailsColumn.appendChild(badge);

       const meta = document.createElement("div");
      meta.className = "order-card__meta";

      const appendMeta = (label, value) => {
        if (!value) return;
        const item = document.createElement("div");
        item.className = "order-card__meta-item";

        const labelEl = document.createElement("span");
        labelEl.className = "order-card__meta-label";
        labelEl.textContent = label;

  const valueEl = document.createElement("p");
        valueEl.className = "order-card__meta-value";
        valueEl.textContent = value;

        item.append(labelEl, valueEl);
        meta.appendChild(item);
      };

      const status = (data.status || "").trim();      if (status && status.toLowerCase() !== "pending") {
               appendMeta("Status", status);

      }
 if (data.paymentMethod) {
        appendMeta("Payment", formatPayment(data.paymentMethod, data.paymentBreakdown));
      }

      if (typeof data.total === "number") {
              appendMeta("Total", formatCurrency(data.total));

      } else if (typeof data.subtotal === "number") {
                appendMeta("Subtotal", formatCurrency(data.subtotal));
      }

      if (isDelivery && data.address) {
        appendMeta("Deliver to", data.address);
      }

      if (meta.children.length) {
        detailsColumn.appendChild(meta);
      }
       const itemLines = (data.items || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (itemLines.length) {
        const itemsSection = document.createElement("div");
        itemsSection.className = "order-card__items";

        const itemsTitle = document.createElement("p");
        itemsTitle.className = "order-card__section-title";
        itemsTitle.textContent = "Items";
        itemsSection.appendChild(itemsTitle);

        const list = document.createElement("ul");
        list.className = "order-card__item-list";
        itemLines.forEach((line) => {
          const listItem = document.createElement("li");
          listItem.textContent = line;
          list.appendChild(listItem);
        });
        itemsSection.appendChild(list);
        infoColumn.appendChild(itemsSection);
      }
      

        if (data.instructions) {
        const instructions = document.createElement("p");
        instructions.className = "order-card__notes";
        instructions.textContent = `Notes: ${data.instructions}`;
        infoColumn.appendChild(instructions);
      }

      card.append(infoColumn, detailsColumn);
      ordersList.prepend(card);
    });
 
  } catch (err) {
    console.error("Failed to load order history", err);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    navigateTo(`account.html?redirect=${encodeURIComponent("profile.html")}`);
    return;
  }

  currentUser = user;
  profileRef = doc(db, "profiles", user.uid);
    let resolvedEmail = user.email || "";


  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.name && nameEl) nameEl.value = data.name;
      if (data.address && addressEl) addressEl.value = data.address;
      if (data.phone && phoneEl) phoneEl.value = extractPhoneDigits(data.phone);
            if (data.email) resolvedEmail = data.email;

    } else {
      await setDoc(profileRef, { createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (err) {
    console.error("Failed to load profile", err);
  }

  if (emailEl) emailEl.value = resolvedEmail || "";
  if (nameEl && !nameEl.value) nameEl.value = user.displayName || "";

  loadOrders();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !profileRef) {
    showStatus("Please log in again.", true);
    return;
  }

  const name = nameEl.value.trim();
  const address = addressEl.value.trim();
  const phoneDigits = phoneEl.value.replace(/\D/g, "");

  if (!name || !phoneDigits) {
    showStatus("Name and phone are required.", true);
    return;
  }
if (!phonePattern.test(phoneDigits)) {
    showStatus("Enter a 10-digit phone number. We'll add +20 for you.", true);
    phoneEl.focus();
    return;
  }

  const phoneForStorage = formatPhoneForStorage(phoneDigits);
  if (!phoneForStorage) {
    showStatus("Enter a 10-digit phone number. We'll add +20 for you.", true);
    phoneEl.focus();
    return;
  }

  showStatus("Saving changes…");

  try {
    await setDoc(profileRef, {
      name,
      address,
      phone: phoneForStorage,
            email: emailEl?.value.trim() || currentUser.email || "",

      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (currentUser.displayName !== name) {
      await updateProfile(currentUser, { displayName: name }).catch((err) => {
        console.error("Failed to update auth display name", err);
      });
    }

    showStatus("Details saved!");
  } catch (err) {
    console.error("Failed to save profile", err);
    showStatus(err.message || "Could not save your changes.", true);
  }
});
