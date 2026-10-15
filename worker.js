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
      const getData = async () => {
        let data = await env.EM_KV.get("DB", { type: "json" });
        if (!data) {
          data = {
            users: {},
            deps: [],
            wits: [],
            cfg: { upi: "", tg: "@extramoney67" }
          };
        }
        return data;
      };

      const saveData = async (data) => {
        await env.EM_KV.put("DB", JSON.stringify(data));
      };

      // 1. Get All Data
      if (path === "/api/get-data" && request.method === "GET") {
        const db = await getData();
        return new Response(JSON.stringify(db), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 2. Register User
      if (path === "/api/register" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) {}
        
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
        let body = {};
        try { body = await request.json(); } catch(e) {}
        
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
      if (path === "/api/withdraw" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) {}
        
        let db = await getData();
        if (!db.users[body.user] || db.users[body.user].bal < body.amt) {
          return new Response(JSON.stringify({ success: false, message: "Balance kam hai" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        db.wits.push({
          id: Date.now(),
          user: body.user,
          amt: body.amt,
          upi: body.upi,
          status: "Pending"
        });
        await saveData(db);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 5. Admin Actions
      if (path === "/api/admin-action" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) {}
        let db = await getData();

        if (body.action === "appD") {
          let d = db.deps.find(x => x.id === body.id);
          if (d && db.users[d.user]) {
            db.users[d.user].bal += d.total;
            d.status = "Approved";
          }
        } else if (body.action === "rejD") {
          let d = db.deps.find(x => x.id === body.id);
          if (d) d.status = "Rejected";
        } else if (body.action === "appW") {
          let w = db.wits.find(x => x.id === body.id);
          if (w && db.users[w.user]) {
            db.users[w.user].bal -= w.amt;
            w.status = "Paid";
          }
        } else if (body.action === "rejW") {
          let w = db.wits.find(x => x.id === body.id);
          if (w) w.status = "Rejected";
        } else if (body.action === "updateUPI") {
          db.cfg.upi = body.upi;
        } else if (body.action === "updateTG") {
          db.cfg.tg = body.tg;
        } else if (body.action === "resetPass") {
          let u = body.user.toLowerCase();
          if (db.users[u]) {
            db.users[u].pass = body.pass;
          }
        }

        await saveData(db);
        return new Response(JSON.stringify({ success: true, db }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
