// Polyfill TextEncoder/TextDecoder for jsdom test environment.
// @stellar/stellar-sdk v16 uses TextDecoder internally (via uint8array-extras).
const { TextEncoder: TE, TextDecoder: TD } = require("util");
globalThis.TextEncoder = TE;
globalThis.TextDecoder = TD;
