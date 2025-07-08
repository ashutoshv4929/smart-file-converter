import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import FormData from 'form-data';

const ILOVEPDF_API_KEY = 'secret_key_3a6626f95c00ef97e3cddfe6c802285b_6Va8Vb384c93499d48d08e9be6f70e8524696';

async function wordToPdfWithILovePDF(inputPath: string, outputPath: string) {
  // (as before)
}

// PDF to Word (DOCX) conversion using iLovePDF
async function pdfToWordWithILovePDF(inputPath: string, outputPath: string) {
  try {
    const startRes = await axios.post(
      'https://api.ilovepdf.com/v1/start/pdfword',
      {},
      { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('start/pdfword status:', startRes.status, startRes.statusText);
    const { server, task } = startRes.data;
    const form = new FormData();
    form.append('task', task);
    form.append('file', fs.createReadStream(inputPath));
    const uploadRes = await axios.post(
      `https://${server}/v1/upload`,
      form,
      { headers: { ...form.getHeaders(), Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('upload status:', uploadRes.status, uploadRes.statusText);
    const processRes = await axios.post(
      `https://${server}/v1/process`,
      { task, tool: 'pdfword' },
      { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('process status:', processRes.status, processRes.statusText);
    const downloadRes = await axios.get(
      `https://${server}/v1/download/${task}`,
      { responseType: 'stream', headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('download status:', downloadRes.status, downloadRes.statusText);
    if (downloadRes.headers['content-type'] !== 'application/pdf') {
      console.error('Download response is not PDF:', downloadRes.headers);
    }
    const writer = fs.createWriteStream(outputPath);
    downloadRes.data.pipe(writer);
    return new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error in pdfToWordWithILovePDF:', error);
    throw error;
  }
}

// Image to PDF conversion using iLovePDF
async function imageToPdfWithILovePDF(inputPath: string, outputPath: string) {
  try {
    const startRes = await axios.post(
      'https://api.ilovepdf.com/v1/start/imagepdf',
      {},
      { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('start/imagepdf status:', startRes.status, startRes.statusText);
    const { server, task } = startRes.data;
    const form = new FormData();
    form.append('task', task);
    form.append('file', fs.createReadStream(inputPath));
    const uploadRes = await axios.post(
      `https://${server}/v1/upload`,
      form,
      { headers: { ...form.getHeaders(), Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('upload status:', uploadRes.status, uploadRes.statusText);
    const processRes = await axios.post(
      `https://${server}/v1/process`,
      { task, tool: 'imagepdf' },
      { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('process status:', processRes.status, processRes.statusText);
    const downloadRes = await axios.get(
      `https://${server}/v1/download/${task}`,
      { responseType: 'stream', headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
    );
    console.log('download status:', downloadRes.status, downloadRes.statusText);
    if (downloadRes.headers['content-type'] !== 'application/pdf') {
      console.error('Download response is not PDF:', downloadRes.headers);
    }
    const writer = fs.createWriteStream(outputPath);
    downloadRes.data.pipe(writer);
    return new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('imageToPdfWithILovePDF error:', error);
    throw error;
  }
}

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
  console.log('textToPdf input:', text); // <-- Debug log
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
      // PDF to DOCX using iLovePDF API
      const inputPath = file.path;
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.docx');
      await pdfToWordWithILovePDF(inputPath, outputPath);
      resultBuffer = fs.readFileSync(outputPath);
      resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fs.unlinkSync(outputPath);
    } else if (conversionType === 'word-to-pdf') {
      // DOCX to PDF using iLovePDF API
      const inputPath = file.path;
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.pdf');
      await wordToPdfWithILovePDF(inputPath, outputPath);
      if (!fs.existsSync(outputPath)) {
        console.error('PDF file nahi mili:', outputPath);
        return res.status(500).json({ message: 'PDF file nahi mili' });
      }
      const stats = fs.statSync(outputPath);
      console.log('PDF file size (bytes):', stats.size);
      if (stats.size === 0) {
        console.error('PDF file size 0 hai:', outputPath);
        return res.status(500).json({ message: 'PDF file size 0 hai' });
      }
      resultBuffer = fs.readFileSync(outputPath);
      resultMime = 'application/pdf';
      fs.unlinkSync(outputPath); // Clean up
    } else if (conversionType === 'text-to-pdf') {
      // TXT to PDF
      const text = fs.readFileSync(file.path, 'utf-8');
      resultBuffer = await textToPdf(text);
      resultMime = 'application/pdf';
    } else if (conversionType === 'image-to-pdf') {
      // Image to PDF using iLovePDF API
      const inputPath = file.path;
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.pdf');
      await imageToPdfWithILovePDF(inputPath, outputPath);
      resultBuffer = fs.readFileSync(outputPath);
      resultMime = 'application/pdf';
      fs.unlinkSync(outputPath);
    } else if (conversionType === 'ocr-extract') {
      // OCR Extraction
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
  // Use pdf-parse for accurate PDF text extraction
  const data = await pdfParse(buffer);
  return data.text;
}

export default router;