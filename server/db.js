
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

let db;

function init() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  migrate();
  return db;
}

function migrate() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
}

function getDb() {
  if (!db) {
    return init();
  }
  return db;
}

function createUser({ email, passwordHash, name, address, phone }) {
  const normalisedEmail = email.toLowerCase();
  const stmt = getDb().prepare(`
    INSERT INTO users (email, password_hash, name, address, phone)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(normalisedEmail, passwordHash, name, address || '', phone || '');
  return findUserById(info.lastInsertRowid);
}

function findUserByEmail(email) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
}

function findUserById(id) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

function updateUser(id, { email, name, address, phone, passwordHash }) {
  const fields = [];
  const values = [];
  if (email !== undefined) {
    const normalisedEmail = email.toLowerCase();
    fields.push('email = ?');
    values.push(normalisedEmail);
  }
  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (address !== undefined) {
    fields.push('address = ?');
    values.push(address);
  }
  if (phone !== undefined) {
    fields.push('phone = ?');
    values.push(phone);
  }
  if (passwordHash !== undefined) {
    fields.push('password_hash = ?');
    values.push(passwordHash);
  }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  const stmt = getDb().prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  values.push(id);
  stmt.run(...values);
  return findUserById(id);
}

function createPasswordResetToken(userId, token, expiresAt) {
  getDb()
    .prepare('DELETE FROM password_resets WHERE user_id = ?')
    .run(userId);
  const stmt = getDb().prepare(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, token, expiresAt);
  return { userId, token, expiresAt };
}

function findPasswordResetToken(token) {
  const stmt = getDb().prepare(`
    SELECT * FROM password_resets WHERE token = ?
  `);
  return stmt.get(token);
}

function deletePasswordResetToken(token) {
  const stmt = getDb().prepare('DELETE FROM password_resets WHERE token = ?');
  stmt.run(token);
}

module.exports = {
  init,
  getDb,
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
};
