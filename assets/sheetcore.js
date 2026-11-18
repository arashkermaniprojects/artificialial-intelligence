/* Shared by the browser (personal lab sheets) and by the teacher's key tool (tools/labkey.js): the SAME student ID always gives the SAME sheet. */
(function (root) {
  const SC = {};
  SC.hash32 = function (s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  SC.seed = (labId, sid) => SC.hash32(labId + '|' + String(sid).trim());
  SC.code = (labId, sid) => labId.toUpperCase() + '-' + SC.seed(labId, sid).toString(36).toUpperCase();
  SC.rng = function (seed) {
    let a = seed >>> 0 || 1;
    const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return {
      seed, next: r,
      int: (x, y) => x + Math.floor(r() * (y - x + 1)),
      float: (x, y) => x + r() * (y - x),
      pick: arr => arr[Math.floor(r() * arr.length)],
      chance: p => r() < p,
      shuffle(arr) { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SC; else root.SheetCore = SC;
})(typeof window !== 'undefined' ? window : globalThis);
