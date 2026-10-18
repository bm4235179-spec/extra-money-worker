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
        console.error("getDB error:", err);
        return { users: {}, deps: [], wits: [], refs: [], cfg: { upi: "", tg: "@extramoney67" } };
      }
    }

    async function saveDB(data) {
      await env.DB.prepare("UPDATE app_data SET val = ? WHERE id = 'DB'").bind(JSON.stringify(data)).run();
    }

    try {
      if (url.pathname === "/" && request.method === "GET") {
        const html = `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Extra Money - Premium Wallet</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;-webkit-tap-highlight-color:transparent}
body{background:#030712;color:#f3f4f6;display:flex;justify-content:center;min-height:100vh}
.app{width:100%;max-width:430px;background:radial-gradient(circle at top,#111827,#030712);min-height:100vh;position:relative;overflow-x:hidden;box-shadow:0 0 50px rgba(0,0,0,0.8)}
.screen{display:none;padding:24px;min-height:100vh;flex-direction:column;animation:fadeIn .3s ease}
.screen.active{display:flex!important}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.logo{width:88px;height:88px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;margin:30px auto 12px;box-shadow:0 12px 30px rgba(16,185,129,0.35)}
.brand{color:#fff;text-align:center;font-size:1.9rem;font-weight:800;letter-spacing:-0.5px}
.sub{text-align:center;font-size:13px;color:#9ca3af;margin-top:6px;font-weight:500}
.btn{width:100%;padding:16px 20px;border:none;border-radius:18px;font-weight:700;font-size:15px;margin-top:14px;cursor:pointer;position:relative;letter-spacing:0.3px;transition:all.2s ease;display:flex;align-items:center;justify-content:center;gap:10px}
.btn:active{transform:scale(0.97)}
.btn1{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 10px 25px rgba(16,185,129,0.4)}
.btn2{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);color:#10b981;box-shadow:0 4px 20px rgba(0,0,0,0.2)}
.btnr{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 8px 20px rgba(239,68,68,0.35)}
.inp{width:100%;padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(17,24,39,0.7);color:#fff;margin-top:14px;font-size:15px;outline:none;transition:all.2s}
.inp:focus{border-color:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,0.15);background:rgba(17,24,39,0.9)}
.card{background:rgba(17,24,39,0.6);backdrop-filter:blur(12px);border-radius:22px;padding:20px;margin-top:14px;border:1px solid rgba(255,255,255,0.07);box-shadow:0 8px 30px rgba(0,0,0,0.3)}
.link{color:#10b981;text-align:center;display:block;margin-top:16px;cursor:pointer;font-size:14px;font-weight:600;text-decoration:none}
.link:hover{text-decoration:underline}
.whead{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:20}
.whead .g{font-size:13px;color:#9ca3af;font-weight:500}
.whead .n{font-size:20px;font-weight:800;color:#fff;margin-top:2px}
.whead .id{font-size:12px;color:#10b981;font-weight:600}
.dots{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#10b981;cursor:pointer;transition:all.2s}
.dots:hover{background:rgba(16,185,129,0.15)}
.dd{position:absolute;top:55px;left:0;background:#111827;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:8px;min-width:220px;z-index:100;display:none;flex-direction:column;box-shadow:0 15px 50px rgba(0,0,0,0.7)}
.dd.show{display:flex}
.dd a{color:#e5e7eb;text-decoration:none;padding:12px 16px;border-radius:14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all.15s}
.dd a:hover{background:rgba(16,185,129,0.15);color:#10b981}
.wal{width:180px;height:180px;border-radius:50%;background:linear-gradient(135deg,rgba(17,24,39,0.9),rgba(3,7,18,0.9));border:2px solid rgba(16,185,129,0.4);margin:25px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 50px rgba(16,185,129,0.2),inset 0 0 20px rgba(16,185,129,0.1)}
.wal .s{font-size:11px;letter-spacing:1.5px;color:#9ca3af;font-weight:700}
.wal .b{font-size:28px;color:#10b981;font-weight:800;margin-top:6px}
.upi{background:rgba(17,24,39,0.8);border:2px dashed rgba(16,185,129,0.4);padding:20px;border-radius:20px;text-align:center;margin-top:16px}
.upi h3{color:#10b981;font-size:1.25rem;margin-bottom:8px;word-break:break-all;font-weight:700}
table{width:100%;font-size:12px;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid rgba(255,255,255,0.08);padding:10px;word-break:break-all;text-align:left}
th{background:rgba(17,24,39,0.9);color:#10b981;font-weight:700}
table button{background:#10b981;color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin:2px}
table button.r{background:#ef4444}
.modal{position:fixed;inset:0;background:rgba(3,7,18,0.8);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:300;padding:20px}
.modal.show{display:flex}
.mcard{background:#111827;border:1px solid rgba(255,255,255,0.12);border-radius:28px;padding:26px;max-width:380px;width:100%;box-shadow:0 25px 70px rgba(0,0,0,0.8);max-height:85vh;overflow-y:auto}
.mcard h4{color:#10b981;font-size:1.4rem;margin-bottom:18px;font-weight:800}
.mcard .r{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;font-weight:500}
.mclose{width:100%;margin-top:20px;padding:14px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;font-weight:700;cursor:pointer}
.toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-100px);background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:16px 26px;border-radius:18px;font-weight:700;font-size:14px;z-index:1000;transition:transform.35s cubic-bezier(0.175,0.885,0.32,1.275);max-width:90%;text-align:center;box-shadow:0 10px 30px rgba(16,185,129,0.4)}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast.e{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 10px 30px rgba(239,68,68,0.4)}
.tx{display:flex;justify-content:space-between;align-items:center;padding:14px;background:rgba(17,24,39,0.5);border-radius:16px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.05)}
.tx .t{font-weight:700;font-size:14px}
.tx .d{font-size:12px;color:#9ca3af;margin-top:3px}
.tx .a{font-weight:800;color:#10b981;font-size:15px}
.tx .a.n{color:#ef4444}
</style>
</head>
<body>
<div class="app">
<div class="toast" id="toast"></div>

<!-- Screen 1 -->
<div class="screen active" id="s1">
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center">
    <div class="logo">EM</div>
    <h1 class="brand">EXTRA MONEY</h1>
    <p class="sub">⚡ Fast • Secure • Instant Rewards ⚡</p>
    <button class="btn btn1" onclick="go('s2')">🚀 Create Account</button>
    <button class="btn btn2" onclick="go('s3')">🔐 Sign In</button>
    <a class="link" id="tgLinkFront" href="#" target="_blank">📞 Customer Support</a>
  </div>
</div>

<!-- Screen 2 -->
<div class="screen" id="s2">
  <h2 style="color:#10b981;font-weight:800;font-size:1.6rem">Create Account</h2>
  <p class="sub" style="text-align:left;margin-top:4px">Join today and start earning rewards</p>
  <input class="inp" id="su_name" placeholder="Full Name">
  <input class="inp" id="su_user" placeholder="Username">
  <input class="inp" id="su_pass" type="password" placeholder="Password">
  <input class="inp" id="su_ref" placeholder="Referral Code (Optional)">
  <button class="btn btn1" onclick="doRegister()">✨ Register Now</button>
  <a class="link" onclick="go('s3')">Already have an account? Sign In</a>
  <a class="link" onclick="go('s1')">← Back to Home</a>
</div>

<!-- Screen 3 -->
<div class="screen" id="s3">
  <h2 style="color:#10b981;font-weight:800;font-size:1.6rem">Welcome Back</h2>
  <p class="sub" style="text-align:left;margin-top:4px">Enter your credentials to access wallet</p>
  <input class="inp" id="si_user" placeholder="Username">
  <input class="inp" id="si_pass" type="password" placeholder="Password">
  <button class="btn btn1" onclick="doLogin()">🔓 Secure Sign In</button>
  <a class="link" onclick="go('s2')">New user? Create Account</a>
  <a class="link" onclick="go('s1')">← Back to Home</a>
</div>

<!-- Screen 4 -->
<div class="screen" id="s4">
  <div class="whead">
    <div><div class="g">Welcome back 👋</div><div class="n" id="w_name">User</div><div class="id" id="w_id">@id</div></div>
    <div class="dots" id="toggleMenu">⋮</div>
    <div class="dd" id="dd">
      <a onclick="openInfo('profile')">👤 My Profile</a>
      <a onclick="openInfo('deposit')">📥 Total Deposits</a>
      <a onclick="openInfo('withdraw')">📤 Total Withdrawals</a>
      <a onclick="openInfo('transaction')">📋 History</a>
      <a id="ddSupport" href="#" target="_blank">📞 Support</a>
    </div>
  </div>
  <div class="wal"><span class="s">WALLET BALANCE</span><b class="b" id="w_bal">Rs0</b></div>
  <button class="btn btn1" onclick="go('s5')">➕ Add Money</button>
  <button class="btn btn2" onclick="go('s6')">💸 Withdraw Funds</button>
  <button class="btn" onclick="shareWhatsApp()" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none">💬 Invite on WhatsApp (Earn ₹50)</button>
  <div class="card" id="w_hist"></div>
  <button class="btn btnr" onclick="doLogout()" style="margin-top:20px">🚪 Logout Account</button>
</div>

<!-- Screen 5 -->
<div class="screen" id="s5">
  <h2 style="color:#10b981;font-weight:800;font-size:1.6rem">Add Money</h2>
  <p class="sub" style="text-align:left;margin-top:4px">Get 5% instant bonus on every deposit</p>
  <input class="inp" id="dep_amt" type="number" placeholder="Enter Amount (e.g. 2500)" min="100" oninput="calcBonus()">
  <div class="card">You will receive: <b id="dep_prev" style="color:#10b981;font-size:1.1rem">Rs0</b></div>
  <div class="upi" id="upiSec" style="display:none">
    <p style="font-size:12px;color:#9ca3af">Pay to Merchant UPI:</p>
    <h3 id="showUPI">Not Set</h3>
    <p style="font-size:13px;color:#d1d5db;margin-bottom:14px" id="showAmt"></p>
    <button class="btn btn1" onclick="payViaUPI()">💳 Pay via UPI App</button>
  </div>
  <button class="btn btn1" id="btnProceed" onclick="proceedPay()">💰 Proceed to Pay</button>
  <button class="btn btn2" onclick="go('s4')">← Back to Dashboard</button>
</div>

<!-- Screen 6 -->
<div class="screen" id="s6">
  <h2 style="color:#10b981;font-weight:800;font-size:1.6rem">Withdraw Funds</h2>
  <p class="sub" style="text-align:left;margin-top:4px">Transfer funds directly to your UPI ID</p>
  <input class="inp" id="wit_amt" type="number" placeholder="Enter Amount">
  <input class="inp" id="wit_upi" placeholder="Your UPI ID (e.g. name@paytm)">
  <button class="btn btn1" onclick="requestWithdraw()">📤 Request Withdrawal</button>
  <button class="btn btn2" onclick="go('s4')">← Back to Dashboard</button>
</div>

<!-- Screen 7 -->
<div class="screen" id="s7">
  <h2 style="color:#10b981;font-weight:800;font-size:1.6rem">⚙️ Admin Panel</h2>
  <div class="card">
    <p style="font-size:12px;color:#9ca3af">Current Merchant UPI:</p>
    <h3 id="admUPI" style="color:#10b981;word-break:break-all;margin:6px 0">Not Set</h3>
    <input class="inp" id="newUPI" placeholder="New UPI ID">
    <button class="btn btn1" onclick="updateAdminUPI()">✅ Update UPI</button>
  </div>
  <div class="card">
    <h3 style="color:#10b981;font-size:14px;font-weight:700">📞 Support Telegram Link</h3>
    <p style="font-size:12px;color:#9ca3af;margin:6px 0">Current: <b id="admTG" style="color:#fff"></b></p>
    <input class="inp" id="newTG" placeholder="@username or https://t.me/...">
    <button class="btn btn1" onclick="updateAdminTG()">🔗 Update Support Link</button>
  </div>
  <div class="card" style="border-color:rgba(239,68,68,0.3)">
    <h3 style="color:#ef4444;font-size:14px;font-weight:700">🔑 Reset User Password</h3>
    <input class="inp" id="rsUser" placeholder="Username">
    <input class="inp" id="rsPass" placeholder="New Password">
    <button class="btn btnr" onclick="resetUserPass()">Reset Password</button>
  </div>
  <div class="card"><h3 style="color:#10b981;font-size:14px;font-weight:700">📥 Pending Deposits</h3><table id="depT"></table></div>
  <div class="card"><h3 style="color:#10b981;font-size:14px;font-weight:700">📤 Pending Withdrawals</h3><table id="witT"></table></div>
  <div class="card"><h3 style="color:#10b981;font-size:14px;font-weight:700">👥 All Users</h3><table id="userT"></table></div>
  <button class="btn btnr" onclick="go('s1')" style="margin-top:20px">🚪 Logout Admin</button>
</div>
</div>

<div class="modal" id="modal" onclick="if(event.target===this) closeM()"><div class="mcard" id="modalC"></div></div>

<script>
var API_URL = "";
var dbData = { users: {}, deps: [], wits: [], refs: [], cfg: { upi: "", tg: "@extramoney67" } };
var cur = "", curDepAmt = 0;

window.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');
  if (refParam) {
    document.getElementById('su_ref').value = refParam;
    go('s2');
  }
  fetchData();
});

function toast(m, e) {
  var t = document.getElementById('toast');
  t.innerText = m;
  t.className = 'toast' + (e ? ' e' : '');
  t.classList.add('show');
  clearTimeout(window._tt);
  window._tt = setTimeout(function() { t.classList.remove('show') }, 2500);
}

function tgURL(v) {
  if (!v) return '#';
  v = String(v).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.charAt(0) === '@') return 'https://t.me/' + v.slice(1);
  return 'https://t.me/' + v;
}

function refreshUI() {
  var upiTxt = dbData.cfg.upi || 'Not Set';
  document.getElementById('showUPI').innerText = upiTxt;
  document.getElementById('admUPI').innerText = upiTxt;
  var url = tgURL(dbData.cfg.tg || '@extramoney67');
  document.getElementById('tgLinkFront').href = url;
  document.getElementById('ddSupport').href = url;
  var a = document.getElementById('admTG');
  if (a) a.innerText = dbData.cfg.tg || '@extramoney67';
}

async function fetchData() {
  try {
    var res = await fetch(API_URL + '/api/get-data?t=' + Date.now());
    var data = await res.json();
    if (data && data.users) {
      dbData = data;
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
  refreshUI();
}

async function sendAdminAction(actionObj) {
  try {
    var res = await fetch(API_URL + '/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionObj)
    });
    var data = await res.json();
    if (data.success) {
      dbData = data.db;
      refAdmin();
      refreshUI();
      toast('✅ Success');
    } else {
      toast('❌ Failed', 1);
    }
  } catch (err) {
    toast('❌ Network Error', 1);
  }
}

function go(id) {
  var all = document.querySelectorAll('.screen');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  var target = document.getElementById(id);
  if (target) target.classList.add('active');
  var dd = document.getElementById('dd');
  if (dd) dd.classList.remove('show');

  if (id === 's4') refWallet();
  if (id === 's7') refAdmin();
  if (id === 's5') {
    var upiSec = document.getElementById('upiSec');
    var btnProceed = document.getElementById('btnProceed');
    if (upiSec) upiSec.style.display = 'none';
    if (btnProceed) btnProceed.style.display = 'block';
  }
  window.scrollTo(0, 0);
  fetchData();
}

var toggleMenuEl = document.getElementById('toggleMenu');
if (toggleMenuEl) {
  toggleMenuEl.onclick = function(e) {
    e.stopPropagation();
    var dd = document.getElementById('dd');
    if (dd) dd.classList.toggle('show');
  };
}

document.addEventListener('click', function(e) {
  var dd = document.getElementById('dd');
  var tm = document.getElementById('toggleMenu');
  if (dd && tm && !dd.contains(e.target) && e.target !== tm) {
    dd.classList.remove('show');
  }
});

function refWallet() {
  if (!cur || !dbData.users[cur]) return;
  var userObj = dbData.users[cur];
  document.getElementById('w_name').innerText = userObj.name;
  document.getElementById('w_id').innerText = '@' + cur;
  document.getElementById('w_bal').innerText = 'Rs' + userObj.bal;
  
  var allTx = [];
  dbData.deps.forEach(function(d) {
    if (d.user === cur) allTx.push({ type: 'Deposit', amt: d.total, status: d.status, time: d.id, sign: '+' });
  });
  dbData.wits.forEach(function(w) {
    if (w.user === cur) allTx.push({ type: 'Withdraw', amt: w.amt, status: w.status, time: w.id, sign: '-' });
  });

  allTx.sort(function(a, b) { return b.time - a.time; });

  var h = '<b style="color:#10b981;font-size:14px">📋 Recent History</b>', has = false;
  allTx.forEach(function(tx) {
    has = true;
    var isDep = tx.type === 'Deposit';
    var amtColor = isDep ? '#10b981' : '#ef4444';
    var signClass = isDep ? '' : ' n';
    h += '<div class="tx"><div><div class="t">' + (isDep ? '📥 Deposit' : '📤 Withdraw') + '</div><div class="d">' + tx.status + '</div></div><div class="a' + signClass + '" style="color:' + amtColor + '">' + tx.sign + 'Rs' + tx.amt + '</div></div>';
  });

  if (!has) h += '<p style="font-size:13px;color:#9ca3af;margin-top:8px">No transactions yet</p>';
  document.getElementById('w_hist').innerHTML = h;
}

function refAdmin() {
  document.getElementById('admUPI').innerText = dbData.cfg.upi || 'Not Set';
  var dt = document.getElementById('depT');
  dt.innerHTML = '<tr><th>User</th><th>Total Amt</th><th>Action</th></tr>';
  dbData.deps.forEach(function(d) {
    if (d.status === 'Pending') {
      dt.innerHTML += '<tr><td>' + d.user + '</td><td>Rs' + d.total + '</td><td><button onclick="appD(' + d.id + ')">✓</button><button class="r" onclick="rejD(' + d.id + ')">✗</button></td></tr>';
    }
  });

  var wt = document.getElementById('witT');
  wt.innerHTML = '<tr><th>User</th><th>Amt</th><th>UPI</th><th>Action</th></tr>';
  dbData.wits.forEach(function(w) {
    if (w.status === 'Pending') {
      wt.innerHTML += '<tr><td>' + w.user + '</td><td>' + w.amt + '</td><td>' + w.upi + '</td><td><button onclick="appW(' + w.id + ')">✓</button><button class="r" onclick="rejW(' + w.id + ')">✗</button></td></tr>';
    }
  });

  var ut = document.getElementById('userT');
  ut.innerHTML = '<tr><th>User</th><th>Bal</th></tr>';
  for (var k in dbData.users) {
    ut.innerHTML += '<tr><td>' + k + '</td><td>Rs' + dbData.users[k].bal + '</td></tr>';
  }
  refreshUI();
}

window.appD = function(id) { sendAdminAction({ action: 'appD', id: id }); };
window.rejD = function(id) { sendAdminAction({ action: 'rejD', id: id }); };
window.appW = function(id) { sendAdminAction({ action: 'appW', id: id }); };
window.rejW = function(id) { sendAdminAction({ action: 'rejW', id: id }); };

function openInfo(t) {
  if (!cur || !dbData.users[cur]) return;
  var u = dbData.users[cur], h = '';
  if (t === 'profile') {
    h = '<h4>👤 Profile</h4><div class="r"><span>Name</span><span>' + u.name + '</span></div><div class="r"><span>Username</span><span>@' + cur + '</span></div><div class="r"><span>Balance</span><span>Rs' + u.bal + '</span></div><button class="mclose" onclick="closeM()">Close</button>';
  } else if (t === 'deposit') {
    var tot = 0, c = 0;
    dbData.deps.forEach(function(d) { if (d.user === cur && d.status === 'Approved') { tot += d.total; c++; } });
    var p = dbData.deps.filter(function(d) { return d.user === cur && d.status === 'Pending' }).length;
    h = '<h4>📥 Deposits</h4><div class="r"><span>Approved</span><span>Rs' + tot + '</span></div><div class="r"><span>Count</span><span>' + c + '</span></div><div class="r"><span>Pending</span><span>' + p + '</span></div><button class="mclose" onclick="closeM()">Close</button>';
  } else if (t === 'withdraw') {
    var tw = 0, cw = 0;
    dbData.wits.forEach(function(w) { if (w.user === cur && w.status === 'Paid') { tw += w.amt; cw++; } });
    var pw = dbData.wits.filter(function(w) { return w.user === cur && w.status === 'Pending' }).length;
    h = '<h4>📤 Withdrawals</h4><div class="r"><span>Paid</span><span>Rs' + tw + '</span></div><div class="r"><span>Count</span><span>' + cw + '</span></div><div class="r"><span>Pending</span><span>' + pw + '</span></div><button class="mclose" onclick="closeM()">Close</button>';
  } else if (t === 'transaction') {
    var all = [];
    dbData.deps.forEach(function(d) { if (d.user === cur) all.push({ t: 'Deposit', a: d.total, s: d.status, time: d.id, sign: '+' }); });
    dbData.wits.forEach(function(w) { if (w.user === cur) all.push({ t: 'Withdraw', a: w.amt, s: w.status, time: w.id, sign: '-' }); });
    all.sort(function(a, b) { return b.time - a.time; });
    var rows = '';
    if (all.length === 0) rows = '<div class="r"><span>No transactions</span></div>';
    all.slice(0, 15).forEach(function(tx) {
      var isDep = tx.t === 'Deposit';
      var cl = isDep ? '#10b981' : '#ef4444';
      rows += '<div class="r"><span>' + tx.t + '<br><small style="color:#9ca3af">' + tx.s + '</small></span><span style="color:' + cl + '">' + tx.sign + 'Rs' + tx.a + '</span></div>';
    });
    h = '<h4>📋 History</h4>' + rows + '<button class="mclose" onclick="closeM()">Close</button>';
  }
  document.getElementById('modalC').innerHTML = h;
  document.getElementById('modal').classList.add('show');
}

window.closeM = function() { document.getElementById('modal').classList.remove('show'); };

async function doRegister() {
  var n = document.getElementById('su_name').value.trim();
  var u = document.getElementById('su_user').value.trim().toLowerCase();
  var p = document.getElementById('su_pass').value.trim();
  var r = document.getElementById('su_ref').value.trim().toLowerCase();
  if (!n || !u || !p) { toast('⚠️ Please fill all fields', 1); return; }
  
  try {
    var res = await fetch(API_URL + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, user: u, pass: p, ref: r })
    });
    var data = await res.json();
    if (data.success) {
      toast('✅ Account Created Successfully!');
      setTimeout(function() {
        document.getElementById('si_user').value = u;
        go('s3');
      }, 1000);
    } else {
      toast('❌ ' + data.message, 1);
    }
  } catch (err) {
    toast('❌ Network Error', 1);
  }
}

function shareWhatsApp() {
  if (!cur) return;
  var appUrl = window.location.origin + window.location.pathname + '?ref=' + cur;
  var message = "🔥 Join Extra Money App & earn rewards!\n\nSign up using my link: " + appUrl;
  var whatsappUrl = "whatsapp://send?text=" + encodeURIComponent(message);
  window.location.href = whatsappUrl;
}

async function doLogin() {
  var u = document.getElementById('si_user').value.trim().toLowerCase();
  var p = document.getElementById('si_pass').value.trim();

  if (!u || !p) { toast('⚠️ Please fill fields', 1); return; }

  try {
    var res = await fetch(API_URL + '/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: document.getElementById('si_user').value.trim(), pass: p })
    });
    var data = await res.json();
    if (data.success && data.isAdmin) {
      toast('👑 Admin Login Successful');
      setTimeout(function() { go('s7'); }, 600);
      return;
    }
  } catch (err) {
    console.error("Admin login error:", err);
  }

  await fetchData();

  if (dbData.users[u] && dbData.users[u].pass === p) {
    cur = u;
    toast('✅ Welcome ' + dbData.users[u].name);
    setTimeout(function() { go('s4'); }, 600);
  } else {
    toast('❌ Invalid username or password', 1);
  }
}

function doLogout() {
  cur = "";
  toast('👋 Logged Out');
  go('s1');
}

function calcBonus() {
  var a = parseInt(document.getElementById('dep_amt').value) || 0;
  var b = Math.round(a * 0.05);
  document.getElementById('dep_prev').innerText = 'Rs' + (a + b) + ' (Includes 5% bonus)';
}

function proceedPay() {
  var a = parseInt(document.getElementById('dep_amt').value);
  if (!a || a < 100) { toast('⚠️ Minimum amount is Rs100', 1); return; }
  if (!dbData.cfg.upi) { toast('⚠️ UPI not configured by admin', 1); return; }
  curDepAmt = a;
  var b = Math.round(a * 0.05);
  document.getElementById('showUPI').innerText = dbData.cfg.upi;
  document.getElementById('showAmt').innerText = 'Pay Rs' + a + ' → Get Rs' + (a + b);
  document.getElementById('upiSec').style.display = 'block';
  document.getElementById('btnProceed').style.display = 'none';
}

async function payViaUPI() {
  if (!curDepAmt) return;
  if (!dbData.cfg.upi) { toast('⚠️ UPI not set', 1); return; }
  
  var a = curDepAmt;
  var b = Math.round(a * 0.05);
  var autoUtr = "APP_PAY_" + Date.now();

  try {
    var res = await fetch(API_URL + '/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: cur, amt: a, bonus: b, total: a + b, utr: autoUtr })
    });
    var data = await res.json();
    if (data.success) {
      toast('✅ Request sent! Opening Payment App...');
      
      var payeeAddress = dbData.cfg.upi;
      var payeeName = "ExtraMoney";
      var transactionNote = "AddMoney_" + cur;

      var intentUrl = "intent://pay?pa=" + encodeURIComponent(payeeAddress) + 
                      "&pn=" + encodeURIComponent(payeeName) + 
                      "&am=" + a + 
                      "&cu=INR&tn=" + encodeURIComponent(transactionNote) + 
                      "#Intent;scheme=upi;package=net.one97.paytm;end;";

      setTimeout(function() {
        window.location.href = intentUrl;
        document.getElementById('dep_amt').value = '';
        curDepAmt = 0;
        document.getElementById('upiSec').style.display = 'none';
        document.getElementById('btnProceed').style.display = 'block';
        go('s4');
      }, 1000);
    }
  } catch (err) {
    toast('❌ Network Error', 1);
  }
}

async function requestWithdraw() {
  var a = parseInt(document.getElementById('wit_amt').value);
  var u = document.getElementById('wit_upi').value.trim();
  if (!a || !u) { toast('⚠️ Enter amount and UPI ID', 1); return; }
  if (!cur || !dbData.users[cur]) return;
  if (dbData.users[cur].bal < a) { toast('❌ Insufficient balance', 1); return; }

  try {
    var res = await fetch(API_URL + '/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: cur, amt: a, upi: u })
    });
    var data = await res.json();
    if (data.success) {
      toast('✅ Withdrawal Request Sent');
      document.getElementById('wit_amt').value = '';
      document.getElementById('wit_upi').value = '';
      setTimeout(function() { go('s4'); }, 1000);
    } else {
      toast('❌ ' + data.message, 1);
    }
  } catch (err) {
    toast('❌ Network Error', 1);
  }
}

function updateAdminUPI() {
  var v = document.getElementById('newUPI').value.trim();
  if (!v) { toast('⚠️ Enter UPI ID', 1); return; }
  if (!v.includes('@')) { toast('⚠️ Enter valid UPI ID', 1); return; }
  sendAdminAction({ action: 'updateUPI', upi: v });
  document.getElementById('newUPI').value = '';
}

function updateAdminTG() {
  var v = document.getElementById('newTG').value.trim();
  if (!v) { toast('⚠️ Enter Telegram link', 1); return; }
  sendAdminAction({ action: 'updateTG', tg: v });
  document.getElementById('newTG').value = '';
}

function resetUserPass() {
  var u = document.getElementById('rsUser').value.trim().toLowerCase();
  var p = document.getElementById('rsPass').value.trim();
  if (!u || !p) { toast('⚠️ Enter username & password', 1); return; }
  if (!dbData.users[u]) { toast('❌ User not found', 1); return; }
  sendAdminAction({ action: 'resetPass', user: u, pass: p });
  document.getElementById('rsUser').value = '';
  document.getElementById('rsPass').value = '';
}
</script>
</body>
</html>`;

        return new Response(html, {
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }

      if (url.pathname === "/api/get-data" && request.method === "GET") {
        let db = await getDB();
        return new Response(JSON.stringify(db), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/register" && request.method === "POST") {
        let { name, user, pass, ref } = await request.json();
        user = user.trim().toLowerCase();
        
        let db = await getDB();
        if (db.users[user]) {
          return new Response(JSON.stringify({ success: false, message: "Username already taken" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        let refBy = "";
        let initialBal = 0;

        if (ref && db.users[ref]) {
          refBy = ref;
          initialBal = 0;
          db.users[ref].bal += 50; 
          db.refs.push({ id: Date.now(), referrer: ref, referred: user, amt: 50 });
        }

        db.users[user] = { name, pass, bal: initialBal, refBy };
        await saveDB(db);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
            if (db.users[dep.user]) {
              db.users[dep.user].bal += dep.total;
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
            if (db.users[wit.user]) {
              db.users[wit.user].bal += wit.amt;
            }
          }
        } else if (body.action === "updateUPI") {
          db.cfg.upi = body.upi;
        } else if (body.action === "updateTG") {
          db.cfg.tg = body.tg;
        } else if (body.action === "resetPass") {
          if (db.users[body.user]) {
            db.users[body.user].pass = body.pass;
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
