const cors = {
  "Access-Control-Allow-Origin": "https://extramoney-12e.pages.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "Content-Type": "application/json"
};

const enc = new TextEncoder();

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors
  });
}

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function unb64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function sign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  return b64(new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(data))
  ));
}

async function token(payload, env) {
  const data = b64(enc.encode(JSON.stringify({
    ...payload,
    exp: Date.now() + 86400000
  })));
  return data + "." + await sign(data, env.AUTH_SECRET);
}

async function auth(request, env) {
  const value = request.headers.get("Authorization") || "";
  const parts = value.replace(/^Bearer\s+/i, "").split(".");
  if (parts.length !== 2 || !env.AUTH_SECRET) return null;

  const expected = await sign(parts[0], env.AUTH_SECRET);
  if (expected !== parts[1]) return null;

  try {
    const p = JSON.parse(new TextDecoder().decode(unb64(parts[0])));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const result = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: 100000,
    hash: "SHA-256"
  }, key, 256);
  return `pbkdf2$${b64(salt)}$${b64(new Uint8Array(result))}`;
}

async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;

  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const result = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: unb64(parts[1]),
    iterations: 100000,
    hash: "SHA-256"
  }, key, 256);

  const actual = b64(new Uint8Array(result));
  return actual === parts[2];
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const method = request.method;

      if (!env.DB) return reply({ ok: false, error: "DB binding missing" }, 500);

      if (path === "/" && method === "GET") {
        return reply({ ok: true, message: "EXTRA MONEY API connected" });
      }

      let data = {};
      if (method === "POST") {
        try {
          data = await request.json();
        } catch {
          return reply({ ok: false, error: "Invalid JSON" }, 400);
        }
      }

      // USER SIGNUP
      if (path === "/api/signup" && method === "POST") {
        const username = String(data.username || "").trim().toLowerCase();
        const name = String(data.name || "").trim();
        const password = String(data.password || "");

        if (!/^[a-z0-9_]{3,30}$/.test(username) ||
            !name || name.length > 80 ||
            password.length < 8 || password.length > 128) {
          return reply({
            ok: false,
            error: "Username, name or password is invalid"
          }, 400);
        }

        const password_hash = await hashPassword(password);
        await env.DB.prepare(
          `INSERT INTO users (username, name, password_hash)
           VALUES (?, ?, ?)`
        ).bind(username, name, password_hash).run();

        return reply({ ok: true, message: "Account created" }, 201);
      }

      // USER LOGIN
      if (path === "/api/login" && method === "POST") {
        const username = String(data.username || "").trim().toLowerCase();
        const password = String(data.password || "");

        const user = await env.DB.prepare(
          "SELECT username, name, password_hash FROM users WHERE username = ?"
        ).bind(username).first();

        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return reply({ ok: false, error: "Invalid login details" }, 401);
        }

        return reply({
          ok: true,
          token: await token({ role: "user", username }, env),
          user: { username: user.username, name: user.name }
        });
      }

      // ADMIN LOGIN: credentials must be configured as Worker secrets
      if (path === "/api/admin/login" && method === "POST") {
        if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.AUTH_SECRET) {
          return reply({ ok: false, error: "Admin secrets not configured" }, 500);
        }

        if (String(data.username || "") !== env.ADMIN_USERNAME ||
            String(data.password || "") !== env.ADMIN_PASSWORD) {
          return reply({ ok: false, error: "Invalid admin login" }, 401);
        }

        return reply({
          ok: true,
          token: await token({ role: "admin", username: env.ADMIN_USERNAME }, env)
        });
      }

      // ALL OTHER API ROUTES REQUIRE AUTHENTICATION
      const session = await auth(request, env);
      if (!session) return reply({ ok: false, error: "Please login" }, 401);

      if (path === "/api/me" && method === "GET") {
        if (session.role !== "user") {
          return reply({ ok: false, error: "User login required" }, 403);
        }

        const user = await env.DB.prepare(
          "SELECT username, name, balance, created_at FROM users WHERE username = ?"
        ).bind(session.username).first();

        if (!user) return reply({ ok: false, error: "User not found" }, 404);
        return reply({ ok: true, user });
      }

      // CREATE DEPOSIT REQUEST
      if (path === "/api/deposit" && method === "POST") {
        if (session.role !== "user") return reply({ ok: false, error: "Forbidden" }, 403);

        const amount = Number(data.amount);
        const utr = String(data.utr || "").trim();

        if (!Number.isSafeInteger(amount) || amount < 1 ||
            amount > 10000000 || utr.length < 6 || utr.length > 100) {
          return reply({ ok: false, error: "Invalid amount or UTR" }, 400);
        }

        await env.DB.prepare(
          `INSERT INTO deposits (username, amount, bonus, utr, status)
           VALUES (?, ?, 0, ?, 'Pending')`
        ).bind(session.username, amount, utr).run();

        return reply({ ok: true, message: "Deposit request submitted" }, 201);
      }

      // CREATE WITHDRAWAL REQUEST; deduct balance only if sufficient
      if (path === "/api/withdraw" && method === "POST") {
        if (session.role !== "user") return reply({ ok: false, error: "Forbidden" }, 403);

        const amount = Number(data.amount);
        const upi = String(data.upi || "").trim();

        if (!Number.isSafeInteger(amount) || amount < 1 ||
            amount > 10000000 || upi.length < 3 || upi.length > 150) {
          return reply({ ok: false, error: "Invalid amount or UPI ID" }, 400);
        }

        const results = await env.DB.batch([
          env.DB.prepare(
            "UPDATE users SET balance = balance - ? WHERE username = ? AND balance >= ?"
          ).bind(amount, session.username, amount),
          env.DB.prepare(
            `INSERT INTO withdrawals (username, amount, upi, status)
             SELECT ?, ?, ?, 'Pending' WHERE changes() = 1`
          ).bind(session.username, amount, upi)
        ]);

        if (!results[0]?.meta?.changes) {
          return reply({ ok: false, error: "Insufficient balance" }, 400);
        }

        return reply({ ok: true, message: "Withdrawal request submitted" }, 201);
      }

      // ADMIN ROUTES
      if (session.role !== "admin") {
        return reply({ ok: false, error: "Admin access required" }, 403);
      }

      if (path === "/api/admin/deposits" && method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM deposits ORDER BY id DESC LIMIT 500"
        ).all();
        return reply({ ok: true, deposits: result.results });
      }

      if (path === "/api/admin/withdrawals" && method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM withdrawals ORDER BY id DESC LIMIT 500"
        ).all();
        return reply({ ok: true, withdrawals: result.results });
      }

      // APPROVE OR REJECT A DEPOSIT
      if (path === "/api/admin/deposit-status" && method === "POST") {
        const id = Number(data.id);
        const status = String(data.status || "");
        const bonus = Number(data.bonus || 0);

        if (!Number.isSafeInteger(id) || id < 1 ||
            !["Approved", "Rejected"].includes(status) ||
            !Number.isSafeInteger(bonus) || bonus < 0 || bonus > 1000000) {
          return reply({ ok: false, error: "Invalid request" }, 400);
        }

        const results = await env.DB.batch([
          env.DB.prepare(
            "UPDATE deposits SET status = 'Processing', bonus = ? WHERE id = ? AND status = 'Pending'"
          ).bind(bonus, id),
          env.DB.prepare(
            `UPDATE users SET balance = balance +
              (SELECT amount + bonus FROM deposits WHERE id = ? AND status = 'Processing')
             WHERE username = (
              SELECT username FROM deposits WHERE id = ? AND status = 'Processing'
             ) AND ? = 'Approved'`
          ).bind(id, id, status),
          env.DB.prepare(
            "UPDATE deposits SET status = ? WHERE id = ? AND status = 'Processing'"
          ).bind(status, id)
        ]);

        if (!results[0]?.meta?.changes) {
          return reply({ ok: false, error: "Deposit not found or already processed" }, 409);
        }

        return reply({ ok: true, message: `Deposit ${status.toLowerCase()}` });
      }

      // APPROVE OR REJECT A WITHDRAWAL
      if (path === "/api/admin/withdrawal-status" && method === "POST") {
        const id = Number(data.id);
        const status = String(data.status || "");

        if (!Number.isSafeInteger(id) || id < 1 ||
            !["Approved", "Rejected"].includes(status)) {
          return reply({ ok: false, error: "Invalid request" }, 400);
        }

        const results = await env.DB.batch([
          env.DB.prepare(
            "UPDATE withdrawals SET status = 'Processing' WHERE id = ? AND status = 'Pending'"
          ).bind(id),
          env.DB.prepare(
            `UPDATE users SET balance = balance +
              (SELECT amount FROM withdrawals WHERE id = ? AND status = 'Processing')
             WHERE username = (
              SELECT username FROM withdrawals WHERE id = ? AND status = 'Processing'
             ) AND ? = 'Rejected'`
          ).bind(id, id, status),
          env.DB.prepare(
            "UPDATE withdrawals SET status = ? WHERE id = ? AND status = 'Processing'"
          ).bind(status, id)
        ]);

        if (!results[0]?.meta?.changes) {
          return reply({ ok: false, error: "Withdrawal not found or already processed" }, 409);
        }

        return reply({ ok: true, message: `Withdrawal ${status.toLowerCase()}` });
      }

      if (path === "/api/admin/settings" && method === "GET") {
        const result = await env.DB.prepare(
          "SELECT key, value FROM settings"
        ).all();
        return reply({ ok: true, settings: result.results });
      }

      if (path === "/api/admin/settings" && method === "POST") {
        const key = String(data.key || "");
        const value = String(data.value ?? "");

        if (!["upi_id", "telegram_id"].includes(key) || value.length > 200) {
          return reply({ ok: false, error: "Invalid setting" }, 400);
        }

        await env.DB.prepare(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).bind(key, value).run();

        return reply({ ok: true, message: "Setting saved" });
      }

      return reply({ ok: false, error: "Route not found" }, 404);

    } catch (error) {
      if (error?.message?.includes("UNIQUE constraint failed")) {
        return reply({ ok: false, error: "Username already exists" }, 409);
      }
      return reply({ ok: false, error: "Server error" }, 500);
    }
  }
};
