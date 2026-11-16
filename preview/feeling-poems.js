(function (root) {
  "use strict";
  const tanka = typeof module !== "undefined" && module.exports ? require("./functions/lib/tanka-contract") : root.PotonchuTanka;
  const catalog = typeof module !== "undefined" && module.exports ? require("./functions/lib/feeling-catalog-data") : root.PotonchuFeelingCatalog;
  const MAX_INPUT = 500;

  function normalize(value) {
    return typeof value === "string" ? value.normalize("NFKC").replace(/\r\n?/g, "\n").trim() : "";
  }
  function sample(input, previousId = "") {
    const text = normalize(input);
    if (!text || Array.from(text).length > MAX_INPUT) throw new Error("invalid-feeling");
    const group = catalog.find((item) => item.match && new RegExp(item.match).test(text)) || catalog.find((item) => item.id === "open");
    const options = group.poems.filter((item) => item.templateId !== previousId && tanka.validDraft(item));
    if (!options.length) throw new Error("invalid-catalog");
    const draft = options[Math.floor(Math.random() * options.length)];
    return { ...draft, lines: [...draft.lines], choices: [...draft.choices], readings: [...draft.readings], choiceReadings: [...draft.choiceReadings] };
  }
  const api = { MAX_INPUT, normalize, sample, valid: tanka.validCompleted, validDraft: tanka.validDraft,
    complete: tanka.complete, countMora: tanka.countMora, BLANK: tanka.BLANK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PotonchuFeelings = api;
})(globalThis);
