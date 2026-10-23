import { jsPDF } from 'jspdf';

export default class ConsentPdfDocument {
  constructor() { this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true }); this.y = 20; this.started = false; this.context = ''; }
  page() {
    this.doc.addPage(); this.y = 20;
    this.text('40th Rochdale (Syke) Scouts - continued', { size: 10, bold: true });
    this.text(this.context, { size: 10 }); this.y += 3;
  }
  start(context) {
    if (this.started) this.doc.addPage();
    this.started = true; this.y = 20; this.context = context;
    this.text('40th Rochdale (Syke) Scouts', { size: 12, bold: true });
  }
  text(value, { size = 10, bold = false } = {}) {
    const doc = this.doc, lineHeight = size * 0.3528 * 1.5;
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(value ?? '').replace(/\r\n/g, '\n'), 174);
    for (const line of lines) {
      if (this.y + lineHeight > 275) { this.page(); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); }
      doc.text(line, 18, this.y); this.y += lineHeight;
    }
    this.y += 2;
  }
  async signature(source) {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('A signature image could not be read. Please try again.')); img.src = source;
    });
    const width = Math.min(100, 42 * image.width / image.height), height = width * image.height / image.width;
    if (this.y + height + 12 > 275) this.page();
    this.text('Signature', { bold: true });
    this.doc.addImage(image, 'PNG', 18, this.y, width, height); this.y += height + 5;
  }
  save(filename) {
    const total = this.doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      this.doc.setPage(page); this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(8);
      this.doc.text(`Page ${page} of ${total} | Consent records - keep confidential`, 18, 287);
    }
    this.doc.save(filename);
  }
}