import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import sharp from 'sharp';
import pdf from 'pdf-parse';

// Load environment variables from .env file
dotenv.config();

// --- CONFIGURATION ---
const ILOVEPDF_API_KEY = process.env.ILOVEPDF_API_KEY;

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- UTILITY FUNCTIONS ---

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.log(`Retrying... attempts left: ${retries}`);
    await new Promise(res => setTimeout(res, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

function validateFileType(file: Express.Multer.File, allowedTypes: string[]) {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!allowedTypes.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    if (words.length === 0) return [' '];
    const lines: string[] = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + ' ' + word, fontSize);
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// --- CORE CONVERSION LOGIC ---

async function convertWithILovePDF(inputPath: string, tool: string, outputFilename: string): Promise<string> {
  if (!ILOVEPDF_API_KEY) {
    throw new Error('iLovePDF API key is not configured. Please set the ILOVEPDF_API_KEY environment variable on your server.');
  }

  return withRetry(async () => {
    try {
      const startRes = await axios.post(`https://api.ilovepdf.com/v1/start/${tool}`, {}, { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } });
      const { server, task } = startRes.data;
      const form = new FormData();
      form.append('task', task);
      form.append('file', fs.createReadStream(inputPath));
      await axios.post(`https://${server}/v1/upload`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${ILOVEPDF_API_KEY}` } });
      await axios.post(`https://${server}/v1/process`, { task, tool }, { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } });
      const downloadRes = await axios.get(`https://api.ilovepdf.com/v1/download/${task}`, { responseType: 'stream', headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } });
      const outputPath = path.join('uploads', outputFilename);
      const writer = fs.createWriteStream(outputPath);
      downloadRes.data.pipe(writer);
      return new Promise<string>((resolve, reject) => {
        writer.on('finish', () => resolve(outputPath));
        writer.on('error', reject);
      });
    } catch (err: any) {
      if (err.response?.status === 401) throw new Error('Invalid iLovePDF API key.');
      throw new Error(err.response?.data?.error?.message || err.message);
    }
  });
}

async function textToDocx(text: string): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: text.split('\n').map(line => new Paragraph({ children: [new TextRun(line || ' ')] })) }] });
  return Packer.toBuffer(doc);
}

async function textToPdf(text: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const maxWidth = width - 2 * margin;
    let y = height - margin;
    for (const line of text.split('\n')) {
        const wrappedLines = wrapText(line, font, fontSize, maxWidth);
        for (const wrapped of wrappedLines) {
            if (y < margin) {
                page = pdfDoc.addPage([595.28, 841.89]);
                y = height - margin;
            }
            page.drawText(wrapped, { x: margin, y, font, size: fontSize });
            y -= fontSize + 4;
        }
    }
    return pdfDoc.save();
}

async function extractTextFromPdf(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

// --- API ENDPOINT ---

router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
  const inputFile = req.file;
  if (!inputFile) return res.status(400).json({ message: 'No file uploaded.' });

  let tempConvertedPath: string | null = null;
  try {
    const { conversionType, targetFormat } = req.body;
    let resultBuffer: Buffer | Uint8Array;
    let resultMime = 'application/octet-stream';
    let resultFilename = `${path.parse(inputFile.originalname).name}_converted.${targetFormat}`;

    switch (conversionType) {
        case 'word-to-pdf':
            validateFileType(inputFile, ['doc', 'docx', 'odt']);
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'wordpdf', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/pdf';
            break;

        case 'pdf-to-word':
            validateFileType(inputFile, ['pdf']);
            // This is a "PDF to Word" conversion, but the UI says "PDF Converter" to "Word or Text"
            // We will assume PDF to Word for now.
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'pdfword', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
            
        case 'pdf-to-text':
            validateFileType(inputFile, ['pdf']);
            const extractedText = await extractTextFromPdf(inputFile.path);
            resultBuffer = Buffer.from(extractedText, 'utf-8');
            resultMime = 'text/plain';
            resultFilename = `${path.parse(inputFile.originalname).name}_extracted.txt`;
            break;

        case 'image-to-pdf':
            validateFileType(inputFile, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']);
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'imagepdf', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/pdf';
            break;

        case 'ocr-extract': // This corresponds to "Extract Text" in your UI
            validateFileType(inputFile, ['png', 'jpg', 'jpeg', 'bmp']);
            const processedImageBuffer = await sharp(inputFile.path).grayscale().toBuffer();
            const { data: { text } } = await Tesseract.recognize(processedImageBuffer, 'eng');
            if (targetFormat === 'docx') {
                resultBuffer = await textToDocx(text);
                resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else { // Default to text
                resultBuffer = Buffer.from(text, 'utf-8');
                resultMime = 'text/plain';
                resultFilename = `${path.parse(inputFile.originalname).name}_extracted.txt`;
            }
            break;
            
        // Handling the "Doc to PDF" button which also accepts Text files
        case 'doc-to-pdf':
            const ext = path.extname(inputFile.originalname).toLowerCase().slice(1);
            if (['doc', 'docx', 'odt'].includes(ext)) {
                 tempConvertedPath = await convertWithILovePDF(inputFile.path, 'wordpdf', resultFilename);
                 resultBuffer = fs.readFileSync(tempConvertedPath);
            } else if (ext === 'txt') {
                 const textContent = fs.readFileSync(inputFile.path, 'utf-8');
                 resultBuffer = await textToPdf(textContent);
            } else {
                throw new Error('Unsupported file type for this conversion.');
            }
            resultMime = 'application/pdf';
            break;

        default:
            return res.status(400).json({ message: `Unsupported conversion type: ${conversionType}` });
    }

    res.setHeader('Content-Type', resultMime);
    res.setHeader('Content-Disposition', `attachment; filename="${resultFilename}"`);
    res.send(resultBuffer);

  } catch (err: any) {
    console.error('Conversion failed:', err);
    res.status(500).json({ message: 'Conversion failed', error: err.message });
  } finally {
    if (inputFile && fs.existsSync(inputFile.path)) fs.unlinkSync(inputFile.path);
    if (tempConvertedPath && fs.existsSync(tempConvertedPath)) fs.unlinkSync(tempConvertedPath);
  }
});

export default router;
