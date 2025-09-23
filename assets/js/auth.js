const API_BASE = '/api/auth';
const STORAGE_KEY = 'tuxAuthToken';

const state = window.__authState || { token: null, user: null };
window.__authState = state;

const authStatusText = document.querySelector('[data-auth-status]');
const globalMessage = document.getElementById('auth-global-message');
const logoutButton = document.querySelector('[data-action="logout"]');
const loginPanel = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');
const profilePanel = document.getElementById('profile-panel');
const forgotPanel = document.getElementById('forgot-panel');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const profileForm = document.getElementById('profile-form');
const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');
let showForgot = false;

function loadTokenFromStorage() {
  if (state.token) {
    return state.token;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    state.token = stored;
  }
  return state.token;
}

function setToken(token) {
  state.token = token || null;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function authHeaders() {
  const token = state.token || loadTokenFromStorage();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

function dispatchAuthChange() {
  document.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: state.user } }));
}

function setFormFeedback(identifier, message, type = 'error') {
  const el = document.querySelector(`[data-feedback="${identifier}"]`);
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('success', 'error');
  if (message) {
    el.classList.add(type === 'success' ? 'success' : 'error');
  }
}

function clearFormFeedback() {
  document.querySelectorAll('[data-feedback]').forEach((el) => {
    el.textContent = '';
    el.classList.remove('success', 'error');
  });
  if (globalMessage) {
    globalMessage.textContent = '';
    globalMessage.classList.remove('success', 'error');
  }
}

function showGlobalMessage(message, type = 'success') {
  if (!globalMessage) return;
  globalMessage.textContent = message;
  globalMessage.classList.remove('success', 'error');
  globalMessage.classList.add(type === 'success' ? 'success' : 'error');
}

function updateProfileForm(user) {
  if (!profileForm || !user) return;
  profileForm.email.value = user.email || '';
  profileForm.name.value = user.name || '';
  profileForm.phone.value = user.phone || '';
  profileForm.address.value = user.address || '';
  profileForm.password.value = '';
}

function updateUI() {
  const isAuthenticated = Boolean(state.user);
  if (isAuthenticated) {
    showForgot = false;
  }
  document.body.classList.toggle('is-authenticated', isAuthenticated);

  if (authStatusText) {
    authStatusText.textContent = isAuthenticated
      ? `Signed in as ${state.user.name || state.user.email}`
      : 'Sign in to save your contact information for future orders.';
  }

  if (logoutButton) {
    logoutButton.hidden = !isAuthenticated;
  }

  if (profilePanel) {
    profilePanel.hidden = !isAuthenticated;
  }

  if (loginPanel) {
    loginPanel.hidden = isAuthenticated || showForgot;
  }

  if (registerPanel) {
    registerPanel.hidden = isAuthenticated;
  }

  if (forgotPanel) {
    forgotPanel.hidden = isAuthenticated || !showForgot;
  }

  updateProfileForm(state.user);
  dispatchAuthChange();
}

async function fetchMe() {
  const token = loadTokenFromStorage();
  if (!token) {
    state.user = null;
    updateUI();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    });
    if (!response.ok) {
      throw new Error('Unable to fetch profile');
    }
    const { user } = await response.json();
    state.user = user;
    updateUI();
  } catch (error) {
    console.error(error);
    setToken(null);
    state.user = null;
    updateUI();
  }
}

async function handleAuthRequest(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormFeedback();

    const payload = {
      email: loginForm.email.value.trim(),
      password: loginForm.password.value,
    };

    try {
      const data = await handleAuthRequest(`${API_BASE}/login`, payload);
      setToken(data.token);
      state.user = data.user;
      updateUI();
      setFormFeedback('login', 'Logged in successfully!', 'success');
      loginForm.reset();
      showGlobalMessage('Welcome back! Your profile has been loaded.', 'success');
    } catch (error) {
      console.error(error);
      setFormFeedback('login', error.message, 'error');
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormFeedback();

    const payload = {
      name: registerForm.name.value.trim(),
      email: registerForm.email.value.trim(),
      password: registerForm.password.value,
      phone: registerForm.phone.value.trim(),
      address: registerForm.address.value.trim(),
    };

    try {
      const data = await handleAuthRequest(`${API_BASE}/register`, payload);
      setToken(data.token);
      state.user = data.user;
      updateUI();
      setFormFeedback('register', 'Account created! You are now logged in.', 'success');
      registerForm.reset();
      showGlobalMessage('Account created successfully.', 'success');
    } catch (error) {
      console.error(error);
      setFormFeedback('register', error.message, 'error');
    }
  });
}

if (profileForm) {
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormFeedback();

    if (!state.user) {
      setFormFeedback('profile', 'You need to be logged in to update your profile.', 'error');
      return;
    }

    const payload = {
      email: profileForm.email.value.trim(),
      name: profileForm.name.value.trim(),
      phone: profileForm.phone.value.trim(),
      address: profileForm.address.value.trim(),
    };

    if (profileForm.password.value) {
      payload.password = profileForm.password.value;
    }

    try {
      const response = await fetch(`${API_BASE}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update profile');
      }
      state.user = data.user;
      updateUI();
      setFormFeedback('profile', 'Profile updated successfully.', 'success');
      showGlobalMessage('Profile changes saved.', 'success');
    } catch (error) {
      console.error(error);
      setFormFeedback('profile', error.message, 'error');
      showGlobalMessage(error.message, 'error');
    }
  });
}

if (forgotForm) {
  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormFeedback();

    try {
      await handleAuthRequest(`${API_BASE}/forgot-password`, {
        email: forgotForm.email.value.trim(),
      });
      setFormFeedback('forgot', 'If the email exists, a reset link has been sent.', 'success');
      showGlobalMessage('Password reset instructions sent. Check the server logs for the token.', 'success');
      forgotForm.reset();
    } catch (error) {
      console.error(error);
      setFormFeedback('forgot', error.message, 'error');
    }
  });
}

if (resetForm) {
  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormFeedback();

    try {
      await handleAuthRequest(`${API_BASE}/reset-password`, {
        token: resetForm.token.value.trim(),
        password: resetForm.password.value,
      });
      setFormFeedback('reset', 'Password reset successful! You can now log in.', 'success');
      showGlobalMessage('Password has been reset. Please log in with your new password.', 'success');
      resetForm.reset();
      showForgot = false;
      updateUI();
    } catch (error) {
      console.error(error);
      setFormFeedback('reset', error.message, 'error');
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    setToken(null);
    state.user = null;
    updateUI();
    showGlobalMessage('You have been logged out.', 'success');
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="show-forgot"]');
  if (button && forgotPanel && loginPanel) {
    showForgot = true;
    updateUI();
  }

  const backToLogin = event.target.closest('[data-action="show-login"]');
  if (backToLogin && forgotPanel && loginPanel && !state.user) {
    showForgot = false;
    updateUI();
  }
});

fetchMe();
