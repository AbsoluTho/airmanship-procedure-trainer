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
  const audioVersion = 'fbw-20261116';
  const priority = name => priorities[name] ?? 1;
  const buffers = {};
  const called = new Set();
  let context, output, loading, current, candidate, primedMinimum;
  let enabled = false;
  const toggle = document.getElementById('cockpitSound');
  const cabin = document.getElementById('cabinCall');
  const status = document.getElementById('cockpitSoundStatus');

  function stop() {
    const playing = current;
    current = null;
    if (playing) playing.source.stop();
  }

  function updateControls() {
    toggle.setAttribute('aria-pressed', String(enabled));
    cabin.disabled = !enabled;
  }

  async function toggleSound() {
    if (enabled) {
      enabled = false;
      stop();
      updateControls();
      status.textContent = '';
      return;
    }

    toggle.disabled = true;
    status.textContent = 'Loading audio…';
    try {
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        output = context.createGain();
        output.gain.value = 0.65;
        output.connect(context.destination);
      }
      // Resume during the click to satisfy browser autoplay rules.
      const resumed = context.resume();
      if (!loading) {
        loading = Promise.all(Object.entries(files).map(async ([name, path]) => {
          const url = new URL(path, document.baseURI);
          if (url.protocol !== 'data:') url.searchParams.set('v', audioVersion);
          const response = await fetch(url);
          if (!response.ok) throw new Error('Could not load ' + name);
          buffers[name] = await context.decodeAudioData(await response.arrayBuffer());
        }));
      }
      await Promise.all([resumed, loading]);
      enabled = true;
      status.textContent = '';
    } catch (error) {
      loading = null;
      status.textContent = 'Audio unavailable. Try again.';
      console.warn('Cockpit audio:', error);
    } finally {
      toggle.disabled = false;
      updateControls();
    }
  }

  function play(name) {
    if (!enabled || context.state !== 'running') return;
    if (current && priority(current.name) >= priority(name)) return;
    stop();
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

  toggle.addEventListener('click', toggleSound);
  cabin.addEventListener('click', () => play('cabin'));
  return {play, reset, cancelFlight, readFlight, sample, flush};
})();
