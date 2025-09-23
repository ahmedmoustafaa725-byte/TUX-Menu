import { db, subscribeToAuthChanges } from './firebase-app.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const formatName = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) {
    return null;
  }
  const first = parts[0];
  return first.length > 20 ? first.slice(0, 20) : first;
};

const navAccountLink = document.getElementById('navAccountLink');

const setAccountLink = (label, href, ariaLabel) => {
  if (!navAccountLink) {
    return;
  }
  navAccountLink.textContent = label;
  navAccountLink.href = href;
  if (ariaLabel) {
    navAccountLink.setAttribute('aria-label', ariaLabel);
  } else {
    navAccountLink.removeAttribute('aria-label');
  }
};

const resolveUserDisplayName = async (user) => {
  if (!user) return null;

  if (user.displayName) {
    const formatted = formatName(user.displayName);
    if (formatted) {
      return formatted;
    }
  }

  try {
    const profile = await getDoc(doc(db, 'users', user.uid));
    if (profile.exists()) {
      const { name } = profile.data();
      const formatted = formatName(name);
      if (formatted) {
        return formatted;
      }
    }
  } catch (error) {
    console.error('Could not load profile name', error);
  }

  if (user.email) {
    const local = user.email.split('@')[0];
    return formatName(local.replace(/\W+/g, ' ')) || 'Account';
  }

  return 'Account';
};

const updateAccountLinkForUser = async (user) => {
  if (!navAccountLink) {
    return;
  }

  if (!user) {
    setAccountLink('Log In / Sign Up', 'login.html', 'Log in or create an account');
    return;
  }

  const name = await resolveUserDisplayName(user);
  const label = name ? `Hi, ${name}` : 'My Account';
  setAccountLink(label, 'index.html', name ? `Account for ${name}` : 'Go to your account');
};

subscribeToAuthChanges((user) => {
  updateAccountLinkForUser(user).catch((error) => {
    console.error('Failed to update account link', error);
  });
});

export { formatName, updateAccountLinkForUser };
