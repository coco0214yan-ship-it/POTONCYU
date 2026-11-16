(function (root) {
  "use strict";
  const BLANK = "__POTON_BLANK__";
  const METER = [5, 7, 5, 7, 7];
  const smallKana = /[ぁぃぅぇぉゃゅょゎ]/;

  function countMora(reading) {
    if (typeof reading !== "string" || !reading) return NaN;
    const kana = reading.normalize("NFKC").replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
    if (!/^[ぁ-ゔー]+$/.test(kana)) return NaN;
    let count = 0;
    let previous = "";
    for (const char of kana) {
      if (smallKana.test(char)) {
        if (!previous || previous === "っ" || previous === "ん" || previous === "ー" || smallKana.test(previous)) return NaN;
      } else {
        if (char === "ー" && !previous) return NaN;
        count += 1;
      }
      previous = char;
    }
    return count;
  }

  const clean = (value) => typeof value === "string" && value.trim().length > 0
    && Array.from(value).length <= 24 && !/[\r\n<>\x00-\x1f]/.test(value) && !value.includes(BLANK);
  function draftTextValid(draft) {
    return Array.isArray(draft?.lines) && draft.lines.length === 5 && draft.lines[2] === BLANK
      && draft.lines.every((line, i) => i === 2 || clean(line))
      && Array.isArray(draft.choices) && draft.choices.length === 4 && new Set(draft.choices).size === 4
      && draft.choices.every((choice) => clean(choice) && Array.from(choice).length <= 12);
  }
  function validDraft(draft) {
    return draftTextValid(draft) && Array.isArray(draft.readings) && draft.readings.length === 5
      && draft.readings[2] === "" && draft.readings.every((reading, i) => i === 2 || countMora(reading) === METER[i])
      && Array.isArray(draft.choiceReadings) && draft.choiceReadings.length === 4
      && draft.choiceReadings.every((reading) => countMora(reading) === 5);
  }
  function validCompleted(lines, readings) {
    return Array.isArray(lines) && lines.length === 5 && lines.every(clean)
      && Array.isArray(readings) && readings.length === 5 && readings.every((reading, i) => countMora(reading) === METER[i]);
  }
  function complete(draft, choice) {
    if (!validDraft(draft)) return null;
    const index = draft.choices.indexOf(choice);
    if (index < 0) return null;
    const lines = draft.lines.map((line, i) => i === 2 ? choice : line);
    const readings = draft.readings.map((reading, i) => i === 2 ? draft.choiceReadings[index] : reading);
    return validCompleted(lines, readings) ? { lines, readings } : null;
  }
  const api = { BLANK, METER, countMora, draftTextValid, validDraft, validCompleted, complete };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PotonchuTanka = api;
})(globalThis);
