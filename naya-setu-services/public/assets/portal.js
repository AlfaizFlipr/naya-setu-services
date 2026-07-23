/* Naya Setu Services — customer + in-dashboard admin portal SPA (vanilla JS, no build step). */

var content = document.getElementById("nss-content");
var titleEl = document.getElementById("nss-topbar-title");

// --------------------------------------------------------------- utils
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
function money(n) {
  n = parseFloat(n) || 0;
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function toast(msg, type) {
  var box = document.getElementById("nss-toast");
  if (!box) return;
  var t = document.createElement("div");
  t.className =
    "nss-toast " +
    (type === "err" ? "nss-toast-err" : type === "ok" ? "nss-toast-ok" : "");
  t.innerHTML =
    icon("err" === type ? "x-circle" : "check-circle") + "<span></span>";
  t.querySelector("span").textContent = msg;
  box.appendChild(t);
  setTimeout(function () {
    t.classList.add("nss-toast-out");
    setTimeout(function () {
      t.remove();
    }, 220);
  }, 3800);
}
window.addEventListener("unhandledrejection", function (e) {
  toast((e.reason && e.reason.message) || "Something went wrong.", "err");
});
window.addEventListener("error", function (e) {
  if (e.error) toast(e.message || "Something went wrong.", "err");
});
function api(path, method, body) {
  var opts = {
    method: method || "GET",
    headers: { "X-WP-Nonce": NSS.nonce },
    credentials: "same-origin",
  };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  return fetch(NSS.root + path, opts).then(function (res) {
    return res.json().then(function (json) {
      if (!json.ok) throw new Error(json.message || "Something went wrong.");
      return json;
    });
  });
}
function restFileUrl(path) {
  return (
    NSS.root +
    path +
    (path.indexOf("?") === -1 ? "?" : "&") +
    "_wpnonce=" +
    encodeURIComponent(NSS.nonce)
  );
}
function setTitle(t) {
  titleEl.textContent = t;
}
function setActiveNav(route) {
  document.querySelectorAll("#nss-nav a[data-route]").forEach(function (a) {
    a.classList.toggle("active", a.dataset.route === route);
  });
}
function showLoading() {
  content.innerHTML =
    '<div class="nss-loading"><div class="nss-spinner"></div>Loading…</div>';
}
function errorBox(e) {
  return (
    '<div class="nss-card nss-panel"><p class="nss-error-text">' +
    esc(e.message) +
    "</p></div>"
  );
}
function emptyState(iconName, title, sub) {
  return (
    '<div class="nss-empty-state">' +
    icon(iconName, "nss-icon-lg") +
    "<strong>" +
    esc(title) +
    "</strong>" +
    (sub ? "<div>" + esc(sub) + "</div>" : "") +
    "</div>"
  );
}
function formToObject(form) {
  var data = {};
  new FormData(form).forEach(function (v, k) {
    data[k] = v;
  });
  return data;
}
function fmtDate(s) {
  if (!s || "0000-00-00 00:00:00" === s) return "—";
  var d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

var STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  in_progress: "In Progress",
  pending_user: "Pending From You",
  completed: "Completed",
  rejected: "Rejected",
};
function statusPill(status) {
  return (
    '<span class="nss-status-pill nss-status-' +
    esc(status) +
    '">' +
    esc(STATUS_LABELS[status] || status) +
    "</span>"
  );
}
var DOC_TYPE_LABELS = {
  photo: "Photo",
  signature: "Signature",
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  samagra: "Samagra ID Card",
  passport: "Passport",
  dl: "Driving Licence",
  gst: "GST Certificate",
  cheque: "Cancelled Cheque",
  other: "Other Document",
};

// --------------------------------------------------------------- icons
var ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  "id-card":
    '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="12" r="2"/><path d="M5 17c.5-1.7 1.8-2.5 3.5-2.5S11.5 15.3 12 17"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="13.5" x2="19" y2="13.5"/>',
  briefcase:
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  bank: '<line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="10" y1="21" x2="10" y2="10"/><line x1="14" y1="21" x2="14" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 21 8 3 8"/>',
  car: '<path d="M5 17h14"/><path d="M3 17V11l2-5h14l2 5v6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  scale:
    '<line x1="12" y1="3" x2="12" y2="21"/><path d="M5 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M19 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M4 8h16"/><path d="M9 21h6"/>',
  package:
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  landmark:
    '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 21 8 3 8"/>',
  laptop:
    '<rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M9 20v-6h6v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "file-text":
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  folder:
    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  "shield-check":
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  receipt:
    '<path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-3 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  "chevron-right": '<polyline points="9 18 15 12 9 6"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  "arrow-left":
    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  "check-circle":
    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  "x-circle":
    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  "credit-card":
    '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  chart:
    '<line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/>',
};
function icon(name, cls) {
  if (!ICONS[name]) return "";
  return (
    '<svg class="nss-icon ' +
    (cls || "") +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[name] +
    "</svg>"
  );
}

// --------------------------------------------------------------- state + data loaders
var STATE = { catalog: null, profile: null, documents: null };

function loadCatalog() {
  if (STATE.catalog) return Promise.resolve(STATE.catalog);
  return api("/catalog").then(function (res) {
    STATE.catalog = res;
    return res;
  });
}
function loadProfile(force) {
  if (STATE.profile && !force) return Promise.resolve(STATE.profile);
  return api("/profile").then(function (res) {
    STATE.profile = res.profile;
    return STATE.profile;
  });
}
function loadDocuments(force) {
  if (STATE.documents && !force) return Promise.resolve(STATE.documents);
  return api("/documents").then(function (res) {
    STATE.documents = res.items;
    return STATE.documents;
  });
}
function findService(serviceKey) {
  var cats = (STATE.catalog && STATE.catalog.categories) || [];
  for (var i = 0; i < cats.length; i++) {
    for (var j = 0; j < cats[i].services.length; j++) {
      if (cats[i].services[j].service_key === serviceKey)
        return { service: cats[i].services[j], category: cats[i] };
    }
  }
  return null;
}
function findCategory(key) {
  var cats = (STATE.catalog && STATE.catalog.categories) || [];
  for (var i = 0; i < cats.length; i++) if (cats[i].key === key) return cats[i];
  return null;
}

