// Neue-Bestellungen-Wächter: Sound + Auto-Bon-Druck (TM-T88V, 80mm)
// Funktioniert mit Render-Server + lokalem Drucker-PC: diese Seite läuft auf dem
// PC, an dem der Bondrucker hängt. Pollt alle 12s nach neuen Bestellungen.
(function () {
  var POLL_MS = 12000;
  var LS_LAST = 'nexo_last_order_id';
  var LS_SOUND = 'nexo_sound_on';
  var audioCtx = null;
  var ringing = false;
  var printQueue = [];
  var printing = false;

  function lastId() { return parseInt(localStorage.getItem(LS_LAST) || '0', 10) || 0; }
  function setLastId(v) { localStorage.setItem(LS_LAST, String(v)); }
  function soundOn() { return localStorage.getItem(LS_SOUND) !== 'off'; }

  // Laute Klingel per WebAudio (keine MP3-Datei nötig), 3x hintereinander
  function beep(freq, t0, dur) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur);
  }
  function ring() {
    if (!soundOn()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      for (var r = 0; r < 4; r++) {
        beep(880, t + r * 0.7, 0.3);
        beep(660, t + r * 0.7 + 0.32, 0.3);
      }
    } catch (e) { console.warn('Audio blockiert:', e); }
  }
  function ringLoop(order) {
    // Klingelt alle 5s weiter, bis der Nutzer bestätigt (Browser blockt sonst Dauer-Ton)
    ring();
    showBanner(order);
    ringing = true;
  }

  function showBanner(order) {
    if (document.getElementById('nexo-neworder-banner')) return;
    var d = document.createElement('div');
    d.id = 'nexo-neworder-banner';
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;padding:14px 20px;font-size:17px;font-weight:bold;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.4);cursor:pointer;font-family:sans-serif';
    d.innerHTML = '🔔 NEUE BESTELLUNG ' + order.order_number + ' – ' + Number(order.total).toFixed(2) + ' € — klicken zum Stoppen + Ansehen';
    d.onclick = function () { stopRing(); location.href = '/admin/bestellungen/' + order.id; };
    document.body.appendChild(d);
  }
  function stopRing() {
    ringing = false;
    var b = document.getElementById('nexo-neworder-banner');
    if (b) b.remove();
  }

  // Bon im versteckten Iframe drucken (Drucker = Standarddrucker des PCs = TM-T88V)
  function printBon(order) {
    printQueue.push(order);
    pumpQueue();
  }
  function pumpQueue() {
    if (printing || !printQueue.length) return;
    printing = true;
    var order = printQueue.shift();
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    f.src = '/admin/bestellungen/' + order.id + '/bon';
    f.onload = function () {
      setTimeout(function () {
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.warn('print err', e); }
        // Als gedruckt markieren + aus Queue nehmen
        fetch('/admin/api/bestellungen/' + order.id + '/gedruckt', { method: 'POST', credentials: 'same-origin' }).catch(function(){});
        setTimeout(function () { f.remove(); printing = false; pumpQueue(); }, 2000);
      }, 400);
    };
    f.onerror = function () { f.remove(); printing = false; pumpQueue(); };
    document.body.appendChild(f);
  }

  async function poll() {
    try {
      var r = await fetch('/admin/api/neue-bestellungen?last_id=' + lastId(), { credentials: 'same-origin' });
      if (!r.ok) return;
      var j = await r.json();
      if (!j.success) return;
      if (j.orders && j.orders.length) {
        j.orders.forEach(function (o) {
          ringLoop(o);
          printBon(o);
        });
        var max = Math.max.apply(null, j.orders.map(function (o) { return o.id; }));
        setLastId(Math.max(lastId(), max, j.max_id || 0));
      } else if (j.max_id && j.max_id > lastId()) {
        // Beim ersten Laden: Zeiger initialisieren ohne alte Bestellungen zu drucken
        if (!localStorage.getItem(LS_LAST)) setLastId(j.max_id);
        else if (j.max_id > lastId()) setLastId(j.max_id);
      }
    } catch (e) { /* offline -> still weitermachen */ }
  }

  function addControls() {
    if (document.getElementById('nexo-sound-toggle')) return;
    var b = document.createElement('button');
    b.id = 'nexo-sound-toggle';
    b.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:99998;padding:10px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:bold;font-size:14px;font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3)';
    function paint() {
      b.textContent = soundOn() ? '🔔 Ton: AN (klicken=aus)' : '🔕 Ton: AUS (klicken=an)';
      b.style.background = soundOn() ? '#15803d' : '#6b7280';
      b.style.color = '#fff';
    }
    b.onclick = function () {
      localStorage.setItem(LS_SOUND, soundOn() ? 'off' : 'on');
      if (soundOn()) { try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); ring(); } catch (e) {} stopRing(); }
      paint();
    };
    paint();
    document.body.appendChild(b);
  }

  addControls();
  poll();
  setInterval(poll, POLL_MS);
})();
