export const defaultEffortTarget = 'RPE 8–9';

const reserveUnit = String.raw`(?:RIR|reps?\s+in\s+reserve)\b`;
const reserveAmount = String.raw`\d+(?:\.\d+)?`;
const reserveRange = `(${reserveAmount})(?:\\s*(?:[-–—]|\\bto\\b)\\s*(${reserveAmount}))?`;
const reserveTarget = new RegExp(
  String.raw`(?<![\w.+−–—-])` + reserveRange + String.raw`\s*` + reserveUnit +
  String.raw`|\b` + reserveUnit + String.raw`\s*` + reserveRange + String.raw`(?![\w.])`,
  'gi',
);

export function displayEffortTarget(value) {
  return String(value ?? '').replace(reserveTarget, (match, suffixStart, suffixEnd, prefixStart, prefixEnd) => {
    const first = Number(suffixStart ?? prefixStart);
    const last = Number(suffixEnd ?? prefixEnd ?? first);
    if (first > 10 || last > 10) return match;
    const low = Number((10 - Math.max(first, last)).toFixed(8));
    const high = Number((10 - Math.min(first, last)).toFixed(8));
    return low === high ? `RPE ${low}` : `RPE ${low}–${high}`;
  });
}
