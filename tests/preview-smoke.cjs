// Reuse the same flow against the standalone preview snapshot.
process.env.POTONCHU_UI_TEST_URL = process.env.POTONCHU_PREVIEW_URL || "http://127.0.0.1:4173/preview/index.html";
require("./ui-smoke.cjs");
