import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const headerLink = document.getElementById("accountLink");
const mobileLink = document.getElementById("accountLinkMobile");
const logoutLink = document.getElementById("logoutLink");
const orderLink = document.getElementById("orderLink");
const orderLinkMobile = document.getElementById("orderLinkMobile");
const orderLinkQuick = document.getElementById("orderLinkQuick");
const accountLinkQuick = document.getElementById("accountLinkQuick");
const loginHref = "account.html";
const profileHref = "profile.html";
const orderHref = "order.html";
const orderRedirectHref = `account.html?redirect=${encodeURIComponent(orderHref)}`;

onAuthStateChanged(auth, async (user) => {
  if (logoutLink) {
    logoutLink.style.display = user ? "inline-block" : "none";
  }

  const orderTarget = user ? orderHref : orderRedirectHref;
  if (orderLink) orderLink.href = orderTarget;
  if (orderLinkMobile) orderLinkMobile.href = orderTarget;

 if (orderLinkQuick) orderLinkQuick.href = orderTarget;

  if (!headerLink && !mobileLink && !accountLinkQuick) return;
  if (user) {
    let displayName = user.displayName || "";
    if (!displayName) {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (snap.exists()) {
          displayName = snap.data().name || "";
        }
      } catch (err) {
        console.error("Failed to load profile name", err);
      }
    }

    const shown = displayName || (user.email ? user.email.split("@")[0] : "Account");

    if (headerLink) {
      headerLink.textContent = shown;
      headerLink.href = profileHref;
      headerLink.classList.add("is-authenticated");
    }

    if (mobileLink) {
      mobileLink.textContent = shown;
      mobileLink.href = profileHref;
      mobileLink.classList.add("is-authenticated");
    }
     if (accountLinkQuick) {
      accountLinkQuick.textContent = shown;
      accountLinkQuick.href = profileHref;
      accountLinkQuick.classList.add("is-authenticated");
    }
  } else {
    if (headerLink) {
      headerLink.textContent = "Login / Sign up";
      headerLink.href = loginHref;
      headerLink.classList.remove("is-authenticated");
    }

    if (mobileLink) {
      mobileLink.textContent = "Login / Sign up";
      mobileLink.href = loginHref;
      mobileLink.classList.remove("is-authenticated");
    }
     if (accountLinkQuick) {
      accountLinkQuick.textContent = "Account";
      accountLinkQuick.href = loginHref;
      accountLinkQuick.classList.remove("is-authenticated");
    }
  }
});

logoutLink?.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Error signing out", err);
  }
});
