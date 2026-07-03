const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;

const escapePdfText = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?');

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const wrapText = (text = '', maxChars = 72) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
};

const renderLine = (lines, text, indent = 0) => {
  const prefix = ' '.repeat(indent);
  wrapText(text).forEach((line) => lines.push(prefix + line));
};

const buildPdf = (lines) => {
  const objects = [];
  const pageObjectIds = [];
  const fontObjectId = 3 + Math.ceil(lines.length / 40) * 2 + 1;
  const pages = [];
  const maxLinesPerPage = 38;

  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  pages.forEach((pageLines, idx) => {
    const pageId = 3 + idx * 2;
    const contentId = 4 + idx * 2;
    pageObjectIds.push(pageId);

    const content = [
      'BT',
      '/F1 10 Tf',
      `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`,
      ...pageLines.map((line, lineIdx) => {
        const escaped = escapePdfText(line);
        if (lineIdx === 0) return `(${escaped}) Tj`;
        return `T* (${escaped}) Tj`;
      }),
      'ET',
    ].join('\n');

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets[i + 1] = pdf.length;
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
};

const buildReportLines = ({ title, subtitle, logoLabel, sections }) => {
  const lines = [];
  lines.push(title);
  lines.push(subtitle);
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  if (logoLabel) lines.push(`Logo: ${logoLabel}`);
  lines.push('');

  sections.forEach((section) => {
    lines.push(section.heading);
    lines.push('-'.repeat(Math.min(48, section.heading.length)));
    section.items.forEach((item) => {
      if (typeof item === 'string') {
        renderLine(lines, item, 2);
      } else if (item && typeof item === 'object') {
        renderLine(lines, `${item.label}: ${item.value}`, 2);
      }
    });
    lines.push('');
  });

  return lines;
};

export const downloadPdfReport = (filename, report = {}) => {
  const {
    title = 'Church Report',
    subtitle = '',
    logoUrl = '/images/logo.png',
    sections = [],
  } = report || {};

  const logoLabel = logoUrl ? 'Eternal Love Church logo' : '';
  const lines = buildReportLines({ title, subtitle, logoLabel, sections });
  const pdfContent = buildPdf(lines);
  const blob = new Blob([new TextEncoder().encode(pdfContent)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const wrapPdfText = wrapText;
