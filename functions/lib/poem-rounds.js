(function (root) {
  "use strict";
  const HOUR = 60 * 60 * 1000;
  const CYCLE = 24 * HOUR;
  const OPEN = 12 * HOUR;

  function state(room, userId, now = Date.now()) {
    const anchor = Number(room?.poemWindow?.startedAt);
    if (!room?.poemWindow?.enabled || !Number.isFinite(anchor) || anchor <= 0) {
      return { phase: "unlimited", canSend: true, index: null, nextAt: null };
    }
    if (now < anchor) return { phase: "waiting", canSend: false, index: -1, nextAt: anchor };
    const index = Math.floor((now - anchor) / CYCLE);
    const startsAt = anchor + index * CYCLE;
    const closesAt = startsAt + OPEN;
    const nextAt = startsAt + CYCLE;
    const sent = (room.messages || []).some((message) => (message.senderId || message.author?.id) === userId
      && message.status !== "failed" && message.createdAt >= startsAt && message.createdAt < closesAt);
    const phase = now >= closesAt ? "closed" : sent ? "sent" : "open";
    return { phase, canSend: phase === "open", sent, index, startsAt, closesAt, nextAt };
  }

  function remaining(target, now = Date.now()) {
    const minutes = Math.max(0, Math.ceil((target - now) / 60000));
    return `${Math.floor(minutes / 60)}時間${String(minutes % 60).padStart(2, "0")}分`;
  }

  const api = { state, remaining, HOUR, CYCLE, OPEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PotonchuRounds = api;
})(globalThis);
