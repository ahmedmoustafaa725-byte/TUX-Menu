import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const headerLink = document.getElementById("accountLink");
const mobileLink = document.getElementById("accountLinkMobile");
const logoutLink = document.getElementById("logoutLink");
const logoutLinkMobile = document.getElementById("logoutLinkMobile");

const accountDock = document.getElementById("accountDock");
const orderLink = document.getElementById("orderLink");
const orderLinkMobile = document.getElementById("orderLinkMobile");

const loginHref = "account.html";
const profileHref = "profile.html";
const orderHref = "order.html";
const orderRedirectHref = `account.html?redirect=${encodeURIComponent(orderHref)}`;

onAuthStateChanged(auth, async (user) => {
  if (logoutLink) {
    logoutLink.style.display = user ? "inline-block" : "none";
  }
 if (logoutLinkMobile) {
    logoutLinkMobile.classList.toggle("hidden", !user);
  }
  const orderTarget = user ? orderHref : orderRedirectHref;
  if (orderLink) orderLink.href = orderTarget;
  if (orderLinkMobile) orderLinkMobile.href = orderTarget;

  let summary = null;

  if (!headerLink && !mobileLink && !accountDock) {
    summary = user
      ? { uid: user.uid, email: user.email || "" }
      : null;
  }

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

    summary = {
      uid: user.uid,
      email: user.email || "",
      displayName: shown,
    };

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

    if (accountDock instanceof HTMLAnchorElement) {
      accountDock.href = profileHref;
      const label = accountDock.querySelector(".floating-dock__label");
      if (label) label.textContent = "Profile";
    }
  } else {
    summary = null;

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

    if (accountDock instanceof HTMLAnchorElement) {
      accountDock.href = loginHref;
      const label = accountDock.querySelector(".floating-dock__label");
      if (label) label.textContent = "Account";
    }
  }

  window.__tuxAuthUser = summary;
  document.dispatchEvent(
    new CustomEvent("tux-auth-change", {
      detail: { user: summary },
    })
  );
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
logoutLinkMobile?.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Error signing out", err);
  }
});
