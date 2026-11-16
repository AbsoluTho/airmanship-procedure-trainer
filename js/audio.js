/* Cockpit audio, from local WAVs on Pages or data URLs in the single-file build. */
const cockpitAudio = (() => {
  const heights = [2500, 1000, 500, 400, 300, 200, 100, 50, 40, 30, 20, 10, 5];
  const files = {
    2500: 'audio/2500.wav', 1000: 'audio/1000.wav',
    500: 'audio/500.wav', 400: 'audio/400.wav', 300: 'audio/300.wav',
    200: 'audio/200.wav', 100: 'audio/100.wav', 50: 'audio/50.wav',
    40: 'audio/40.wav', 30: 'audio/30.wav', 20: 'audio/20.wav',
    10: 'audio/10.wav', 5: 'audio/5.wav',
    above: 'audio/100-above.wav', minimums: 'audio/minimums.wav',
    retard: 'audio/retard.wav', cabin: 'audio/cabin-call.wav',
    apDisconnect: 'audio/ap-disconnect.wav', warning: 'audio/master-warning.wav'
  };
  const priorities = {cabin: 0, above: 2, minimums: 3, retard: 4, apDisconnect: 5, warning: 6};
  const audioVersion = 'fbw-20261116b';
  const priority = name => priorities[name] ?? 1;
  const buffers = {};
  const called = new Set();
  let context, output, loading, current, candidate, primedMinimum, keepAlive, spare;
  const urls = {};
  let enabled = false;
  const toggle = document.getElementById('cockpitSound');
  const cabin = document.getElementById('cabinCall');
  const status = document.getElementById('cockpitSoundStatus');

  // iPad and iPhone: Web Audio follows the silent/mute setting and stays quiet when the device
  // is muted. Declaring the page as media playback (Safari 16.4 and later), or keeping a silent
  // <audio> element playing (earlier versions), routes it like music, which mute does not silence.
  function silentWav() {
    const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const tag = (o, t) => { for (let i = 0; i < 4; i++) b[o + i] = t.charCodeAt(i); };
    tag(0, 'RIFF'); v.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true);
    v.setUint16(34, 8, true); tag(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    let t = ''; for (let i = 0; i < b.length; i++) t += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(t);
  }

  function mediaRoute(on) {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = on ? 'playback' : 'auto'; return; }
      const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!apple) return;
      if (on) {
        if (!keepAlive) {
          keepAlive = new Audio(silentWav());
          keepAlive.loop = true;
          keepAlive.setAttribute('playsinline', '');
        }
        const p = keepAlive.play();
        if (p && p.catch) p.catch(() => {});
      } else if (keepAlive) keepAlive.pause();
    } catch (error) { console.warn('Cockpit audio route:', error); }
  }

  // Safari suspends ("interrupted") the context after a call, a lock or a switch to another app.
  function wake() {
    if (!enabled || !context || context.state === 'running') return;
    try { const p = context.resume(); if (p && p.catch) p.catch(() => {}); } catch (error) {}
    mediaRoute(true);
  }

  // Older Safari only has the callback form of decodeAudioData.
  function decode(data) {
    return new Promise((resolve, reject) => {
      const p = context.decodeAudioData(data, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
  }

  function stop() {
    const playing = current;
    current = null;
    if (playing) playing.source.stop();
  }

  function updateControls() {
    toggle.setAttribute('aria-pressed', String(enabled));
  }

  const say = text => { status.textContent = text; };

  // Second way of playing, used when Web Audio is not running or a file could not be decoded:
  // one <audio> element, started inside the tap so the browser lets it play later on.
  function primeSpare() {
    try {
      if (!spare) { spare = new Audio(); spare.setAttribute('playsinline', ''); spare.preload = 'auto'; }
      spare.src = silentWav();
      const p = spare.play();
      if (p && p.catch) p.catch(() => {});
    } catch (error) { console.warn('Cockpit audio spare:', error); }
  }

  function toggleSound() {
    if (enabled) {
      enabled = false;
      stop();
      mediaRoute(false);
      updateControls();
      say('');
      return Promise.resolve(false);
    }
    return turnOn();
  }

  async function turnOn() {
    toggle.disabled = true;
    primeSpare();
    status.textContent = 'Loading audio…';
    try {
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        output = context.createGain();
        output.gain.value = 0.65;
        output.connect(context.destination);
      }
      // Resume during the click to satisfy browser autoplay rules.
      mediaRoute(true);
      const resumed = context.resume();
      // A sound started inside the tap itself unlocks playback on iPad and iPhone.
      { const blip = context.createBufferSource();
        blip.buffer = context.createBuffer(1, 1, 22050);
        blip.connect(context.destination); blip.start(0); }
      if (!loading) {
        loading = Promise.all(Object.entries(files).map(async ([name, path]) => {
          const url = new URL(path, document.baseURI);
          if (url.protocol !== 'data:') url.searchParams.set('v', audioVersion);
          urls[name] = url.href;
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            buffers[name] = await decode(await response.arrayBuffer());
          } catch (error) {
            // Left to the spare <audio> element, which loads the file by itself.
            console.warn('Cockpit audio: ' + name + ' not decoded:', error);
          }
        }));
      }
      // Do not wait for resume(): on iPad it can stay pending and would leave the button locked.
      if (resumed && resumed.catch) resumed.catch(() => {});
      await loading;
      enabled = true;
      const missing = Object.keys(files).length - Object.keys(buffers).length;
      say(context.state === 'running' && !missing ? '' :
        'Sound on · audio ' + context.state + (missing ? ' · ' + missing + ' files on spare player' : ''));
    } catch (error) {
      loading = null;
      say('Audio unavailable: ' + (error && error.message || error));
      console.warn('Cockpit audio:', error);
    } finally {
      toggle.disabled = false;
      updateControls();
    }
  }

  function play(name) {
    if (!enabled) return;
    if (context.state !== 'running') wake();
    if (current && priority(current.name) >= priority(name)) return;
    stop();
    if (context.state !== 'running' || !buffers[name]) return playSpare(name);
    const source = context.createBufferSource();
    source.buffer = buffers[name];
    source.connect(output);
    source.onended = () => {
      source.disconnect();
      if (current?.source === source) current = null;
    };
    current = {name, source};
    source.start();
  }

  function playSpare(name) {
    if (!spare || !urls[name]) return;
    const handle = {stop() { try { spare.pause(); } catch (error) {} }};
    current = {name, source: handle};
    const done = () => { if (current && current.source === handle) current = null; };
    spare.onended = done;
    try {
      spare.src = urls[name];
      spare.volume = 0.65;
      const p = spare.play();
      if (p && p.catch) p.catch(error => { done(); say('Sound blocked: ' + (error && error.name || error)); });
    } catch (error) { done(); say('Sound blocked: ' + (error && error.name || error)); }
  }

  function reset() {
    called.clear();
    primedMinimum = undefined;
    cancelFlight();
  }

  function cancelFlight() {
    candidate = null;
    if (current && priority(current.name) > priorities.cabin &&
        priority(current.name) <= priorities.retard) stop();
  }

  function readFlight() {
    const baro = S.p2.baro;
    const radio = S.p2.radio;
    const altitude = FL.alt;
    return {
      approach: (!FL.ground || FL.stage === 'ROLLOUT') && ['APPR', 'DES'].includes(S.phase),
      altitude,
      height: altitude - groundElev(),
      baroOffset: indicatedAltitude(altitude) - altitude,
      minimum: Number.isFinite(baro) ? baro : radio,
      minimumMode: Number.isFinite(baro) ? 'baro' : 'radio',
      retardHeight: FCU.ap1 || FCU.ap2 ? 10 : 20,
      retardArmed: FL.ver === 'FLARE' && LV.thr !== 'IDLE'
    };
  }

  function sample(before, after) {
    if (!after.approach) return;
    const descends = after.altitude < before.altitude;
    const heightCrossed = threshold =>
      descends && before.height > threshold && after.height <= threshold;
    const consider = (name, crossed) => {
      if (!crossed || called.has(name)) return;
      called.add(name);
      // At high simulation rates, retain the newest callout at the highest priority.
      if (!candidate || priority(name) >= priority(candidate)) candidate = name;
    };

    for (const height of heights) consider(String(height), heightCrossed(height));

    const {minimum, minimumMode} = after;
    const selection = minimumMode + ':' + minimum;
    if (Number.isFinite(minimum) && primedMinimum === selection) {
      // Apply the current baro setting to both samples so changing QNH cannot trigger a callout.
      const previous = minimumMode === 'baro' ? before.altitude + after.baroOffset : before.height;
      const next = minimumMode === 'baro' ? after.altitude + after.baroOffset : after.height;
      consider('above', descends && previous > minimum + 100 && next <= minimum + 100);
      consider('minimums', descends && previous > minimum && next <= minimum);
    }
    primedMinimum = selection;
    consider('retard', after.retardArmed && heightCrossed(after.retardHeight));
  }

  function flush() {
    if (candidate) play(candidate);
    candidate = null;
  }

  ['pointerdown', 'touchend', 'keydown'].forEach(ev =>
    document.addEventListener(ev, wake, {capture: true, passive: true}));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  toggle.addEventListener('click', toggleSound);
  // CABIN CALL is the sound check: it also switches the sound on when it is off.
  cabin.addEventListener('click', async () => {
    if (!enabled) await turnOn();
    play('cabin');
  });
  return {play, reset, cancelFlight, readFlight, sample, flush};
})();
