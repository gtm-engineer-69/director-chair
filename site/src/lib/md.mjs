// The small part of markdown the item notes use: headings, bullets, numbered lists, tables, bold. Output is escaped.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
export function md(src) {
  const out = []; const lines = src.split('\n'); let i = 0;
  const take = (re) => { const rows = []; while (i < lines.length && re.test(lines[i])) rows.push(lines[i++]); return rows; };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^#{2,3} (.+)$/);
    if (h) { out.push(`<h3>${inline(h[1])}</h3>`); i++; }
    else if (/^- /.test(l)) out.push(`<ul>${take(/^- /).map((r) => `<li>${inline(r.slice(2))}</li>`).join('')}</ul>`);
    else if (/^\d+\. /.test(l)) out.push(`<ol>${take(/^\d+\. /).map((r) => `<li>${inline(r.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`);
    else if (/^\|/.test(l)) {
      const rows = take(/^\|/).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const [head, , ...body] = rows;
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else out.push(`<p>${inline(take(/^(?!#|- |\d+\. |\|)\S/).join(' '))}</p>`);
  }
  return out.join('\n');
}