// --------------------------------------------------------------- router
function router() {
  var hash = (location.hash || "#dashboard").replace("#", "");
  var parts = hash.split("/");
  var route = parts[0];
  setActiveNav(route);
  showLoading();
  if ("dashboard" === route) renderDashboard();
  else if ("category" === route)
    renderCategory(decodeURIComponent(parts[1] || ""));
  else if ("service" === route)
    renderServiceStart(decodeURIComponent(parts[1] || ""));
  else if ("application" === route) renderApplicationDetail(parts[1]);
  else if ("applications" === route) renderApplicationsList();
  else if ("documents" === route) renderDocumentsPage();
  else if ("profile" === route) renderProfilePage();
  else if ("notifications" === route) renderNotifications();
  else if ("payments" === route) renderPaymentHistory();
  else if ("admin-applications" === route) renderAdminApplications();
  else if ("admin-documents" === route) renderAdminDocuments();
  else if ("admin-service-config" === route) renderAdminServiceConfig();
  else if ("admin-payments" === route) renderAdminPayments();
  else if ("admin-reports" === route) renderAdminReports();
  else if ("admin-api-logs" === route) renderAdminApiLogs();
  else if ("admin-associates" === route) renderAdminAssociates();
  else if ("admin-settings" === route) renderAdminSettings();
  else renderDashboard();
}
window.addEventListener("hashchange", router);

function toggleSidebar(open) {
  var sidebar = document.getElementById("nss-sidebar");
  var overlay = document.getElementById("nss-sidebar-overlay");
  var next = "boolean" === typeof open ? open : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", next);
  overlay.classList.toggle("open", next);
}
document.getElementById("nss-menu-toggle").addEventListener("click", function () {
  toggleSidebar();
});
document.getElementById("nss-sidebar-overlay").addEventListener("click", function () {
  toggleSidebar(false);
});
document.querySelectorAll("#nss-nav a[data-route]").forEach(function (a) {
  a.addEventListener("click", function () {
    toggleSidebar(false);
  });
});

document.getElementById("nss-new-request-btn").addEventListener("click", function (e) {
  e.preventDefault();
  if ("dashboard" === location.hash.replace("#", "")) {
    renderDashboard();
  } else {
    location.hash = "dashboard";
  }
});

// --------------------------------------------------------------- dashboard / catalog
function serviceCardHtml(svc, iconName) {
  var fee = svc.payment_required ? money(svc.amount) : "Free";
  return (
    '<div class="nss-svc-card" data-key="' +
    esc(svc.service_key) +
    '" data-redirect="' +
    esc(svc.redirect_url || "") +
    '">' +
    '<div class="nss-card-arrow">' +
    icon("chevron-right", "nss-icon-sm") +
    "</div>" +
    '<div class="nss-icon-badge">' +
    icon(iconName || "briefcase") +
    "</div>" +
    '<div class="nss-svc-name">' +
    esc(svc.service_label) +
    "</div>" +
    '<div class="nss-svc-fee' +
    (svc.payment_required ? "" : " free") +
    '">' +
    fee +
    "</div>" +
    "</div>"
  );
}
function bindServiceCardClicks(root) {
  root.querySelectorAll(".nss-svc-card").forEach(function (el) {
    el.addEventListener("click", function () {
      if (el.dataset.redirect) {
        var base = (STATE.catalog.courier_portal_url || "").replace(/\/$/, "");
        window.location.href = base + el.dataset.redirect;
      } else {
        location.hash = "service/" + encodeURIComponent(el.dataset.key);
      }
    });
  });
}

