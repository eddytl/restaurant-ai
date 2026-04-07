/**
 * Lightweight markdown → HTML parser for the restaurant chat UI.
 * Supports: headings, bold/italic/del/code, lists, tables, blockquotes,
 * horizontal rules, and the custom [image:type:idx] menu-card syntax.
 *
 * @param {string} raw - Raw markdown string
 * @param {Map<string, string>} imageCache - Shared type:idx → url cache
 * @param {string} placeholderSrc - Data-URI used while images are loading
 * @returns {string} Safe HTML string
 */
export function parseMarkdown(raw, imageCache, placeholderSrc) {
  let text = raw;

  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Media images: [image:type:idx] — URL resolved by the UI via /api/images/:type/:idx
  text = text.replace(/\[image:([^:\]]+):([^\]]+)\]/g, (_, type, idx) => {
    const safeType = type.trim().replace(/"/g, '&quot;');
    const safeIdx = idx.trim().replace(/"/g, '&quot;');
    const cached = imageCache.get(`${type.trim()}:${idx.trim()}`);
    const src = cached || placeholderSrc;
    return `<img class="md-img${cached ? '' : ' img-loading'}" src="${src}" data-image-type="${safeType}" data-image-idx="${safeIdx}" alt="image-${safeIdx}" />`;
  });

  // Standard images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    return `<img class="md-img" src="${url.trim()}" alt="${safeAlt}" loading="lazy" />`;
  });

  // Inline formatting
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/(?<![*_])\*([^*\n]+?)\*(?![*_])/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  const lines = text.split('\n');
  const processed = [];
  let inList = false, inOrderedList = false;
  let listItems = [], tableLines = [], cardBuffer = [];

  const isTableRow = (l) => /^\s*\|.+\|\s*$/.test(l);
  const isSeparatorRow = (l) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);
  const isImgLine = (l) => /<img[^>]+class="md-img/.test(l);

  function flushList() {
    if (inList && listItems.length) {
      processed.push('<ul>' + listItems.map(i => `<li>${i}</li>`).join('') + '</ul>');
      listItems = []; inList = false;
    }
    if (inOrderedList && listItems.length) {
      processed.push('<ol>' + listItems.map(i => `<li>${i}</li>`).join('') + '</ol>');
      listItems = []; inOrderedList = false;
    }
  }

  function formatCardInfo(desc, extra) {
    const priceMatch = desc.match(/(.+?)\s*[—–-]+\s*([0-9][0-9\s,.]*\s*XAF.*)$/i);
    if (priceMatch) {
      const name = priceMatch[1].replace(/<\/?strong>/g, '').trim();
      const price = priceMatch[2].trim();
      return `<div class="menu-card-info"><strong>${name}</strong>${extra ? `<span class="card-desc">${extra}</span>` : ''}<span class="card-price">${price}</span></div>`;
    }
    return `<div class="menu-card-info"><strong>${desc}</strong>${extra ? `<span class="card-desc">${extra}</span>` : ''}</div>`;
  }

  function flushCards() {
    if (!cardBuffer.length) return;
    const cards = cardBuffer.map(({ img, desc, extra }) =>
      `<div class="menu-card">${img}${desc ? formatCardInfo(desc, extra) : ''}</div>`
    ).join('');
    processed.push(`<div class="menu-card-grid">${cards}</div>`);
    cardBuffer = [];
  }

  function parseRow(line) { return line.split('|').slice(1, -1).map(c => c.trim()); }

  function flushTable() {
    if (tableLines.length < 2) {
      tableLines.forEach(l => processed.push(`<p class="md-p">${l}</p>`));
      tableLines = []; return;
    }
    const nonSep = [], sepFound = { v: false };
    tableLines.forEach(l => { if (isSeparatorRow(l)) sepFound.v = true; else nonSep.push(l); });
    if (!sepFound.v || !nonSep.length) {
      tableLines.forEach(l => processed.push(`<p class="md-p">${l}</p>`));
      tableLines = []; return;
    }
    const headerCells = parseRow(nonSep[0]);
    let html = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
    headerCells.forEach(c => { html += `<th>${c}</th>`; });
    html += '</tr></thead>';
    if (nonSep.length > 1) {
      html += '<tbody>';
      nonSep.slice(1).forEach(row => {
        html += '<tr>';
        parseRow(row).forEach(c => { html += `<td>${c}</td>`; });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table></div>';
    processed.push(html);
    tableLines = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isTableRow(line)) { flushList(); flushCards(); tableLines.push(line); i++; continue; }
    else if (tableLines.length) flushTable();

    const nextLine = lines[i + 1] ?? '';

    // Card detection — handles [Image, Text] or [Text, Image]
    if (isImgLine(line)) {
      flushList();
      const hasDesc = nextLine.trim() !== '' && !isImgLine(nextLine) && !nextLine.match(/^#{1,4} /);
      const afterNext = lines[i + 2] ?? '';
      const hasExtra = hasDesc && afterNext.trim() !== '' && !isImgLine(afterNext) && !afterNext.match(/^#{1,4} /);
      cardBuffer.push({ img: line, desc: hasDesc ? nextLine : '', extra: hasExtra ? afterNext : '' });
      i += hasExtra ? 3 : (hasDesc ? 2 : 1);
      continue;
    } else if (line.trim() !== '' && !line.match(/^#{1,4} /) && isImgLine(nextLine)) {
      // Text before image case
      flushList();
      cardBuffer.push({ img: nextLine, desc: line, extra: '' });
      i += 2;
      continue;
    }

    // Flush cards if we hit something else (that isn't a blank line or partial image)
    const isPartialImageToken = line.startsWith('[') && !line.includes(']');
    if (cardBuffer.length && line.trim() !== '' && !isPartialImageToken) flushCards();

    if (line.match(/^#{4} (.+)/))      { flushList(); processed.push(`<h4 class="md-h4">${line.replace(/^#{4} /, '')}</h4>`); i++; continue; }
    if (line.match(/^### (.+)/))   { flushList(); processed.push(`<h3 class="md-h3">${line.replace(/^### /, '')}</h3>`); i++; continue; }
    if (line.match(/^## (.+)/))    { flushList(); processed.push(`<h2 class="md-h2">${line.replace(/^## /, '')}</h2>`); i++; continue; }
    if (line.match(/^# (.+)/))     { flushList(); processed.push(`<h1 class="md-h1">${line.replace(/^# /, '')}</h1>`); i++; continue; }
    if (line.match(/^&gt;\s+(.+)/)) { flushList(); processed.push(`<blockquote class="md-blockquote">${line.replace(/^&gt;\s+/, '')}</blockquote>`); i++; continue; }

    const uMatch = line.match(/^[-*•]\s+(.+)/);
    if (uMatch) { if (inOrderedList) flushList(); inList = true; listItems.push(uMatch[1]); i++; continue; }

    const oMatch = line.match(/^\d+\.\s+(.+)/);
    if (oMatch) { if (inList) flushList(); inOrderedList = true; listItems.push(oMatch[1]); i++; continue; }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) { flushList(); processed.push('<hr class="md-hr"/>'); i++; continue; }
    if (line.trim() === '') { 
      if (cardBuffer.length) { i++; continue; } // Suppress blank lines if inside a menu card block
      flushList(); processed.push('<div class="line-break"></div>'); i++; continue; 
    }

    if (isPartialImageToken) { i++; continue; } // Prevent partial tokens from rendering as text and breaking layout

    flushList();
    processed.push(`<p class="md-p">${line}</p>`);
    i++;
  }

  flushList();
  flushCards();
  if (tableLines.length) flushTable();
  return processed.join('');
}
