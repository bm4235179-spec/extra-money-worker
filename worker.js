export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const ADMIN_USER = "ExtraMoney_Admin_2026";
    const ADMIN_PASS = "Em@2026#Secure!X9z";

    async function getDB() {
      try {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_data (id TEXT PRIMARY KEY, val TEXT)").run();
        let row = await env.DB.prepare("SELECT val FROM app_data WHERE id = 'DB'").first();
        if (!row || !row.val) {
          const initial = JSON.stringify({
            users: {},
            deps: [],
            wits: [],
            refs: [],
            cfg: { upi: "", tg: "@extramoney67" }
          });
          await env.DB.prepare("INSERT OR REPLACE INTO app_data (id, val) VALUES ('DB', ?)").bind(initial).run();
          return JSON.parse(initial);
        }
        return JSON.parse(row.val);
      } catch (err) {
        return { users: {}, deps: [], wits: [], refs: [], cfg: { upi: "", tg: "@extramoney67" } };
      }
    }

    async function saveDB(data) {
      await env.DB.prepare("UPDATE app_data SET val = ? WHERE id = 'DB'").bind(JSON.stringify(data)).run();
    }

    try {
      if (url.pathname === "/api/get-data" && request.method === "GET") {
        let db = await getDB();
        return new Response(JSON.stringify(db), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/register" && request.method === "POST") {
        try {
          let body = await request.json();
          let name = body.name;
          let user = body.user;
          let pass = body.pass;
          let ref = body.ref;

          if (!user || !pass) {
            return new Response(JSON.stringify({ success: false, message: "Username and password required" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          user = user.trim().toLowerCase();
          let cleanRef = ref ? ref.trim().toLowerCase() : "";
          
          let db = await getDB();
          if (db.users[user]) {
            return new Response(JSON.stringify({ success: false, message: "Username already taken" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          let refBy = "";
          let initialBal = 0;

          if (cleanRef && db.users[cleanRef]) {
            refBy = cleanRef;
            initialBal = 0;
            db.users[cleanRef].bal += 50; 
            db.refs.push({ id: Date.now(), referrer: cleanRef, referred: user, amt: 50 });
          }

          db.users[user] = { name: name || user, pass, bal: initialBal, refBy };
          await saveDB(db);

          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (regErr) {
          return new Response(JSON.stringify({ success: false, message: "Server Error: " + regErr.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (url.pathname === "/api/admin-login" && request.method === "POST") {
        let { user, pass } = await request.json();
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
          return new Response(JSON.stringify({ success: true, isAdmin: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/deposit" && request.method === "POST") {
        let { user, amt, bonus, total, utr } = await request.json();
        if (!user) {
          return new Response(JSON.stringify({ success: false, message: "User not specified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        user = user.trim().toLowerCase();
        let db = await getDB();
        
        db.deps.push({
          id: Date.now(),
          user,
          amt,
          bonus,
          total,
          utr,
          status: "Pending"
        });

        await saveDB(db);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/withdraw" && request.method === "POST") {
        let { user, amt, upi } = await request.json();
        if (!user) {
          return new Response(JSON.stringify({ success: false, message: "User not specified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        user = user.trim().toLowerCase();
        let db = await getDB();

        if (!db.users[user] || db.users[user].bal < amt) {
          return new Response(JSON.stringify({ success: false, message: "Insufficient balance" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        db.users[user].bal -= amt;
        db.wits.push({
          id: Date.now(),
          user,
          amt,
          upi,
          status: "Pending"
        });

        await saveDB(db);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/admin-action" && request.method === "POST") {
        let body = await request.json();
        let db = await getDB();

        if (body.action === "appD") {
          let dep = db.deps.find(d => d.id === body.id);
          if (dep && dep.status === "Pending") {
            dep.status = "Approved";
            let depUser = dep.user.trim().toLowerCase();
            if (db.users[depUser]) {
              db.users[depUser].bal += dep.total;
            }
          }
        } else if (body.action === "rejD") {
          let dep = db.deps.find(d => d.id === body.id);
          if (dep && dep.status === "Pending") {
            dep.status = "Rejected";
          }
        } else if (body.action === "appW") {
          let wit = db.wits.find(w => w.id === body.id);
          if (wit && wit.status === "Pending") {
            wit.status = "Paid";
          }
        } else if (body.action === "rejW") {
          let wit = db.wits.find(w => w.id === body.id);
          if (wit && wit.status === "Pending") {
            wit.status = "Cancelled";
            let witUser = wit.user.trim().toLowerCase();
            if (db.users[witUser]) {
              db.users[witUser].bal += wit.amt;
            }
          }
        } else if (body.action === "updateUPI") {
          db.cfg.upi = body.upi;
        } else if (body.action === "updateTG") {
          db.cfg.tg = body.tg;
        } else if (body.action === "resetPass") {
          let targetUser = body.user ? body.user.trim().toLowerCase() : "";
          if (targetUser && db.users[targetUser]) {
            db.users[targetUser].pass = body.pass;
          }
        }

        await saveDB(db);
        return new Response(JSON.stringify({ success: true, db }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }
};