function renderDashboard() {
  setTitle("Dashboard");
  loadCatalog()
    .then(function (res) {
      var cards = res.categories
        .map(function (cat) {
          return (
            '<div class="nss-cat-card" data-key="' +
            esc(cat.key) +
            '">' +
            '<div class="nss-card-arrow">' +
            icon("chevron-right", "nss-icon-sm") +
            "</div>" +
            '<div class="nss-icon-badge">' +
            icon(cat.icon || "briefcase") +
            "</div>" +
            '<div class="nss-cat-name">' +
            esc(cat.label) +
            "</div>" +
            '<div class="nss-cat-count">' +
            cat.services.length +
            " services</div>" +
            "</div>"
          );
        })
        .join("");
      content.innerHTML =
        '<div class="nss-search-wrap">' +
        icon("search") +
        '<input type="text" class="nss-search-input" id="nss-service-search" placeholder="Search across all ' +
        res.categories.reduce(function (n, c) { return n + c.services.length; }, 0) +
        ' services — e.g. PAN, Passport, GST…" autocomplete="off"/>' +
        "</div>" +
        '<div id="nss-dashboard-body">' +
        '<div class="nss-panel-sub">Pick a category to see every service available under it. Courier opens the dedicated Courier dashboard.</div>' +
        '<div class="nss-cat-grid">' +
        cards +
        "</div>" +
        "</div>";
      content.querySelectorAll(".nss-cat-card").forEach(function (el) {
        el.addEventListener("click", function () {
          location.hash = "category/" + encodeURIComponent(el.dataset.key);
        });
      });

      var searchInput = document.getElementById("nss-service-search");
      var bodyEl = document.getElementById("nss-dashboard-body");
      var defaultBody = bodyEl.innerHTML;
      searchInput.addEventListener("input", function () {
        var q = searchInput.value.trim().toLowerCase();
        if (!q) {
          bodyEl.innerHTML = defaultBody;
          content.querySelectorAll(".nss-cat-card").forEach(function (el) {
            el.addEventListener("click", function () {
              location.hash = "category/" + encodeURIComponent(el.dataset.key);
            });
          });
          return;
        }
        var matches = [];
        res.categories.forEach(function (cat) {
          cat.services.forEach(function (svc) {
            if (svc.service_label.toLowerCase().indexOf(q) !== -1) {
              matches.push({ svc: svc, cat: cat });
            }
          });
        });
        bodyEl.innerHTML =
          '<div class="nss-search-results-label">' +
          matches.length +
          ' service' + (1 === matches.length ? "" : "s") + ' match "' + esc(searchInput.value.trim()) + '"</div>' +
          '<div class="nss-svc-grid">' +
          matches.map(function (m) { return serviceCardHtml(m.svc, m.cat.icon); }).join("") +
          "</div>";
        if (!matches.length) {
          bodyEl.innerHTML = emptyState("search", "No services match that search.", "Try a different keyword, or browse by category instead.");
        }
        bindServiceCardClicks(bodyEl);
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderCategory(key) {
  loadCatalog()
    .then(function () {
      var cat = findCategory(key);
      if (!cat) {
        content.innerHTML = errorBox(new Error("Category not found."));
        return;
      }
      setTitle(cat.label);
      var cards = cat.services.map(function (svc) { return serviceCardHtml(svc, cat.icon); }).join("");
      content.innerHTML =
        '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><span class="current">' +
        esc(cat.label) +
        "</span></div>" +
        '<div class="nss-svc-grid">' +
        cards +
        "</div>";
      bindServiceCardClicks(content);
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

/** Clicking a service creates a fresh draft application, then hands off to the shared form editor. */
function renderServiceStart(serviceKey) {
  api("/applications", "POST", { service_key: serviceKey })
    .then(function (res) {
      location.hash = "application/" + res.application.id;
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- application detail / form editor
function renderApplicationDetail(id) {
  Promise.all([api("/applications/" + id), loadCatalog()])
    .then(function (results) {
      var res = results[0];
      var app = res.application,
        config = res.config;
      setTitle(config.service_label);
      if ("draft" === app.status) {
        renderFormEditor(app, config, res.status_log);
      } else {
        renderApplicationReadonly(app, config, res.status_log);
      }
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function fieldInputHtml(field, value) {
  value = value == null ? "" : value;
  var req = field.required ? " required" : "";
  var reqStar = field.required ? ' <span class="req">*</span>' : "";
  var html =
    '<div class="nss-field"><label>' + esc(field.label) + reqStar + "</label>";
  if ("select" === field.type) {
    html +=
      '<select class="nss-select" name="' +
      esc(field.name) +
      '"' +
      req +
      '><option value="">Select…</option>';
    Object.keys(field.options || {}).forEach(function (val) {
      html +=
        '<option value="' +
        esc(val) +
        '"' +
        (val === value ? " selected" : "") +
        ">" +
        esc(field.options[val]) +
        "</option>";
    });
    html += "</select>";
  } else if ("textarea" === field.type) {
    html +=
      '<textarea class="nss-input" rows="3" name="' +
      esc(field.name) +
      '"' +
      req +
      ">" +
      esc(value) +
      "</textarea>";
  } else if ("checkbox" === field.type) {
    html =
      '<div class="nss-field"><label class="nss-checkbox"><input type="checkbox" name="' +
      esc(field.name) +
      '" value="1"' +
      (value ? " checked" : "") +
      "/> " +
      esc(field.label) +
      reqStar +
      "</label>";
  } else {
    var type =
      { number: "number", date: "date", tel: "tel", email: "email" }[
        field.type
      ] || "text";
    html +=
      '<input class="nss-input" type="' +
      type +
      '" name="' +
      esc(field.name) +
      '" value="' +
      esc(value) +
      '"' +
      req +
      "/>";
  }
  html += "</div>";
  return html;
}

function renderProfileGate(app) {
  STATE.returnToApplication = app.id;
  content.innerHTML =
    '<div class="nss-card nss-panel" style="max-width:520px;">' +
    emptyState(
      "user",
      "Complete your profile first",
      "Your name, mobile, address and pincode are required before any service can be filled in — every form auto-fills from here instead of asking again.",
    ) +
    '<a href="#profile" class="nss-btn nss-btn-primary nss-btn-block">Complete Profile Now</a>' +
    "</div>";
}

function renderFormEditor(app, config, statusLog) {
  Promise.all([loadProfile(), loadDocuments()])
    .then(function (results) {
      var profile = results[0];
      if (!profile.complete) {
        renderProfileGate(app);
        return;
      }
      var docsByType = {};
      results[1].forEach(function (d) {
        if ("rejected" !== d.status && !docsByType[d.doc_type])
          docsByType[d.doc_type] = d;
      });

      var autofillRows = [
        ["Name", profile.name],
        ["Father's Name", profile.father_name],
        ["Mother's Name", profile.mother_name],
        ["DOB", profile.dob],
        ["Gender", profile.gender],
        ["Mobile", profile.mobile],
        ["Email", profile.email],
        [
          "Address",
          [
            profile.address1,
            profile.address2,
            profile.district,
            profile.state,
            profile.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        ],
        ["Aadhaar", profile.aadhaar_no],
        ["Samagra ID", profile.samagra_id],
        ["PAN", profile.pan_no],
      ]
        .map(function (r) {
          return (
            "<div><span>" +
            esc(r[0]) +
            "</span>" +
            (esc(r[1]) || "—") +
            "</div>"
          );
        })
        .join("");

      var fieldsHtml = (config.fields || [])
        .map(function (f) {
          return fieldInputHtml(f, app.form_data[f.name]);
        })
        .join("");

      var docsHtml = (config.required_documents || [])
        .map(function (docType) {
          var have = docsByType[docType];
          return (
            '<div class="nss-doc-card' +
            (have ? " have" : "") +
            '" data-doctype="' +
            esc(docType) +
            '">' +
            '<div class="nss-doc-icon">' +
            icon(have ? "check-circle" : "upload", "nss-icon-lg") +
            "</div>" +
            '<div class="nss-doc-type">' +
            esc(DOC_TYPE_LABELS[docType] || docType) +
            "</div>" +
            (have
              ? '<div class="nss-badge nss-badge-on">' +
                icon("check", "nss-icon-sm") +
                ' On file</div><input type="hidden" class="nss-doc-existing-id" value="' +
                have.id +
                '"/>'
              : '<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"/>') +
            "</div>"
          );
        })
        .join("");

      content.innerHTML =
        '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><a href="#category/' +
        esc(config.category_key) +
        '">' +
        esc(config.category_label) +
        '</a><span class="sep">/</span><span class="current">' +
        esc(config.service_label) +
        "</span></div>" +
        '<div class="nss-autofill-box"><h3>Common Details (Auto-Filled From Your Profile)</h3><div class="nss-autofill-grid">' +
        autofillRows +
        "</div>" +
        (profile.complete
          ? ""
          : '<div class="nss-autofill-incomplete">Some profile details are missing — <a href="#profile">complete your profile</a> for smoother processing.</div>') +
        "</div>" +
        '<form id="nss-service-form" class="nss-card nss-panel">' +
        "<h2>" +
        esc(config.service_label) +
        " Details</h2>" +
        '<div class="nss-panel-sub">' +
        (config.payment_required
          ? "Service fee: " + money(config.amount)
          : "This service is free.") +
        "</div>" +
        '<div class="nss-form-grid">' +
        (fieldsHtml ||
          '<p class="nss-help">No additional details are needed for this service.</p>') +
        "</div>" +
        (docsHtml
          ? '<h3 style="margin:22px 0 12px;font-size:13px;">Required Documents</h3><div class="nss-doc-grid">' +
            docsHtml +
            "</div>"
          : "") +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
        '<button type="button" class="nss-btn" id="nss-save-draft">Save Draft</button>' +
        '<button type="submit" class="nss-btn nss-btn-primary" id="nss-submit-app">' +
        (config.payment_required
          ? "Continue to Payment"
          : "Submit Application") +
        "</button>" +
        "</div>" +
        "</form>";

      function collectDocumentIds() {
        var ids = [];
        var pending = [];
        content.querySelectorAll(".nss-doc-card").forEach(function (card) {
          var existing = card.querySelector(".nss-doc-existing-id");
          if (existing) {
            ids.push(parseInt(existing.value, 10));
            return;
          }
          var fileInput = card.querySelector("input[type=file]");
          if (fileInput && fileInput.files[0])
            pending.push({
              doctype: card.dataset.doctype,
              file: fileInput.files[0],
            });
        });
        if (!pending.length) return Promise.resolve(ids);
        return Promise.all(
          pending.map(function (p) {
            var fd = new FormData();
            fd.append("doc_type", p.doctype);
            fd.append("file", p.file);
            return api("/documents", "POST", fd).then(function (res) {
              ids.push(res.document.id);
              STATE.documents = null;
            });
          }),
        ).then(function () {
          return ids;
        });
      }

      function saveDraft() {
        var formData = formToObject(
          document.getElementById("nss-service-form"),
        );
        return collectDocumentIds().then(function (docIds) {
          return api("/applications/" + app.id, "PATCH", {
            form_data: formData,
            document_ids: docIds,
          });
        });
      }

      document
        .getElementById("nss-save-draft")
        .addEventListener("click", function (e) {
          e.preventDefault();
          var btn = e.target;
          btn.disabled = true;
          saveDraft()
            .then(function () {
              toast("Draft saved.", "ok");
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            })
            .finally(function () {
              btn.disabled = false;
            });
        });

      document
        .getElementById("nss-service-form")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var btn = document.getElementById("nss-submit-app");
          btn.disabled = true;
          saveDraft()
            .then(function () {
              return api("/applications/" + app.id + "/submit", "POST");
            })
            .then(function (res) {
              toast(
                res.application.application_no
                  ? "Submitted — " + res.application.application_no
                  : "Submitted.",
                "ok",
              );
              location.hash = "application/" + app.id;
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            })
            .finally(function () {
              btn.disabled = false;
            });
        });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderApplicationReadonly(app, config, statusLog) {
  var fieldRows = (config.fields || [])
    .map(function (f) {
      return (
        "<div><span>" +
        esc(f.label) +
        "</span>" +
        (esc(app.form_data[f.name]) || "—") +
        "</div>"
      );
    })
    .join("");

  var timeline =
    (statusLog || [])
      .map(function (row) {
        return (
          '<li><div><div class="t-status">' +
          esc(STATUS_LABELS[row.to_status] || row.to_status) +
          "</div>" +
          '<div class="t-meta">' +
          fmtDate(row.created_at) +
          (row.note ? " — " + esc(row.note) : "") +
          "</div></div></li>"
        );
      })
      .join("") || '<li><div class="t-meta">No status history yet.</div></li>';

  var payBtn =
    "submitted" === app.status
      ? '<button class="nss-btn nss-btn-primary" id="nss-pay-now">' +
        icon("credit-card", "nss-icon-sm") +
        " Pay " +
        money(config.amount) +
        "</button>"
      : "";

  content.innerHTML =
    '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><a href="#applications">My Applications</a><span class="sep">/</span><span class="current">' +
    esc(app.application_no || "#" + app.id) +
    "</span></div>" +
    '<div class="nss-two-col">' +
    '<div class="nss-card nss-panel">' +
    "<h2>" +
    esc(config.service_label) +
    "</h2>" +
    '<p class="nss-panel-sub">' +
    esc(app.application_no || "Application #" + app.id) +
    " · " +
    statusPill(app.status) +
    "</p>" +
    '<div class="nss-autofill-grid">' +
    (fieldRows ||
      '<p class="nss-help">No additional details were required.</p>') +
    "</div>" +
    (payBtn ? '<div style="margin-top:20px;">' + payBtn + "</div>" : "") +
    "</div>" +
    '<div class="nss-card nss-panel"><h2>Status Timeline</h2><ul class="nss-timeline">' +
    timeline +
    "</ul></div>" +
    "</div>";

  if ("submitted" === app.status) {
    document
      .getElementById("nss-pay-now")
      .addEventListener("click", function () {
        payNow(app.id, config.amount);
      });
  }
}

function payNow(applicationId, amount) {
  api("/applications/" + applicationId + "/payment-order", "POST")
    .then(function (res) {
      if (!window.Razorpay) {
        toast("Payment gateway script did not load. Please retry.", "err");
        return;
      }
      var profile = STATE.profile || {};
      var rzp = new Razorpay({
        key: res.key_id || "",
        amount: res.order.amount,
        currency: res.order.currency,
        order_id: res.order.id,
        name: "Naya Setu Services",
        description: "Service application payment",
        prefill: {
          name: profile.name || "",
          email: profile.email || "",
          contact: profile.mobile || "",
        },
        theme: { color: "#bb0b0b" },
        handler: function (response) {
          api("/applications/" + applicationId + "/payment-verify", "POST", {
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
            .then(function () {
              toast("Payment successful.", "ok");
              location.hash = "application/" + applicationId;
              router();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        },
      });
      rzp.open();
    })
    .catch(function (e) {
      toast(e.message, "err");
    });
}

// --------------------------------------------------------------- My Applications
function renderApplicationsList() {
  setTitle("My Applications");
  Promise.all([api("/applications"), loadCatalog()])
    .then(function (results) {
      var items = results[0].items;
      if (!items.length) {
        content.innerHTML =
          '<div class="nss-card">' +
          emptyState("file-text", "No applications yet", "Pick a service from the Dashboard to begin.") +
          "</div>";
        return;
      }
      var rows = items
        .map(function (a) {
          var found = findService(a.service_key);
          var label = found ? found.service.service_label : a.service_key;
          return (
            "<tr><td>" +
            esc(a.application_no || "Draft #" + a.id) +
            "</td><td>" +
            esc(label) +
            "</td><td>" +
            statusPill(a.status) +
            "</td><td>" +
            fmtDate(a.created_at) +
            "</td>" +
            '<td><a class="nss-btn nss-btn-sm" href="#application/' +
            a.id +
            '">' +
            ("draft" === a.status ? "Continue" : "View") +
            "</a></td></tr>"
          );
        })
        .join("");
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Application</th><th>Service</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- My Documents
function renderDocumentsPage() {
  setTitle("My Documents");
  loadDocuments(true)
    .then(function (items) {
      var options = Object.keys(DOC_TYPE_LABELS)
        .map(function (k) {
          return (
            '<option value="' + k + '">' + DOC_TYPE_LABELS[k] + "</option>"
          );
        })
        .join("");
      var rows =
        items
          .map(function (d) {
            return (
              "<tr><td>" +
              esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type) +
              "</td><td>" +
              esc(d.file_name) +
              "</td>" +
              '<td><span class="nss-badge' +
              ("verified" === d.status ? " nss-badge-on" : "") +
              '">' +
              esc(d.status) +
              "</span></td>" +
              "<td>" +
              fmtDate(d.created_at) +
              "</td>" +
              '<td><a class="nss-btn nss-btn-sm" href="' +
              restFileUrl("/documents/" + d.id + "/file") +
              '" target="_blank" rel="noopener">View</a> ' +
              '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
              d.id +
              '">Delete</button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No documents uploaded yet.</td></tr>';

      content.innerHTML =
        '<div class="nss-card nss-panel">' +
        "<h2>Upload A Document</h2>" +
        '<p class="nss-panel-sub">Upload once — every service reuses whatever is already here.</p>' +
        '<form id="nss-doc-upload" class="nss-form-grid">' +
        '<div class="nss-field"><label>Document Type</label><select class="nss-select" name="doc_type" required>' +
        options +
        "</select></div>" +
        '<div class="nss-field"><label>File (JPG/PNG/WEBP/PDF, max 5MB)</label><input class="nss-input" type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required/></div>' +
        '<div class="nss-field" style="align-self:end;"><button class="nss-btn nss-btn-primary" type="submit">' +
        icon("upload", "nss-icon-sm") +
        " Upload</button></div>" +
        "</form>" +
        "</div>" +
        '<div class="nss-tablewrap" style="margin-top:20px;"><table class="nss-table"><thead><tr><th>Type</th><th>File</th><th>Status</th><th>Uploaded</th><th></th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      document
        .getElementById("nss-doc-upload")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var form = e.target;
          var fd = new FormData(form);
          api("/documents", "POST", fd)
            .then(function () {
              toast("Document uploaded.", "ok");
              renderDocumentsPage();
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            });
        });
      content.querySelectorAll("[data-id]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm(NSS.i18n.confirmDelete)) return;
          api("/documents/" + btn.dataset.id, "DELETE")
            .then(function () {
              renderDocumentsPage();
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- My Profile
function renderProfilePage() {
  setTitle("My Profile");
  loadProfile(true)
    .then(function (p) {
      content.innerHTML =
        '<form id="nss-profile-form" class="nss-card nss-panel">' +
        '<h2>My Profile</h2><p class="nss-panel-sub">This is your Master Profile — every service auto-fills from here.</p>' +
        '<div class="nss-form-grid">' +
        field("Name", "name", p.name) +
        field("Mobile", "mobile", p.mobile) +
        field("Email", "email", p.email, "email") +
        field("Father's Name", "father_name", p.father_name) +
        field("Mother's Name", "mother_name", p.mother_name) +
        field("Date Of Birth", "dob", p.dob, "date") +
        field("Gender", "gender", p.gender) +
        field("Address Line 1", "address1", p.address1) +
        field("Address Line 2", "address2", p.address2) +
        field("District", "district", p.district) +
        field("State", "state", p.state) +
        field("Pincode", "pincode", p.pincode) +
        field("Aadhaar Number", "aadhaar_no", p.aadhaar_no) +
        field("Samagra ID", "samagra_id", p.samagra_id) +
        field("PAN Number", "pan_no", p.pan_no) +
        "</div>" +
        '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:20px;">Save Profile</button>' +
        "</form>";
      function field(label, name, value, type) {
        return (
          '<div class="nss-field"><label>' +
          label +
          '</label><input class="nss-input" type="' +
          (type || "text") +
          '" name="' +
          name +
          '" value="' +
          esc(value || "") +
          '"/></div>'
        );
      }
      document
        .getElementById("nss-profile-form")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          api("/profile", "POST", formToObject(e.target))
            .then(function () {
              toast("Profile saved.", "ok");
              STATE.profile = null;
              if (STATE.returnToApplication) {
                var returnId = STATE.returnToApplication;
                STATE.returnToApplication = null;
                if ("application/" + returnId === location.hash.replace("#", "")) {
                  renderApplicationDetail(returnId);
                } else {
                  location.hash = "application/" + returnId;
                }
              }
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            });
        });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Notifications / Payment History
function renderNotifications() {
  setTitle("Notifications");
  api("/notifications")
    .then(function (res) {
      var rows =
        res.items
          .map(function (n) {
            return (
              "<tr><td>" +
              esc(n.message) +
              "</td><td>" +
              fmtDate(n.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="2" class="nss-empty">No notifications yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Message</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderPaymentHistory() {
  setTitle("Payment History");
  api("/payments")
    .then(function (res) {
      var rows =
        res.items
          .map(function (p) {
            return (
              "<tr><td>" +
              esc(p.order_id) +
              "</td><td>" +
              money(p.amount) +
              '</td><td><span class="nss-badge' +
              ("paid" === p.status ? " nss-badge-on" : "") +
              '">' +
              esc(p.status) +
              "</span></td><td>" +
              fmtDate(p.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="4" class="nss-empty">No payments yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Applications
function renderAdminApplications() {
  setTitle("All Applications");
  Promise.all([api("/admin/applications"), loadCatalog()])
    .then(function (results) {
      var items = results[0].items;
      var statusOptions = Object.keys(STATUS_LABELS)
        .map(function (k) {
          return '<option value="' + k + '">' + STATUS_LABELS[k] + "</option>";
        })
        .join("");
      var rows =
        items
          .map(function (a) {
            var found = findService(a.service_key);
            var label = found ? found.service.service_label : a.service_key;
            return (
              "<tr><td>" +
              esc(a.application_no || "Draft #" + a.id) +
              "</td><td>" +
              esc(label) +
              "</td><td>" +
              statusPill(a.status) +
              "</td><td>" +
              fmtDate(a.created_at) +
              "</td>" +
              '<td><select class="nss-select nss-status-select" data-id="' +
              a.id +
              '" style="width:auto;display:inline-block;">' +
              statusOptions.replace(
                'value="' + a.status + '"',
                'value="' + a.status + '" selected',
              ) +
              "</select> " +
              '<button class="nss-btn nss-btn-sm nss-save-status" data-id="' +
              a.id +
              '">Save</button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No applications yet.</td></tr>';

      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Application</th><th>Service</th><th>Status</th><th>Created</th><th>Update Status</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      content.querySelectorAll(".nss-save-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var select = content.querySelector(
            '.nss-status-select[data-id="' + btn.dataset.id + '"]',
          );
          var note = prompt("Optional note for this status change:", "") || "";
          api("/admin/applications/" + btn.dataset.id + "/status", "POST", {
            status: select.value,
            note: note,
          })
            .then(function () {
              toast("Status updated.", "ok");
              renderAdminApplications();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Document Verification
function renderAdminDocuments() {
  setTitle("Document Verification");
  api("/admin/documents")
    .then(function (res) {
      var rows =
        res.items
          .map(function (d) {
            return (
              "<tr><td>" +
              esc(d.display_name || "User #" + d.user_id) +
              "</td><td>" +
              esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type) +
              "</td>" +
              '<td><a href="' +
              restFileUrl("/documents/" + d.id + "/file") +
              '" target="_blank" rel="noopener">View File</a></td>' +
              "<td>" +
              fmtDate(d.created_at) +
              "</td>" +
              '<td><button class="nss-btn nss-btn-sm" data-id="' +
              d.id +
              '" data-action="verified">Verify</button> ' +
              '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
              d.id +
              '" data-action="rejected">Reject</button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No documents pending verification.</td></tr>';

      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>User</th><th>Type</th><th>File</th><th>Uploaded</th><th>Action</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      content.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api("/admin/documents/" + btn.dataset.id + "/verify", "POST", {
            status: btn.dataset.action,
          })
            .then(function () {
              toast("Document " + btn.dataset.action + ".", "ok");
              renderAdminDocuments();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Service Config
function renderAdminServiceConfig() {
  setTitle("Service Config");
  api("/admin/service-config")
    .then(function (res) {
      var rows = res.items
        .map(function (s) {
          return (
            '<tr data-key="' +
            esc(s.service_key) +
            '">' +
            "<td>" +
            esc(s.category_label) +
            "</td><td>" +
            esc(s.service_label) +
            "</td>" +
            '<td><input type="checkbox" class="f-active" ' +
            (Number(s.active) ? "checked" : "") +
            "/></td>" +
            '<td><input type="checkbox" class="f-payment" ' +
            (Number(s.payment_required) ? "checked" : "") +
            "/></td>" +
            '<td><input class="nss-input f-amount" type="number" step="0.01" value="' +
            esc(s.amount) +
            '" style="width:90px;"/></td>' +
            '<td><select class="nss-select f-workflow" style="width:auto;"><option value="manual"' +
            ("manual" === s.workflow_mode ? " selected" : "") +
            '>Manual</option><option value="api"' +
            ("api" === s.workflow_mode ? " selected" : "") +
            ">API</option></select></td>" +
            '<td><input class="nss-input f-provider" value="' +
            esc(s.api_provider_key) +
            '" style="width:110px;"/></td>' +
            '<td><input class="nss-input f-docs" value="' +
            esc((s.required_documents || []).join(",")) +
            '" style="width:150px;" title="Comma-separated doc types"/></td>' +
            '<td><textarea class="nss-input f-fields" rows="2" style="width:220px;font-size:11px;" title="Field schema JSON">' +
            esc(JSON.stringify(s.fields || [])) +
            "</textarea></td>" +
            '<td><button class="nss-btn nss-btn-sm nss-save-config">Save</button></td>' +
            "</tr>"
          );
        })
        .join("");

      content.innerHTML =
        '<p class="nss-panel-sub">Every field here is stored in the database — adding a brand-new service or changing an existing one never requires a code change.</p>' +
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Category</th><th>Service</th><th>Active</th><th>Paid</th><th>Amount</th><th>Workflow</th><th>Provider</th><th>Required Docs</th><th>Fields JSON</th><th></th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      content.querySelectorAll(".nss-save-config").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var tr = btn.closest("tr");
          var fieldsRaw = tr.querySelector(".f-fields").value.trim();
          var fields;
          try {
            fields = fieldsRaw ? JSON.parse(fieldsRaw) : [];
          } catch (parseErr) {
            toast("Fields JSON is invalid — fix the syntax and try again.", "err");
            return;
          }
          var payload = {
            active: tr.querySelector(".f-active").checked ? 1 : 0,
            payment_required: tr.querySelector(".f-payment").checked ? 1 : 0,
            amount: parseFloat(tr.querySelector(".f-amount").value) || 0,
            workflow_mode: tr.querySelector(".f-workflow").value,
            api_provider_key: tr.querySelector(".f-provider").value.trim(),
            required_documents: tr
              .querySelector(".f-docs")
              .value.split(",")
              .map(function (s) {
                return s.trim();
              })
              .filter(Boolean),
            fields: fields,
          };
          api("/admin/service-config/" + tr.dataset.key, "PATCH", payload)
            .then(function () {
              toast("Saved.", "ok");
              STATE.catalog = null;
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Payments / Reports / API Logs / Associates
function renderAdminPayments() {
  setTitle("Payments");
  api("/admin/payments")
    .then(function (res) {
      var rows =
        res.items
          .map(function (p) {
            return (
              "<tr><td>" +
              esc(p.display_name || "User #" + p.user_id) +
              "</td><td>" +
              esc(p.order_id) +
              "</td><td>" +
              money(p.amount) +
              '</td><td><span class="nss-badge' +
              ("paid" === p.status ? " nss-badge-on" : "") +
              '">' +
              esc(p.status) +
              "</span></td><td>" +
              fmtDate(p.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No payments yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>User</th><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminReports() {
  setTitle("Reports");
  api("/admin/reports")
    .then(function (res) {
      var statCards = res.by_status
        .map(function (r) {
          return (
            '<div class="nss-stat"><div class="nss-stat-label">' +
            esc(STATUS_LABELS[r.status] || r.status) +
            '</div><div class="nss-stat-value">' +
            r.cnt +
            "</div></div>"
          );
        })
        .join("");
      var svcRows =
        res.by_service
          .map(function (r) {
            var found = findService(r.service_key);
            return (
              "<tr><td>" +
              esc(found ? found.service.service_label : r.service_key) +
              "</td><td>" +
              r.cnt +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="2" class="nss-empty">No applications yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-stats">' +
        statCards +
        '<div class="nss-stat"><div class="nss-stat-label">Total Revenue</div><div class="nss-stat-value">' +
        money(res.total_revenue) +
        "</div></div></div>" +
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Service</th><th>Applications</th></tr></thead><tbody>' +
        svcRows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminApiLogs() {
  setTitle("API Logs");
  api("/admin/api-logs")
    .then(function (res) {
      var rows =
        res.items
          .map(function (l) {
            return (
              "<tr><td>" +
              esc(l.context) +
              '</td><td><span class="nss-badge' +
              ("error" === l.level ? "" : " nss-badge-on") +
              '">' +
              esc(l.level) +
              "</span></td><td>" +
              esc(l.message) +
              "</td><td>" +
              fmtDate(l.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="4" class="nss-empty">No log entries yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Context</th><th>Level</th><th>Message</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminAssociates() {
  setTitle("Associates");
  api("/admin/associates")
    .then(function (res) {
      var rows =
        res.items
          .map(function (a) {
            return (
              "<tr><td>" +
              esc(a.name) +
              "</td><td>" +
              esc(a.email) +
              "</td><td>" +
              esc(a.mobile) +
              "</td><td>" +
              esc(a.associate_code) +
              "</td>" +
              '<td><button class="nss-btn nss-btn-sm" data-id="' +
              a.id +
              '" data-action="approve">Approve</button> ' +
              '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
              a.id +
              '" data-action="reject">Reject</button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No pending Associate applications.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Code</th><th>Action</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      content.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api(
            "/admin/associates/" + btn.dataset.id + "/" + btn.dataset.action,
            "POST",
          )
            .then(function () {
              toast("Done.", "ok");
              renderAdminAssociates();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Settings
function renderAdminSettings() {
  setTitle("Settings");
  api("/settings")
    .then(function (res) {
      var s = res.settings;
      content.innerHTML =
        '<div class="nss-settings-tabs">' +
        '<button class="nss-tab-btn active" data-tab="general">General</button>' +
        '<button class="nss-tab-btn" data-tab="payments">Payments</button>' +
        '<button class="nss-tab-btn" data-tab="notify">Notify</button>' +
        '<button class="nss-tab-btn" data-tab="providers">API Providers</button>' +
        "</div>" +
        '<div id="nss-settings-panel"></div>';

      function paint(tab) {
        var panel = document.getElementById("nss-settings-panel");
        if ("general" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>General</h2>' +
            '<div class="nss-form-grid"><div class="nss-field"><label>Courier Portal URL</label><input class="nss-input" name="courier_portal_url" value="' +
            esc(s.courier_portal_url) +
            '"/><div class="nss-field-hint">Where Courier services in this dashboard redirect to.</div></div></div>' +
            '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            api("/settings", "POST", {
              courier_portal_url: e.target.courier_portal_url.value,
            })
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("payments" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>Payments (Razorpay)</h2>' +
            '<div class="nss-form-grid">' +
            '<div class="nss-field"><label class="nss-checkbox"><input type="checkbox" name="razorpay_enabled" ' +
            (Number(s.payments.razorpay_enabled) ? "checked" : "") +
            "/> Enabled</label></div>" +
            '<div class="nss-field"><label>Key ID</label><input class="nss-input" name="razorpay_key_id" value="' +
            esc(s.payments.razorpay_key_id) +
            '"/></div>' +
            '<div class="nss-field"><label>Key Secret</label><input class="nss-input" type="password" name="razorpay_key_secret" placeholder="Leave blank to keep existing"/></div>' +
            '</div><button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            var f = e.target;
            var payload = {
              payments: {
                razorpay_enabled: f.razorpay_enabled.checked ? 1 : 0,
                razorpay_key_id: f.razorpay_key_id.value,
              },
            };
            if (f.razorpay_key_secret.value)
              payload.payments.razorpay_key_secret =
                f.razorpay_key_secret.value;
            api("/settings", "POST", payload)
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("notify" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>SMS / WhatsApp</h2>' +
            '<div class="nss-form-grid">' +
            '<div class="nss-field"><label>SMS Provider</label><input class="nss-input" name="sms_provider" value="' +
            esc(s.notify.sms_provider) +
            '"/></div>' +
            '<div class="nss-field"><label>SMS API Key</label><input class="nss-input" name="sms_api_key" value="' +
            esc(s.notify.sms_api_key) +
            '"/></div>' +
            '<div class="nss-field"><label>WhatsApp Provider</label><input class="nss-input" name="whatsapp_provider" value="' +
            esc(s.notify.whatsapp_provider) +
            '"/></div>' +
            '<div class="nss-field"><label>WhatsApp API Key</label><input class="nss-input" name="whatsapp_api_key" value="' +
            esc(s.notify.whatsapp_api_key) +
            '"/></div>' +
            '</div><p class="nss-help">Without a provider configured, status-change notifications are logged only (no fake send).</p>' +
            '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            api("/settings", "POST", { notify: formToObject(e.target) })
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("providers" === tab) {
          var rows = Object.keys(s.providers || {})
            .map(function (key) {
              var p = s.providers[key];
              var configured =
                res.providers_status &&
                res.providers_status[key] &&
                res.providers_status[key].configured;
              return (
                '<tr data-key="' +
                key +
                '"><td>' +
                esc(p.label) +
                "</td>" +
                '<td><span class="nss-badge' +
                (configured ? " nss-badge-on" : "") +
                '">' +
                (configured ? "Configured" : "Manual Workflow") +
                "</span></td>" +
                '<td><input type="checkbox" class="p-enabled" ' +
                (Number(p.enabled) ? "checked" : "") +
                "/></td>" +
                '<td><input class="nss-input p-key" value="' +
                esc(p.api_key) +
                '" style="width:160px;"/></td>' +
                '<td><input class="nss-input p-secret" type="password" placeholder="Leave blank to keep existing" style="width:160px;"/></td>' +
                '<td><button class="nss-btn nss-btn-sm nss-save-provider">Save</button></td></tr>'
              );
            })
            .join("");
          panel.innerHTML =
            '<div class="nss-card nss-panel"><h2>API Providers</h2><p class="nss-panel-sub">Until a provider is configured here, every service using it runs in Manual Workflow mode — an operator processes it by hand.</p>' +
            '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Provider</th><th>Status</th><th>Enabled</th><th>API Key</th><th>API Secret</th><th></th></tr></thead><tbody>' +
            rows +
            "</tbody></table></div></div>";
          panel.querySelectorAll(".nss-save-provider").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var tr = btn.closest("tr");
              var key = tr.dataset.key;
              var payload = { providers: {} };
              payload.providers[key] = {
                enabled: tr.querySelector(".p-enabled").checked ? 1 : 0,
                api_key: tr.querySelector(".p-key").value,
              };
              var secret = tr.querySelector(".p-secret").value;
              if (secret) payload.providers[key].api_secret = secret;
              api("/settings", "POST", payload)
                .then(function () {
                  toast("Saved.", "ok");
                })
                .catch(function (e2) {
                  toast(e2.message, "err");
                });
            });
          });
        }
      }
      content.querySelectorAll(".nss-tab-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          content.querySelectorAll(".nss-tab-btn").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
          paint(btn.dataset.tab);
        });
      });
      paint("general");
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

router();
