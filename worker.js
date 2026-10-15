const CORS = {
  "Access-Control-Allow-Origin": "https://extramoney-12e.pages.dev",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

async function query(db, sql, ...args) {
  return db.prepare(sql).bind(...args).all();
}

async function run(db, sql, ...args) {
  return db.prepare(sql).bind(...args).run();
}

async function first(db, sql, ...args) {
  return db.prepare(sql).bind(...args).first();
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function currentUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const session = auth.replace(/^Bearer\s+/i, "");
  if (!session) return null;

  const row = await first(
    env.DB,
    `SELECT users.id, users.username, users.balance, users.role
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > ?`,
    session, Date.now()
  );
  return row || null;
}

async function setup(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      utr TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      upi TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`
  ];

  for (const sql of statements) await env.DB.prepare(sql).run();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (!env.DB) return json({ ok: false, error: "DB binding missing" }, 500);

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const method = request.method;

      if (path === "/" && method === "GET") {
        return json({ ok: true, message: "EXTRA MONEY API connected" });
      }

      if (path === "/api/setup" && method === "POST") {
        if (request.headers.get("X-Setup-Key") !== env.SETUP_KEY ||
            !env.SETUP_KEY) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }
        await setup(env);
        return json({ ok: true, message: "Database tables created" });
      }

      if (path === "/api/register" && method === "POST") {
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");

        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username) ||
            password.length < 8 || password.length > 128) {
          return json({
            ok: false,
            error: "Username 3-24 characters; password at least 8 characters"
          }, 400);
        }

        const exists = await first(
          env.DB, "SELECT id FROM users WHERE username = ?", username
        );
        if (exists) return json({ ok: false, error: "Username already exists" }, 409);

        await run(
          env.DB,
          "INSERT INTO users (username,password_hash,created_at) VALUES (?,?,?)",
          username, await hashPassword(password), Date.now()
        );
        return json({ ok: true, message: "Registration successful" });
      }

      if (path === "/api/login" && method === "POST") {
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");

        const user = await first(
          env.DB,
          "SELECT id,username,password_hash,role FROM users WHERE username = ?",
          username
        );

        if (!user || user.password_hash !== await hashPassword(password)) {
          return json({ ok: false, error: "Invalid username or password" }, 401);
        }

        const session = token();
        await run(
          env.DB,
          "INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)",
          session, user.id, Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        return json({
          ok: true,
          token: session,
          user: { id: user.id, username: user.username, role: user.role }
        });
      }

      if (path === "/api/me" && method === "GET") {
        const user = await currentUser(request, env);
        if (!user) return json({ ok: false, error: "Please log in" }, 401);
        return json({ ok: true, user });
      }

      if (path === "/api/settings" && method === "GET") {
        const rows = await query(env.DB, "SELECT key,value FROM settings");
        return json({
          ok: true,
          settings: Object.fromEntries(rows.results.map(r => [r.key, r.value]))
        });
      }

      if (path === "/api/deposits" && method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return json({ ok: false, error: "Please log in" }, 401);

        const body = await request.json();
        const amount = Number(body.amount);
        const utr = String(body.utr || "").trim();

        if (!Number.isFinite(amount) || amount < 1 || amount > 100000 ||
            !/^[a-zA-Z0-9-]{6,40}$/.test(utr)) {
          return json({ ok: false, error: "Invalid amount or UTR" }, 400);
        }

        await run(
          env.DB,
          "INSERT INTO deposits (user_id,amount,utr,created_at) VALUES (?,?,?,?)",
          user.id, amount, utr, Date.now()
        );
        return json({ ok: true, message: "Deposit submitted for review" });
      }

      if (path === "/api/withdrawals" && method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return json({ ok: false, error: "Please log in" }, 401);

        const body = await request.json();
        const amount = Number(body.amount);
        const upi = String(body.upi || "").trim();

        if (!Number.isFinite(amount) || amount < 1 ||
            !/^[\w.-]+@[\w.-]+$/.test(upi)) {
          return json({ ok: false, error: "Invalid amount or UPI ID" }, 400);
        }

        const result = await env.DB.prepare(
          "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?"
        ).bind(amount, user.id, amount).run();

        if (!result.meta.changes) {
          return json({ ok: false, error: "Insufficient balance" }, 400);
        }

        await run(
          env.DB,
          "INSERT INTO withdrawals (user_id,amount,upi,created_at) VALUES (?,?,?,?)",
          user.id, amount, upi, Date.now()
        );
        return json({ ok: true, message: "Withdrawal submitted for review" });
      }

      if (path === "/api/admin" && method === "GET") {
        const user = await currentUser(request, env);
        if (!user || user.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }

        const users = await query(
          env.DB, "SELECT id,username,balance,created_at FROM users ORDER BY id DESC"
        );
        const deposits = await query(
          env.DB, `SELECT deposits.*,users.username FROM deposits
                   JOIN users ON users.id=deposits.user_id ORDER BY deposits.id DESC`
        );
        const withdrawals = await query(
          env.DB, `SELECT withdrawals.*,users.username FROM withdrawals
                   JOIN users ON users.id=withdrawals.user_id ORDER BY withdrawals.id DESC`
        );

        return json({
          ok: true,
          users: users.results,
          deposits: deposits.results,
          withdrawals: withdrawals.results
        });
      }

      if (path === "/api/admin/approve-deposit" && method === "POST") {
        const admin = await currentUser(request, env);
        if (!admin || admin.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }

        const body = await request.json();
        const id = Number(body.id);
        const deposit = await first(
          env.DB, "SELECT * FROM deposits WHERE id = ? AND status = 'pending'", id
        );
        if (!deposit) return json({ ok: false, error: "Pending deposit not found" }, 404);

        await env.DB.batch([
          env.DB.prepare(
            "UPDATE deposits SET status='approved' WHERE id=? AND status='pending'"
          ).bind(id),
          env.DB.prepare(
            "UPDATE users SET balance=balance+? WHERE id=?"
          ).bind(deposit.amount, deposit.user_id)
        ]);

        return json({ ok: true, message: "Deposit approved" });
      }

      if (path === "/api/admin/reject-deposit" && method === "POST") {
        const admin = await currentUser(request, env);
        if (!admin || admin.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }
        const body = await request.json();
        const result = await run(
          env.DB,
          "UPDATE deposits SET status='rejected' WHERE id=? AND status='pending'",
          Number(body.id)
        );
        if (!result.meta.changes) {
          return json({ ok: false, error: "Pending deposit not found" }, 404);
        }
        return json({ ok: true, message: "Deposit rejected" });
      }

      if (path === "/api/admin/approve-withdrawal" && method === "POST") {
        const admin = await currentUser(request, env);
        if (!admin || admin.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }
        const body = await request.json();
        const id = Number(body.id);
        const result = await run(
          env.DB,
          "UPDATE withdrawals SET status='approved' WHERE id=? AND status='pending'",
          id
        );
        if (!result.meta.changes) {
          return json({ ok: false, error: "Pending withdrawal not found" }, 404);
        }
        return json({ ok: true, message: "Withdrawal approved; arrange payment manually" });
      }

      if (path === "/api/admin/reject-withdrawal" && method === "POST") {
        const admin = await currentUser(request, env);
        if (!admin || admin.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }
        const body = await request.json();
        const withdrawal = await first(
          env.DB,
          "SELECT * FROM withdrawals WHERE id=? AND status='pending'",
          Number(body.id)
        );
        if (!withdrawal) {
          return json({ ok: false, error: "Pending withdrawal not found" }, 404);
        }

        await env.DB.batch([
          env.DB.prepare(
            "UPDATE withdrawals SET status='rejected' WHERE id=? AND status='pending'"
          ).bind(withdrawal.id),
          env.DB.prepare(
            "UPDATE users SET balance=balance+? WHERE id=?"
          ).bind(withdrawal.amount, withdrawal.user_id)
        ]);
        return json({ ok: true, message: "Withdrawal rejected and balance refunded" });

      if (path === "/api/admin/settings" && method === "POST") {
        const admin = await currentUser(request, env);
        if (!admin || admin.role !== "admin") {
          return json({ ok: false, error: "Admin access required" }, 403);
        }
        const body = await request.json();
        const allowed = ["upi", "telegram", "support"];
        for (const key of allowed) {
          if (typeof body[key] === "string") {
            await run(
              env.DB,
              "INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
              key, body[key].slice(0, 500)
            );
          }
        }
        return json({ ok: true, message: "Settings updated" });
      }

      return json({ ok: false, error: "API route not found", path }, 404);
    } catch (error) {
      return json({
        ok: false,
        error: "Server error",
        detail: String(error?.message || error)
      }, 500);
    }
  }
};
