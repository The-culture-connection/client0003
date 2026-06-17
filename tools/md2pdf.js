// Minimal, dependency-free Markdown -> styled HTML converter for the beta docs.
// Handles: h1-h3, ---, GFM tables, bullet/numbered lists, blockquotes,
// **bold**, *italic*, `code`, and paragraphs. Then Chrome headless makes the PDF.
const fs = require('fs');

const inPath = process.argv[2];
const outHtml = process.argv[3];
if (!inPath || !outHtml) { console.error('usage: node md2pdf.js <in.md> <out.html>'); process.exit(1); }

const src = fs.readFileSync(inPath, 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
function splitRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

const out = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];

  // horizontal rule
  if (/^---+\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

  // headings
  let m = line.match(/^(#{1,6})\s+(.*)$/);
  if (m) { const lvl = m[1].length; out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); i++; continue; }

  // blockquote (collapse consecutive > lines)
  if (/^>\s?/.test(line)) {
    const buf = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
    out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
    continue;
  }

  // table: header row followed by a separator row of dashes
  if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
    const header = splitRow(line);
    i += 2; // skip header + separator
    const rows = [];
    while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') { rows.push(splitRow(lines[i])); i++; }
    let t = '<table><thead><tr>' + header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) t += '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
    t += '</tbody></table>';
    out.push(t);
    continue;
  }

  // unordered list
  if (/^\s*[-*]\s+/.test(line)) {
    out.push('<ul>');
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i++;
    }
    out.push('</ul>');
    continue;
  }

  // ordered list
  if (/^\s*\d+\.\s+/.test(line)) {
    out.push('<ol>');
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
      out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++;
    }
    out.push('</ol>');
    continue;
  }

  // blank line
  if (line.trim() === '') { i++; continue; }

  // paragraph (gather until blank / block boundary)
  const buf = [line];
  i++;
  while (i < lines.length && lines[i].trim() !== '' &&
         !/^(#{1,6}\s|>|---+\s*$|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i]) &&
         !/\|/.test(lines[i])) {
    buf.push(lines[i]); i++;
  }
  out.push(`<p>${inline(buf.join(' '))}</p>`);
}

const css = `
  @page { size: Letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #1c1c1e; font-size: 11pt; line-height: 1.5; max-width: 100%; }
  h1 { font-size: 22pt; color: #7a1f1f; border-bottom: 3px solid #b03a2e; padding-bottom: 6px; margin: 0 0 14px; }
  h2 { font-size: 15pt; color: #7a1f1f; margin: 22px 0 8px; border-bottom: 1px solid #e5d4d0; padding-bottom: 4px; }
  h3 { font-size: 12.5pt; color: #2c2c2e; margin: 16px 0 6px; }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0 8px 22px; padding: 0; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
  blockquote { margin: 10px 0; padding: 8px 14px; background: #faf3f2; border-left: 4px solid #b03a2e;
               color: #444; border-radius: 0 4px 4px 0; }
  code { background: #f2eceb; padding: 1px 5px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9.5pt; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; page-break-inside: auto; }
  th { background: #7a1f1f; color: #fff; text-align: left; padding: 7px 9px; font-weight: 600; }
  td { border: 1px solid #e2dad8; padding: 6px 9px; vertical-align: top; }
  tr:nth-child(even) td { background: #faf6f5; }
  tr { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  strong { color: #1c1c1e; }
  a { color: #7a1f1f; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${out.join('\n')}</body></html>`;
fs.writeFileSync(outHtml, html, 'utf8');
console.log('wrote ' + outHtml);
