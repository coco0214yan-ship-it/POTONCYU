const path = require("node:path");
const kuromoji = require("kuromoji");
let tokenizerPromise;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: path.join(path.dirname(require.resolve("kuromoji/package.json")), "dict") })
        .build((error, tokenizer) => error ? reject(error) : resolve(tokenizer));
    }).catch((error) => { tokenizerPromise = null; throw error; });
  }
  return tokenizerPromise;
}

async function readingsFor(lines) {
  const tokenizer = await getTokenizer();
  return lines.map((line) => {
    let reading = "";
    for (const token of tokenizer.tokenize(line)) {
      if (token.pos === "記号") continue;
      const pronunciation = token.pronunciation && token.pronunciation !== "*" ? token.pronunciation : token.reading;
      const value = pronunciation && pronunciation !== "*" ? pronunciation : token.surface_form;
      if (!/^[ぁ-ゔァ-ヴー]+$/.test(value)) return "";
      reading += value;
    }
    return reading;
  });
}

module.exports = { readingsFor };
