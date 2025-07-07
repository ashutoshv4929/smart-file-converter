import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Tesseract from 'tesseract.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Utility: Convert text to DOCX
async function textToDocx(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line => new Paragraph({ children: [new TextRun(line || ' ')] })),
    }],
  });
  return await Packer.toBuffer(doc);
}

// Utility: Convert text to PDF
async function textToPdf(text: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontSize = 12;
  const margin = 40;
  let y = page.getSize().height - margin;
  const lines = text.split('\n');
  for (const line of lines) {
    page.drawText(line, { x: margin, y, size: fontSize });
    y -= fontSize + 4;
    if (y < margin) {
      y = page.getSize().height - margin;
      pdfDoc.addPage([595.28, 841.89]);
    }
  }
  return await pdfDoc.save();
}

// Main conversion endpoint
router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { conversionType, targetFormat } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });
    let resultBuffer: Buffer | Uint8Array;
    let resultMime = 'application/octet-stream';
    let filename = path.parse(file.originalname).name + '_converted.' + targetFormat;

    // Conversion logic
    if (conversionType === 'pdf-to-word') {
      // PDF to DOCX or TXT
      const pdfBuffer = fs.readFileSync(file.path);
      const text = await extractTextFromPdf(pdfBuffer);
      if (targetFormat === 'docx') {
        resultBuffer = await textToDocx(text);
        resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        resultBuffer = Buffer.from(text, 'utf-8');
        resultMime = 'text/plain';
      }
    } else if (conversionType === 'word-to-pdf') {
      // DOCX to PDF
      const docxBuffer = fs.readFileSync(file.path);
      const { value: text } = await mammoth.extractRawText({ buffer: docxBuffer });
      resultBuffer = await textToPdf(text);
      resultMime = 'application/pdf';
    } else if (conversionType === 'text-to-pdf') {
      // TXT to PDF
      const text = fs.readFileSync(file.path, 'utf-8');
      resultBuffer = await textToPdf(text);
      resultMime = 'application/pdf';
    } else if (conversionType === 'image-to-pdf') {
      // Image to PDF
      const pdfDoc = await PDFDocument.create();
      const imgBuffer = fs.readFileSync(file.path);
      let image;
      if (file.mimetype === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imgBuffer);
      } else if (file.mimetype === 'image/png') {
        image = await pdfDoc.embedPng(imgBuffer);
      } else {
        throw new Error('Unsupported image format');
      }
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      resultBuffer = Buffer.from(await pdfDoc.save());
      resultMime = 'application/pdf';
    } else if (conversionType === 'ocr-extract') {
      // OCR Extract (image to text/docx)
      const imgBuffer = fs.readFileSync(file.path);
      const { data: { text } } = await Tesseract.recognize(imgBuffer, 'eng');
      if (targetFormat === 'docx') {
        resultBuffer = await textToDocx(text);
        resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        resultBuffer = Buffer.from(text, 'utf-8');
        resultMime = 'text/plain';
      }
    } else {
      return res.status(400).json({ message: 'Unsupported conversion type' });
    }

    res.setHeader('Content-Type', resultMime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(resultBuffer);
    fs.unlinkSync(file.path); // Clean up uploaded file
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Conversion failed', error: err.message });
  }
});

// Helper: Extract text from PDF
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // For simplicity, use pdf-lib and extract raw text (improve with pdf-parse if needed)
  const pdfDoc = await PDFDocument.load(buffer);
  let text = '';
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    text += page.getTextContent ? await page.getTextContent() : '';
  }
  return text;
}

export default router;
