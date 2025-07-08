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
import dotenv from 'dotenv';
dotenv.config();
import libreOfficeConvert from 'libreoffice-convert';
import { promisify } from 'util';
const convertAsync = promisify(libreOfficeConvert.convert);

const ILOVEPDF_API_KEY = process.env.ILOVEPDF_API_KEY || 'secret_key_3a6626f95c00ef97e3cddfe6c802285b_6Va8Vb384c93499d48d08e9be6f70e8524696';

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(res => setTimeout(res, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

function validateFileType(file: Express.Multer.File, allowedTypes: string[]) {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!allowedTypes.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

// Use LibreOffice for document conversion
async function convertWithLibreOffice(inputPath: string, outputPath: string, format: string) {
  try {
    console.log(`Starting LibreOffice conversion: ${inputPath} -> ${outputPath} (${format})`);
    
    // Read input file
    const inputBuffer = fs.readFileSync(inputPath);
    
    // Perform conversion
    const outputBuffer = await convertAsync(inputBuffer, '.pdf', undefined);
    
    // Write output
    fs.writeFileSync(outputPath, outputBuffer);
    
    console.log(`LibreOffice conversion completed successfully`);
    
    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file not created: ${outputPath}`);
    }
    
    // Check file size
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error(`Output file is empty: ${outputPath}`);
    }
    
    console.log(`Conversion successful. File size: ${stats.size} bytes`);
  } catch (err) {
    console.error('LibreOffice conversion error:', err);
    throw new Error(`Conversion failed: ${err.message}`);
  }
}

async function imageToPdfWithILovePDF(inputPath: string, outputPath: string) {
  return withRetry(async () => {
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
    } catch (err) {
      if (err.response?.status === 401) {
        throw new Error('Invalid API key - please check your iLovePDF credentials');
      }
      if (err.response?.status === 429) {
        throw new Error('API rate limit exceeded - please try again later');
      }
      throw new Error(`Conversion failed: ${err.response?.data?.error || err.message}`);
    }
  });
}

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

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Main conversion endpoint
router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { conversionType, targetFormat } = req.body;
    const file = req.file;
    
    if (!file) return res.status(400).json({ message: 'No file uploaded' });
    
    // Validate file type based on conversion
    if (conversionType === 'word-to-pdf') {
      validateFileType(file, ['doc', 'docx', 'odt']);
    } else if (conversionType === 'pdf-to-word') {
      validateFileType(file, ['pdf']);
    } else if (conversionType === 'image-to-pdf') {
      validateFileType(file, ['jpg', 'jpeg', 'png', 'gif', 'bmp']);
    }
    
    let resultBuffer: Buffer | Uint8Array;
    let resultMime = 'application/octet-stream';
    let filename = path.parse(file.originalname).name + '_converted.' + targetFormat;

    // Conversion logic
    if (conversionType === 'word-to-pdf') {
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.pdf');
      console.log(`Starting word-to-pdf conversion: ${file.path} -> ${outputPath}`);
      await convertWithLibreOffice(file.path, outputPath, 'pdf');
      console.log(`Word-to-pdf conversion completed successfully`);
      resultBuffer = fs.readFileSync(outputPath);
      resultMime = 'application/pdf';
      filename = path.parse(file.originalname).name + '_converted.pdf';
    } else if (conversionType === 'pdf-to-word') {
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.docx');
      console.log(`Starting pdf-to-word conversion: ${file.path} -> ${outputPath}`);
      await convertWithLibreOffice(file.path, outputPath, 'docx');
      console.log(`Pdf-to-word conversion completed successfully`);
      resultBuffer = fs.readFileSync(outputPath);
      resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = path.parse(file.originalname).name + '_converted.docx';
    } else if (conversionType === 'image-to-pdf') {
      const inputPath = file.path;
      const outputPath = path.join('uploads', path.parse(file.originalname).name + '_converted.pdf');
      console.log(`Starting image-to-pdf conversion: ${inputPath} -> ${outputPath}`);
      try {
        await imageToPdfWithILovePDF(inputPath, outputPath);
        console.log(`Image-to-pdf conversion completed successfully`);
        if (!fs.existsSync(outputPath)) {
          console.error('PDF file nahi mili:', outputPath);
          return res.status(500).json({ message: 'PDF file nahi mili' });
        }
        const stats = fs.statSync(outputPath);
        if (stats.size === 0) {
          console.error('PDF file size 0 hai:', outputPath);
          return res.status(500).json({ message: 'PDF file size 0 hai' });
        }
        resultBuffer = fs.readFileSync(outputPath);
        resultMime = 'application/pdf';
      } finally {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    } else if (conversionType === 'text-to-pdf') {
      // TXT to PDF
      console.log(`Starting text-to-pdf conversion: ${file.path}`);
      try {
        const text = fs.readFileSync(file.path, 'utf-8');
        resultBuffer = await textToPdf(text);
        console.log(`Text-to-pdf conversion completed successfully`);
        if (!resultBuffer || resultBuffer.length === 0) {
          return res.status(500).json({ message: 'PDF conversion failed (empty output)' });
        }
        resultMime = 'application/pdf';
      } catch (err) {
        console.error('Text to PDF conversion error:', err);
        return res.status(500).json({ message: 'Text to PDF conversion failed', error: err.message });
      }
    } else if (conversionType === 'ocr-extract') {
      // OCR Extraction with basic preprocessing
      console.log(`Starting OCR extraction: ${file.path}`);
      const sharp = require('sharp');
      let imgBuffer = fs.readFileSync(file.path);
      try {
        // Basic preprocessing: grayscale + resize (if large)
        imgBuffer = await sharp(imgBuffer).grayscale().toBuffer();
      } catch (err) {
        console.warn('Image preprocessing failed, proceeding with original image. Error:', err.message);
      }
      try {
        const { data: { text } } = await Tesseract.recognize(imgBuffer, 'eng');
        console.log(`OCR extraction completed successfully`);
        if (targetFormat === 'docx') {
          resultBuffer = await textToDocx(text);
          resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else {
          resultBuffer = Buffer.from(text, 'utf-8');
          resultMime = 'text/plain';
        }
      } catch (err) {
        console.error('OCR extraction failed:', err);
        return res.status(500).json({ message: 'OCR extraction failed', error: err.message });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported conversion type' });
    }

    res.setHeader('Content-Type', resultMime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(resultBuffer);
    fs.unlinkSync(file.path); // Clean up uploaded file
  } catch (err) {
    res.status(500).json({ 
      message: 'Conversion failed', 
      error: err.message,
      solution: err.solution || 'Please try again or contact support'
    });
  }
});

// Test conversion endpoint
router.get('/api/test-conversion', async (req: Request, res: Response) => {
  try {
    // Create a test document
    const testContent = 'This is a test document for conversion';
    const inputPath = path.join('uploads', 'test.docx');
    fs.writeFileSync(inputPath, await textToDocx(testContent));
    
    // Convert to PDF
    const outputPath = path.join('uploads', 'test.pdf');
    await convertWithLibreOffice(inputPath, outputPath, 'pdf');
    
    // Verify output
    if (!fs.existsSync(outputPath)) {
      return res.status(500).send('Conversion failed - no output file');
    }
    
    res.sendFile(path.resolve(outputPath));
  } catch (err) {
    res.status(500).send(`Test conversion failed: ${err.message}`);
  }
});

// Health check endpoint for iLovePDF API
router.get('/api/health', async (req: Request, res: Response) => {
  try {
    const testRes = await axios.get('https://api.ilovepdf.com/v1/info', {
      headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` }
    });
    
    if (testRes.status === 200) {
      res.json({ 
        status: 'active', 
        plan: testRes.data.plan,
        remaining: testRes.data.remaining
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: 'API returned non-200 status',
        statusCode: testRes.status
      });
    }
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: err.message,
      response: err.response?.data
    });
  }
});

// Helper: Extract text from PDF
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Use pdf-parse for accurate PDF text extraction
  const data = await pdfParse(buffer);
  return data.text;
}

export default router;