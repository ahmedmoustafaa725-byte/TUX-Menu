const util = require('util');

/**
 * Mock email sender that logs messages to the console.
 * In a real deployment this would integrate with an email provider.
 */
async function sendPasswordResetEmail({ to, resetLink, token, expiresAt }) {
  const message = {
    to,
    subject: 'Password Reset Instructions',
    body: `Reset your password using the following link: ${resetLink} (token: ${token})`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
  console.info('[email] Password reset email queued:', util.inspect(message, { depth: null }));
}

module.exports = {
  sendPasswordResetEmail,
};
