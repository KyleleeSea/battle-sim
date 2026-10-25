'use strict';
// Online duels, peer to peer. The host's browser holds the match and the guest connects to it directly
// over WebRTC; PeerJS's public server only introduces the two browsers. Each side sends its army, round
// and a "ready" number. When both seats are ready for the same round, every screen runs the same battle
// from the same armies and seed, so nothing else has to travel between players.

const Net = (() => {
  const PROTO = 7;               // Bump whenever the simulation changes (and the ?v= on index.html's scripts).
  const PREFIX = 'mabs-p' + PROTO + '-';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  let peer = null, role = null, conns = [];
  let match = null, seat = null, ready = 0, round = 1, battle = null;
  let guest = null;              // host only: the Blue player's latest state
  let seats = [null, null];      // what the host last told us about both seats
  let watchers = 0, lastKey = '', applied = [null, null], score = [0, 0];
  let myName = '';
  try { myName = localStorage.getItem('mabs-name') || ''; } catch (e) { /* storage is optional */ }

  const cleanName = s => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20) : '');
  // The full army only travels once you press Ready; before that the opponent gets positions alone.
  const mine = () => ({
    army: seat !== null && ready ? encodeArmy(G.armies[seat]) : '',
    shadow: seat !== null ? encodeShadow(G.armies[seat]) : '',
    ready, round, battle, name: myName,
  });
  function cleanState(s) {
    if (!s || typeof s !== 'object') return null;
    const sb = s.battle;
    const b = sb && typeof sb === 'object' && typeof sb.key === 'string' && Array.isArray(sb.armies)
      ? { key: sb.key.slice(0, 60), at: num(sb.at), budget: Math.floor(num(sb.budget)), map: MAPS[sb.map] ? sb.map : 'meadow', armies: [0, 1].map(i => (typeof sb.armies[i] === 'string' ? sb.armies[i].slice(0, 2400) : '')) } : null;
    return { army: typeof s.army === 'string' ? s.army.slice(0, 2400) : '', shadow: typeof s.shadow === 'string' ? s.shadow.slice(0, 2000) : '', ready: num(s.ready), round: Math.floor(num(s.round)), battle: b, name: cleanName(s.name) };
  }
  // A seat's state as this screen knows it: our own seat is always the local, freshest copy.
  function seatState(s) {
    if (s === seat && seat !== null) return mine();
    if (role === 'host') return s === 0 ? mine() : guest;
    return seats[s];
  }

  // ---------- sending ----------
  function send(c, msg) { try { if (c.open) c.send(msg); } catch (e) { /* a closed channel just drops it */ } }
  function broadcast() {
    if (role !== 'host') return;
    const msg = { t: 'room', seats: [mine(), guest], budget: G.budgetIdx, map: G.map, watchers: conns.filter(c => c.seat === null && c.ok).length };
    for (const c of conns) if (c.ok) send(c, msg);
  }
  function pushMe() {
    if (role === 'host') broadcast();
    else if (role === 'guest' && seat !== null && conns[0]) send(conns[0], { t: 'me', s: mine() });
  }

  // ---------- the match logic, shared by host, guest and watchers ----------
  function recompute() {
    if (!match) { renderBar(); hud(); return; }
    const occ = [seatState(0), seatState(1)];
    // The other side shows as black "?" stand-ins until the battle reveals it.
    for (const s of [0, 1]) {
      if (s === seat) continue;
      const str = occ[s] ? occ[s].shadow : '';
      if (str !== applied[s]) { applied[s] = str; setArmy(s, decodeShadow(str, s)); }
    }
    // Someone already began a battle this screen belongs in (a paused tab, a late watcher):
    // replay it from the armies they sent, fast-forwarded to the present moment.
    if (W.state === 'place') {
      const info = [0, 1].filter(s => s !== seat).map(s => occ[s] && occ[s].battle)
        .filter(b => b && b.key !== lastKey && Date.now() - b.at < 240000 && involvesMe(b.key))
        .sort((a, b) => b.at - a.at)[0];
      const waiting = G.countdown && info && G.countdown.key === info.key && Date.now() - info.at < 1500;
      if (info && !waiting) {
        G.countdown = null; $('countdown').hidden = true;
        lastKey = info.key; begin(info.key, info.armies, info.budget, info.map);
        fastForward(Math.min(240 * 60, Math.round((Date.now() - info.at) / 1000 * 60)));
      }
    }
    if (W.state === 'place') {
      const other = seat !== null ? occ[1 - seat] : null;
      if (!G.countdown && other && other.round > round) { round = other.round; pushMe(); }
      const r0 = occ[0] && occ[0].ready ? occ[0] : null, r1 = occ[1] && occ[1].ready ? occ[1] : null;
      const key = r0 && r1 && r0.round === r1.round ? `${r0.round}.${r0.ready}.${r1.ready}` : null;
      if (G.countdown && G.countdown.key !== key) {
        G.countdown = null; $('countdown').hidden = true;
        toast('A player left, so the countdown stopped.');
      }
      if (key && key !== lastKey && !G.countdown) G.countdown = { t: 3, key, done: () => { lastKey = key; begin(key); } };
    }
    renderBar(); hud();
  }

  // A battle key is "round.redReady.blueReady". Players only join battles that used their own ready number.
  function involvesMe(key) {
    if (seat === null) return true;
    const parts = key.split('.');
    return Number(parts[0]) === round && Number(parts[1 + seat]) === ready && ready !== 0;
  }

  function begin(key, armies, budget, map) {
    if (map && MAPS[map] && map !== G.map) applyMap(map);
    const strs = armies || [0, 1].map(s => { const o = seatState(s); return o ? o.army : ''; });
    if (Number.isInteger(budget) && budget >= 0 && budget < G.budgets.length - 1) G.budgetIdx = budget;
    for (const s of [0, 1]) G.armies[s] = decodeArmy(strs[s], s, budgetNow());
    startBattle(hashStr(`${strs[0]}|${strs[1]}|${key}|${G.budgetIdx}|${G.map}`));
    battle = { key, at: Date.now(), armies: strs, budget: G.budgetIdx, map: G.map };
    pushMe();
  }

  // ---------- connecting ----------
  function newPeer(id) {
    if (typeof window.Peer !== 'function') { toast('Online play could not load. Check your connection and reload.'); return null; }
    const p = id ? new window.Peer(id) : new window.Peer();
    p.on('disconnected', () => { if (peer === p && role === 'host') p.reconnect(); });
    return p;
  }

  function enter(code, asRole, mySeat) {
    match = code; role = asRole; seat = mySeat; ready = 0; round = 1; battle = null;
    guest = null; seats = [null, null]; watchers = 0; score = [0, 0]; lastKey = ''; applied = [null, null];
    G.mode = 'online'; G.editable = [seat === 0, seat === 1]; G.hidden = [seat !== 0, seat !== 1]; G.countdown = null;
    if (G.budgetIdx === G.budgets.length - 1) G.budgetIdx = 1;
    W.state = 'place'; G.armies = [[], []];
    backToDeploy(); fillPresetSelect(); closePanel();
    recompute();
  }

  function host() {
    leave(true);
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    const p = newPeer(PREFIX + code);
    if (!p) return;
    peer = p;
    setStatus('Opening a match…');
    p.on('open', () => {
      if (peer !== p) return;
      enter(code, 'host', 0);
      setStatus('');
      toast(`Match ${code} is open. Send your friend the invite link.`);
    });
    p.on('connection', c => {
      c.seat = null; c.ok = false;
      conns.push(c);
      c.on('data', msg => hostData(c, msg));
      c.on('close', () => dropConn(c));
      c.on('error', () => dropConn(c));
    });
    p.on('error', err => {
      if (peer !== p) return;
      if (err.type === 'unavailable-id') { host(); return; } // code already taken: pick another
      if (!match) { setStatus(failText(err)); leave(true); }
    });
  }

  function hostData(c, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') {
      if (msg.v !== PROTO) { send(c, { t: 'reject', why: 'version' }); setTimeout(() => c.close(), 500); return; }
      c.ok = true; c.name = cleanName(msg.name);
      const taken = conns.some(o => o !== c && o.ok && o.seat === 1);
      c.seat = taken ? null : 1;
      send(c, { t: 'welcome', seat: c.seat, code: match });
      if (c.seat === 1) { guest = { army: '', ready: 0, round, battle: null, name: c.name }; toast(`${c.name || 'Your opponent'} joined as Blue.`); }
      broadcast(); recompute();
    } else if (msg.t === 'me' && c.ok && c.seat === 1) {
      guest = cleanState(msg.s);
      broadcast(); recompute();
    }
  }

  function dropConn(c) {
    if (!conns.includes(c)) return;
    conns = conns.filter(o => o !== c);
    if (c.seat === 1 && c.ok) { guest = null; toast(`${c.name || 'Your opponent'} left the match.`); }
    broadcast(); recompute();
  }

  function join(code) {
    leave(true);
    const p = newPeer(null);
    if (!p) return;
    peer = p;
    setStatus(`Looking for match ${code}…`);
    p.on('open', () => {
      if (peer !== p) return;
      const c = p.connect(PREFIX + code, { reliable: true });
      conns = [c];
      c.on('open', () => send(c, { t: 'hello', v: PROTO, name: myName }));
      c.on('data', msg => guestData(code, msg));
      c.on('close', () => { if (peer === p && match) { toast('The host left the match.'); leave(); } });
      c.on('error', () => {});
    });
    p.on('error', err => {
      if (peer !== p) return;
      setStatus(err.type === 'peer-unavailable' ? `No open match has the code ${code}. Check the code with your friend.` : failText(err));
      if (!match) leave(true);
    });
  }

  function guestData(code, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'reject') {
      setStatus('Your friend is running a different version of the game. Both of you reload the page, then try again.');
      leave(true); openPanel();
    } else if (msg.t === 'welcome') {
      enter(code, 'guest', msg.seat === 1 ? 1 : null);
      setStatus('');
      toast(seat === 1 ? `You are Blue in match ${code}.` : `Match ${code} is full. You are watching.`);
      pushMe();
    } else if (msg.t === 'room' && Array.isArray(msg.seats)) {
      seats = [cleanState(msg.seats[0]), cleanState(msg.seats[1])];
      watchers = num(msg.watchers);
      if (typeof msg.map === 'string' && MAPS[msg.map] && msg.map !== G.map) { applyMap(msg.map); toast(`The host picked ${MAPS[msg.map].name}.`); }
      const b = msg.budget;
      if (Number.isInteger(b) && b >= 0 && b < G.budgets.length - 1 && b !== G.budgetIdx) {
        G.budgetIdx = b;
        if (seat !== null) { setArmy(seat, decodeArmy(encodeArmy(G.armies[seat]), seat, budgetNow())); pushMe(); }
      }
      recompute();
    }
  }

  function failText(err) {
    return err && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error')
      ? 'Could not reach the matchmaking server. Check your connection and try again.'
      : 'Something went wrong connecting. Try again.';
  }

  function leave(quiet) {
    const was = !!match;
    for (const c of conns) { try { c.close(); } catch (e) { /* already closed */ } }
    conns = [];
    if (peer) { const p = peer; peer = null; try { p.destroy(); } catch (e) { /* already gone */ } }
    match = null; role = null; seat = null; ready = 0; battle = null; guest = null;
    G.countdown = null; $('countdown').hidden = true;
    if (was) {
      G.mode = 'sandbox'; G.editable = [true, true]; G.hidden = [false, false];
      W.state = 'place'; fillPresetSelect(); loadPreset('s:uprising'); backToDeploy();
    }
    renderBar(); if (!quiet) hud();
  }

  // ---------- what game.js asks ----------
  function controls() {
    if (seat === null) return { label: 'Watching', sub: match ? `match ${match}` : '', disabled: true };
    if (W.state === 'battle') return { label: 'Battle on', sub: 'speed is yours alone', disabled: true };
    if (W.state === 'over') return { label: 'Next round', sub: 'back to deployment', disabled: false };
    if (G.countdown) return { label: 'Get ready', sub: 'battle starting', disabled: true, ready: true };
    const opp = seatState(1 - seat), oppName = (opp && opp.name) || TEAM[1 - seat].name;
    if (ready) return { label: 'Unready', sub: !opp ? 'no opponent yet' : `waiting for ${oppName}`, disabled: false, ready: true };
    return { label: 'Ready', sub: !opp ? 'no opponent yet' : opp.ready ? `${oppName} is ready` : 'lock in your army', disabled: false };
  }

  function fightPressed() {
    if (seat === null) return;
    if (W.state === 'over') { nextRound(); return; }
    if (W.state !== 'place' || G.countdown) return;
    if (ready) ready = 0;
    else {
      if (!G.armies[seat].length) { toast('Place at least one unit first.'); return; }
      ready = 1 + Math.floor(Math.random() * 2147483646);
    }
    SFX.play('click');
    pushMe(); recompute();
  }

  function nextRound() { applied = [null, null]; backToDeploy(); recompute(); }

  function battleEnded(winner) {
    if (winner >= 0) score[winner]++;
    round++; ready = 0;
    pushMe(); renderBar();
  }

  // ---------- panel and match bar ----------
  function setStatus(text) { $('netStatus').textContent = text || 'Play a friend directly, browser to browser.'; }

  function inviteLink() {
    const u = new URL(location.href);
    u.hash = ''; u.search = '';
    u.searchParams.set('join', match);
    return u.toString();
  }

  function renderBar() {
    $('matchBar').hidden = !match;
    for (const s of [0, 1]) {
      const o = match ? seatState(s) : null;
      $(`name${s}`).textContent = !match ? TEAM[s].name : s === seat ? 'You' : !o ? 'Open seat' : o.name || TEAM[s].name;
      $(`ready${s}`).hidden = !(o && o.ready && W.state === 'place');
    }
    if (!match) return;
    $('matchCode').textContent = match;
    const opp = seat !== null ? seatState(1 - seat) : null;
    $('seatInfo').textContent = seat === null ? 'Watching' : !opp ? `You are ${TEAM[seat].name}. Waiting for your friend…` : `You are ${TEAM[seat].name}`;
    $('scoreInfo').textContent = `${score[0]} – ${score[1]}`;
    const w = role === 'host' ? conns.filter(c => c.ok && c.seat === null).length : watchers;
    $('connInfo').textContent = `${w} watching`;
    $('connInfo').hidden = w === 0;
    $('copyBtn').hidden = role !== 'host';
  }

  function openPanel() { $('nameInput').value = myName; $('netPanel').hidden = false; $('hostBtn').focus(); }
  function closePanel() { $('netPanel').hidden = true; }

  function wire() {
    $('onlineBtn').addEventListener('click', openPanel);
    $('closeNet').addEventListener('click', closePanel);
    $('netPanel').addEventListener('click', e => { if (e.target === $('netPanel')) closePanel(); });
    $('nameInput').addEventListener('input', e => {
      myName = cleanName(e.target.value);
      try { localStorage.setItem('mabs-name', myName); } catch (err) { /* storage is optional */ }
    });
    $('hostBtn').addEventListener('click', () => { SFX.unlock(); host(); });
    $('joinForm').addEventListener('submit', e => {
      e.preventDefault(); SFX.unlock();
      const code = $('codeInput').value.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) { setStatus('Match codes are 4 letters or digits.'); return; }
      join(code);
    });
    $('leaveBtn').addEventListener('click', () => leave());
    $('copyBtn').addEventListener('click', () => {
      const link = inviteLink();
      const fallback = () => { window.prompt ? window.prompt('Copy this invite link:', link) : toast(link); };
      try { navigator.clipboard.writeText(link).then(() => toast('Invite link copied. Send it to your friend.'), fallback); } catch (e) { fallback(); }
    });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('netPanel').hidden) closePanel(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recompute(); });
  }

  function init() {
    wire(); setStatus('');
    const code = (new URLSearchParams(location.search).get('join') || '').trim().toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(code)) { $('codeInput').value = code; join(code); }
  }

  return {
    init, controls, fightPressed, nextRound, battleEnded, openPanel,
    armyChanged: team => { if (team === seat) { pushMe(); recompute(); } },
    settingsChanged: () => { pushMe(); recompute(); },
    canEdit: () => seat !== null && !ready,
    isHost: () => role === 'host' && seat === 0,
    seat: () => seat,
  };
})();

start({});
