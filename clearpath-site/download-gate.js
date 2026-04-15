// download-gate.js — Capture name/email/district before redirecting to a product download.
// Any <a data-gate="beacon|toolkit|apex" href="..."> gets intercepted.
(function(){
  var OPS = 'https://xbpuqaqpcbixxodblaes.supabase.co';
  var OPSKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA';
  var FORMSPREE = 'https://formspree.io/f/xpqjngpp';

  var PRODUCTS = {
    beacon:  { label: 'Beacon — Elementary Counselor Platform', color: '#2A9D8F' },
    toolkit: { label: 'Investigator Toolkit — Campus Case Management', color: '#6366f1' },
    apex:    { label: 'Apex — AI Instructional Leadership', color: '#f97316' },
  };

  function inject(){
    if (document.getElementById('dl-gate-modal')) return;
    var css = document.createElement('style');
    css.textContent = ''
      + '#dl-gate-modal{position:fixed;inset:0;z-index:10000;background:rgba(13,7,28,0.96);display:none;align-items:center;justify-content:center;padding:20px;overflow-y:auto}'
      + '#dl-gate-modal.open{display:flex}'
      + '#dl-gate-card{background:linear-gradient(145deg,#1a0a2e,#2d0f52);border-radius:16px;padding:36px 32px;max-width:460px;width:100%;box-shadow:0 0 60px rgba(107,47,160,0.35);border:1px solid rgba(255,255,255,0.08);text-align:left}'
      + '#dl-gate-card h3{font-family:"Cinzel",serif;font-size:1.35rem;font-weight:800;margin:0 0 8px;line-height:1.3}'
      + '#dl-gate-card p.sub{font-size:.86rem;color:rgba(240,230,211,0.6);margin:0 0 22px;line-height:1.6}'
      + '#dl-gate-card label{display:block;font-size:.68rem;font-weight:700;color:rgba(240,230,211,0.55);letter-spacing:0.1em;text-transform:uppercase;margin:0 0 6px}'
      + '#dl-gate-card input,#dl-gate-card select{width:100%;padding:11px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#f0e6d3;font-size:.9rem;outline:none;box-sizing:border-box;font-family:inherit}'
      + '#dl-gate-card input:focus,#dl-gate-card select:focus{border-color:rgba(244,168,74,0.55)}'
      + '#dl-gate-card .row{margin-bottom:14px}'
      + '#dl-gate-card button.submit{width:100%;padding:13px;border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;cursor:pointer;margin-top:10px;letter-spacing:.02em}'
      + '#dl-gate-card .close{position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(240,230,211,0.5);font-size:1.4rem;cursor:pointer;line-height:1}'
      + '#dl-gate-card .note{font-size:.7rem;color:rgba(240,230,211,0.35);text-align:center;margin:12px 0 0}';
    document.head.appendChild(css);

    var modal = document.createElement('div');
    modal.id = 'dl-gate-modal';
    modal.innerHTML = ''
      + '<div id="dl-gate-card" style="position:relative">'
      + '  <button class="close" type="button" aria-label="Close">&times;</button>'
      + '  <div style="font-size:.66rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin:0 0 8px" id="dl-gate-tag">Free 14-Day Trial</div>'
      + '  <h3 id="dl-gate-title">Start your free trial</h3>'
      + '  <p class="sub">Tell us who you are so we can send activation, support docs, and the occasional product update. No spam.</p>'
      + '  <form id="dl-gate-form">'
      + '    <div class="row"><label>Your Name *</label><input name="name" required placeholder="Ms. Sarah Johnson"></div>'
      + '    <div class="row"><label>Work Email *</label><input type="email" name="email" required placeholder="you@school.edu"></div>'
      + '    <div class="row"><label>Campus or District *</label><input name="district" required placeholder="Lincoln Elementary / Lone Star ISD"></div>'
      + '    <div class="row"><label>Your Role</label><select name="role">'
      + '      <option value="" selected>Select...</option>'
      + '      <option>Counselor</option><option>Principal / AP</option><option>Campus Administrator</option>'
      + '      <option>SPED Coordinator</option><option>District Administrator</option><option>Teacher</option>'
      + '      <option>Superintendent</option><option>Other</option>'
      + '    </select></div>'
      + '    <button class="submit" type="submit" id="dl-gate-submit">Continue to Free Trial &rarr;</button>'
      + '    <p class="note">By continuing you agree to receive setup + support emails. Unsubscribe anytime.</p>'
      + '  </form>'
      + '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e){ if (e.target === modal) close(); });
    modal.querySelector('.close').addEventListener('click', close);
    modal.querySelector('#dl-gate-form').addEventListener('submit', onSubmit);
  }

  var pendingHref = null;
  var pendingProduct = null;

  function open(product, href){
    inject();
    pendingHref = href;
    pendingProduct = product;
    var p = PRODUCTS[product] || { label: product, color: '#f4a84a' };
    var modal = document.getElementById('dl-gate-modal');
    modal.querySelector('#dl-gate-title').textContent = 'Start your ' + p.label.split('—')[0].trim() + ' trial';
    modal.querySelector('#dl-gate-tag').style.color = p.color;
    modal.querySelector('#dl-gate-submit').style.background = 'linear-gradient(135deg,' + p.color + ',' + p.color + 'cc)';
    modal.classList.add('open');
    setTimeout(function(){ modal.querySelector('input[name="name"]').focus(); }, 50);
  }
  function close(){
    var modal = document.getElementById('dl-gate-modal');
    if (modal) modal.classList.remove('open');
    pendingHref = null;
    pendingProduct = null;
  }

  function onSubmit(e){
    e.preventDefault();
    var btn = document.getElementById('dl-gate-submit');
    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = 'Sending\u2026';

    var form = e.target;
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      district: form.district.value.trim(),
      role: form.role.value || null,
      product: pendingProduct,
      product_label: (PRODUCTS[pendingProduct] || {}).label || pendingProduct,
    };

    var formspreeBody = new FormData();
    Object.keys(data).forEach(function(k){ formspreeBody.append(k, data[k] == null ? '' : data[k]); });
    formspreeBody.append('source', pendingProduct + '_download');
    formspreeBody.append('_subject', 'Download Request — ' + data.product_label);

    Promise.all([
      fetch(FORMSPREE, { method: 'POST', body: formspreeBody, headers: { 'Accept': 'application/json' } }).catch(function(){}),
      fetch(OPS + '/rest/v1/demo_leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': OPSKEY, 'Authorization': 'Bearer ' + OPSKEY },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          district_name: data.district,
          role: data.role,
          referrer: pendingProduct + '_download',
          status: 'new'
        })
      }).catch(function(){})
    ]).then(function(){
      var dest = pendingHref;
      close();
      if (dest) {
        // Open in new tab so the gate page stays visible + analytics fire
        window.open(dest, '_blank', 'noopener');
      }
    }).catch(function(){
      btn.disabled = false;
      btn.textContent = originalText;
      alert('Something went wrong. Please email support@clearpathedgroup.com.');
    });
  }

  function attach(){
    var links = document.querySelectorAll('a[data-gate]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset.gateAttached === '1') continue;
      a.dataset.gateAttached = '1';
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        var product = this.dataset.gate;
        var href = this.getAttribute('href');
        open(product, href);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
  // Expose for pages that swap in links later
  window.__downloadGate = { attach: attach, open: open };
})();
