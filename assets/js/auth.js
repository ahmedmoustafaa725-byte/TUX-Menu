import { auth, db, subscribeToAuthChanges } from './firebase-app.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { formatName } from './site.js';

const HOME_PAGE = 'index.html';
const REDIRECT_DELAY = 1200;

const getMessageEl = (selector) => document.querySelector(selector);

const showMessage = (element, message, { error = false } = {}) => {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.classList.toggle('error', Boolean(error));
  element.hidden = !message;
};

const clearMessageOnInput = (form, messageEl) => {
  if (!form || !messageEl) return;
  form.addEventListener('input', () => {
    if (!messageEl.hidden) {
      showMessage(messageEl, '');
    }
  });
};

const redirectHome = () => {
  window.location.href = HOME_PAGE;
};

const handleLogin = () => {
  const loginForm = document.querySelector('[data-auth="login"]');
  const loginMessage = getMessageEl('[data-auth-message="login"]');
  const resetLink = document.querySelector('[data-auth-reset]');

  if (!loginForm) {
    return;
  }

  clearMessageOnInput(loginForm, loginMessage);

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginMessage) {
      return;
    }

    showMessage(loginMessage, 'Signing you in…');

    const formData = new FormData(loginForm);
    const email = (formData.get('email') || '').toString().trim();
    const password = (formData.get('password') || '').toString();

    if (!email || !password) {
      showMessage(loginMessage, 'Please enter your email and password.', { error: true });
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      try {
        await updateDoc(doc(db, 'users', credential.user.uid), {
          lastLoginAt: serverTimestamp(),
        });
      } catch (updateError) {
        console.warn('Could not update login timestamp', updateError);
      }

      const friendlyName =
        formatName(credential.user.displayName) || formatName(email.split('@')[0].replace(/\W+/g, ' '));
      showMessage(
        loginMessage,
        friendlyName ? `Welcome back, ${friendlyName}! Redirecting to the menu…` : 'Welcome back! Redirecting to the menu…',
      );
      setTimeout(redirectHome, REDIRECT_DELAY);
    } catch (error) {
      const message = error?.message || 'Login failed. Please try again.';
      showMessage(loginMessage, message, { error: true });
    }
  });

  if (resetLink) {
    resetLink.addEventListener('click', async (event) => {
      event.preventDefault();
      if (!loginMessage) {
        return;
      }

      const emailInput = loginForm.querySelector('input[name="email"]');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) {
        showMessage(loginMessage, 'Enter your email above first so we know where to send the reset link.', { error: true });
        return;
      }

      showMessage(loginMessage, 'Sending password reset email…');
      try {
        await sendPasswordResetEmail(auth, email);
        showMessage(loginMessage, 'Password reset email sent! Check your inbox.');
      } catch (error) {
        const message = error?.message || 'Could not send the reset email. Please try again.';
        showMessage(loginMessage, message, { error: true });
      }
    });
  }
};

const handleSignup = () => {
  const signupForm = document.querySelector('[data-auth="signup"]');
  const signupMessage = getMessageEl('[data-auth-message="signup"]');

  if (!signupForm) {
    return;
  }

  clearMessageOnInput(signupForm, signupMessage);

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!signupMessage) {
      return;
    }

    showMessage(signupMessage, 'Creating your account…');

    const formData = new FormData(signupForm);
    const name = (formData.get('name') || '').toString().trim();
    const address = (formData.get('address') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const password = (formData.get('password') || '').toString();

    if (!email || !password) {
      showMessage(signupMessage, 'Please provide an email and password to continue.', { error: true });
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        try {
          await updateProfile(credential.user, { displayName: name });
        } catch (profileError) {
          console.warn('Could not update profile name', profileError);
        }
      }

      try {
        await setDoc(doc(db, 'users', credential.user.uid), {
          name,
          address,
          phone,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (writeError) {
        console.warn('Could not save profile to Firestore', writeError);
      }

      const friendlyName = formatName(name) || formatName(email.split('@')[0].replace(/\W+/g, ' '));
      showMessage(
        signupMessage,
        friendlyName ? `Account ready, ${friendlyName}! Redirecting to the menu…` : 'Account ready! Redirecting to the menu…',
      );
      setTimeout(redirectHome, REDIRECT_DELAY);
    } catch (error) {
      const message = error?.message || 'We could not create your account. Please try again.';
      showMessage(signupMessage, message, { error: true });
    }
  });
};

const redirectIfAuthenticated = () => {
  const loginMessage = getMessageEl('[data-auth-message="login"]');
  const signupMessage = getMessageEl('[data-auth-message="signup"]');

  subscribeToAuthChanges((user) => {
    if (!user) {
      return;
    }

    const friendlyName = formatName(user.displayName);
    const message = friendlyName ? `You are already signed in as ${friendlyName}.` : 'You are already signed in.';

    if (loginMessage) {
      showMessage(loginMessage, `${message} Redirecting to the menu…`);
      setTimeout(redirectHome, REDIRECT_DELAY);
      return;
    }

    if (signupMessage) {
      showMessage(signupMessage, `${message} Redirecting to the menu…`);
      setTimeout(redirectHome, REDIRECT_DELAY);
    }
  });
};

const initAuth = () => {
  handleLogin();
  handleSignup();
  redirectIfAuthenticated();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
