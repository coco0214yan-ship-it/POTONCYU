(function (root) {
  "use strict";
  const STORAGE_KEY = root.POTONCHU_PREVIEW === true ? "potonchu.preview.reactionSound.v1" : "potonchu.reactionSound.v1";
  let audio = null;
  let enabled = true;
  try { enabled = root.localStorage.getItem(STORAGE_KEY) !== "off"; } catch (error) { /* Optional preference. */ }

  function setEnabled(value) {
    enabled = Boolean(value);
    try { root.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); } catch (error) { /* Optional preference. */ }
  }

  function play(adding = true, emoji = "") {
    if (!enabled) return;
    try {
      const Audio = root.AudioContext || root.webkitAudioContext;
      if (!Audio) return;
      audio = audio || new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const now = audio.currentTime;
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const pitch = emoji === "😂" || emoji === "笑った" ? 600 : emoji === "🌙" || emoji === "🍵" ? 350 : 470;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(adding ? pitch * 1.25 : pitch * 0.8, now);
      oscillator.frequency.exponentialRampToValueAtTime(adding ? pitch * 0.66 : pitch * 0.45, now + 0.17);
      volume.gain.setValueAtTime(0.001, now);
      volume.gain.exponentialRampToValueAtTime(0.13, now + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.21);
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
    } catch (error) { /* Reactions still work without audio. */ }
  }

  root.PotonchuFeedback = { get enabled() { return enabled; }, setEnabled, play };
})(globalThis);
