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

let currentUser = null;
let profileRef = null;
let emailConfig = { service: "", template: "", publicKey: "" };

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

function updateAddressRequirement() {
  const needsAddress = selectedFulfillment() === "delivery";
  if (addressEl) {
    addressEl.required = needsAddress;
    if (needsAddress) {
      addressEl.placeholder = "Street, City (required for delivery)";
    } else {
      addressEl.placeholder = "Street, City (optional for pickup)";
    }
  }
}

fulfillmentInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateAddressRequirement();
  });
});

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

      if (data.fulfillment === "delivery" && data.address) {
        const address = document.createElement("p");
        address.textContent = `Deliver to: ${data.address}`;
        li.appendChild(address);
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
      order_details: order.items,
      address: order.fulfillment === "delivery" ? (order.address || "") : "Pickup at TUX",
      phone: order.phone,
      instructions: order.instructions || "",
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

  updateAddressRequirement();
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
  const items = itemsEl.value.trim();
  const instructions = notesEl.value.trim();
  const fulfillment = selectedFulfillment();

  if (!items) {
    showStatus("Let us know what you’d like to order.", true);
    return;
  }

  if (fulfillment === "delivery" && !address) {
    showStatus("Delivery orders need an address.", true);
    return;
  }

  submitBtn.disabled = true;
  showStatus("Sending your order…");

  const createdAt = serverTimestamp();
  const orderPayload = {
    userId: currentUser.uid,
    customerName: name,
    phone,
    address: address || null,
    email: currentUser.email || emailEl.value.trim(),
    items,
    instructions: instructions || null,
    fulfillment,
    status: "pending",
    createdAt,
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

    await setDoc(doc(db, "orders", orderDocRef.id), {
      ...orderPayload,
      profileUid: currentUser.uid,
      profileOrderId: orderDocRef.id,
    });

    await sendConfirmationEmail({
      ...orderPayload,
      id: orderDocRef.id,
      email: orderPayload.email,
    });

    showStatus("Order placed! Check your email for a confirmation.");
    itemsEl.value = "";
    notesEl.value = "";
    loadRecentOrders();
  } catch (err) {
    console.error("Failed to place order", err);
    showStatus(err.message || "Something went wrong. Try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

updateAddressRequirement();
