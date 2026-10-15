export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize D1 Table if not exists
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS app_data (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `).run();

      const getData = async () => {
        let { results } = await env.DB.prepare("SELECT value FROM app_data WHERE key = 'DB'").all();
        if (results && results.length > 0) {
          return JSON.parse(results[0].value);
        }
        return {
          users: {},
          deps: [],
          wits: [],
          cfg: { upi: "", tg: "@extramoney67" }
        };
      };

      const saveData = async (data) => {
        await env.DB.prepare(
          "INSERT INTO app_data (key, value) VALUES ('DB', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
        ).bind(JSON.stringify(data), JSON.stringify(data)).run();
      };

      // 1. Get All Data
      if (path === "/api/get-data" && request.method === "GET") {
        const db = await getData();
        return new Response(JSON.stringify(db), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      let body = {};
      if (request.method === "POST") {
        try {
          body = await request.json();
        } catch (e) {
          body = {};
        }
      }

      // 2. Register User
      if (path === "/api/register" && request.method === "POST") {
        const name = body.name || "";
        const user = body.user || "";
        const pass = body.pass || "";
        const u = user.trim().toLowerCase();

        if (!name || !u || !pass) {
          return new Response(JSON.stringify({ success: false, message: "Sab fields bharo" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        let db = await getData();
        if (db.users[u]) {
          return new Response(JSON.stringify({ success: false, message: "Username already exists" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        db.users[u] = { name: name.trim(), pass: pass.trim(), bal: 0 };
        await saveData(db);
        return new Response(JSON.stringify({ success: true, message: "Account Created!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 3. Deposit Request
      if (path === "/api/deposit" && request.method === "POST") {
        let db = await getData();
        db.deps.push({
          id: Date.now(),
          user: body.user,
          amt: body.amt,
          bonus: body.bonus,
          total: body.total,
          utr: body.utr,
          status: "Pending"
        });
        await saveData(db);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 4. Withdraw Request
      if (path
