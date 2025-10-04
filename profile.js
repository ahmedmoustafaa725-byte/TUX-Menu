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
      orderBy("createdAt", "desc")
    );    const snapshot = await getDocs(ordersQuery);

    ordersList.innerHTML = "";

    if (snapshot.empty) {
      if (emptyOrders) emptyOrders.style.display = "block";
      return;
    }

    if (emptyOrders) emptyOrders.style.display = "none";
    const pendingHistoryUpdates = [];

    snapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      const li = document.createElement("li");
      const hasStoredHistoryIndex =
        typeof data.historyIndex === "number" && Number.isFinite(data.historyIndex);
      const historyIndex = index + 1;

      if (!hasStoredHistoryIndex || data.historyIndex !== historyIndex) {
        pendingHistoryUpdates.push(
          setDoc(docSnap.ref, { historyIndex }, { merge: true }).catch((err) => {
            console.warn("Failed to persist order history index", err);
          })
        );
      }
      const heading = document.createElement("h4");
      const orderIdentifier = data.orderNo ? `Order ${data.orderNo}` : "Order";
      const orderTitle = data.items ? data.items.split("\n")[0] : "TUX order";
      heading.textContent = `${historyIndex}. ${orderIdentifier} — ${orderTitle}`;
      li.appendChild(heading);
      const badge = document.createElement("span");
      badge.className = `badge ${data.fulfillment === "delivery" ? "delivery" : "pickup"}`;
      badge.textContent = data.fulfillment === "delivery" ? "Delivery" : "Pickup";
      li.appendChild(badge);

      const sub = document.createElement("p");
      sub.textContent = formatDate(data.createdAt);
      li.appendChild(sub);

      if (data.items) {
        const items = document.createElement("p");
        items.textContent = data.items;
        li.appendChild(items);
      }

      if (data.instructions) {
        const instructions = document.createElement("p");
        instructions.textContent = `Notes: ${data.instructions}`;
        li.appendChild(instructions);
      }

    const status = (data.status || "").trim();
      if (status && status.toLowerCase() !== "pending") {
        const statusLine = document.createElement("p");
        statusLine.textContent = `Status: ${data.status}`;
        li.appendChild(statusLine);
      }
 if (data.paymentMethod) {
        const paymentLine = document.createElement("p");
        paymentLine.textContent = `Payment: ${formatPayment(data.paymentMethod, data.paymentBreakdown)}`;
        li.appendChild(paymentLine);
      }

      if (typeof data.total === "number") {
        const totalLine = document.createElement("p");
        totalLine.textContent = `Total: ${formatCurrency(data.total)}`;
        li.appendChild(totalLine);
      } else if (typeof data.subtotal === "number") {
        const subtotalLine = document.createElement("p");
        subtotalLine.textContent = `Subtotal: ${formatCurrency(data.subtotal)}`;
        li.appendChild(subtotalLine);
      }
      if (data.fulfillment === "delivery" && data.address) {
        const addressLine = document.createElement("p");
        addressLine.textContent = `Deliver to: ${data.address}`;
        li.appendChild(addressLine);
      }

      ordersList.appendChild(li);
    });
      if (pendingHistoryUpdates.length) {
      await Promise.allSettled(pendingHistoryUpdates);
    }
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
