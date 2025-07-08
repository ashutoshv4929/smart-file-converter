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

// Load environment variables from .env file
dotenv.config();

// --- CONFIGURATION ---
// It's highly recommended to store your API key in an environment variable.
const ILOVEPDF_API_KEY = process.env.ILOVEPDF_API_KEY || 'YOUR_ILOVEPDF_API_KEY_HERE';

const app = express();
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- UTILITY FUNCTIONS ---

/**
 * A retry wrapper with exponential backoff for resilient API calls.
 * @param fn The async function to execute.
 * @param retries Number of retries left.
 * @param delay Delay between retries in ms.
 * @returns The result of the async function.
 */
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

/**
 * Validates the file extension against a list of allowed types.
 * @param file The uploaded file from Multer.
 * @param allowedTypes An array of allowed extensions (e.g., ['pdf', 'docx']).
 */
function validateFileType(file: Express.Multer.File, allowedTypes: string[]) {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!allowedTypes.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

/**
 * A simple text wrapper to prevent text from overflowing in the generated PDF.
 * @param text The input text.
 * @param font The font used for measuring text width.
 * @param fontSize The size of the font.
 * @param maxWidth The maximum width of a line.
 * @returns An array of strings, where each string is a line.
 */
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

/**
 * Generic converter using the iLovePDF API for various tasks.
 * @param inputPath The path to the local file to be converted.
 * @param tool The iLovePDF tool to use (e.g., 'wordpdf', 'pdfword', 'imagepdf').
 * @param outputFilename The desired name for the output file.
 * @returns The path to the converted file downloaded locally.
 */
async function convertWithILovePDF(inputPath: string, tool: string, outputFilename: string): Promise<string> {
  return withRetry(async () => {
    try {
      // 1. Start the task to get the server and task ID
      const startRes = await axios.post(
        `https://api.ilovepdf.com/v1/start/${tool}`,
        {},
        { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
      );
      const { server, task } = startRes.data;
      console.log(`iLovePDF task started on server: ${server}`);

      // 2. Upload the file to the specified server
      const form = new FormData();
      form.append('task', task);
      form.append('file', fs.createReadStream(inputPath));
      await axios.post(
        `https://${server}/v1/upload`,
        form,
        { headers: { ...form.getHeaders(), Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
      );
      console.log(`File uploaded successfully for task: ${task}`);

      // 3. Process the file
      await axios.post(
        `https://${server}/v1/process`,
        { task, tool },
        { headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
      );
      console.log(`File processing started for task: ${task}`);

      // 4. Download the resulting file
      const downloadRes = await axios.get(
        `https://${server}/v1/download/${task}`,
        { responseType: 'stream', headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` } }
      );
      console.log(`Downloading result for task: ${task}`);

      const outputPath = path.join('uploads', outputFilename);
      const writer = fs.createWriteStream(outputPath);
      downloadRes.data.pipe(writer);

      return new Promise<string>((resolve, reject) => {
        writer.on('finish', () => {
          if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            reject(new Error('Downloaded file is empty or missing.'));
          } else {
            console.log(`File successfully downloaded to: ${outputPath}`);
            resolve(outputPath);
          }
        });
        writer.on('error', reject);
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error('Invalid API key - please check your iLovePDF credentials.');
      }
      if (err.response?.status === 429) {
        throw new Error('API rate limit exceeded - please try again later.');
      }
      const errorMessage = err.response?.data?.error?.message || err.message;
      throw new Error(`iLovePDF API Error: ${errorMessage}`);
    }
  });
}

/**
 * Converts a plain text string into a DOCX file buffer.
 * @param text The input text string.
 * @returns A Promise resolving to a Buffer containing the DOCX file.
 */
async function textToDocx(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line => new Paragraph({ children: [new TextRun(line || ' ')] })),
    }],
  });
  return Packer.toBuffer(doc);
}

/**
 * Converts a plain text string into a PDF file buffer, with line wrapping.
 * @param text The input text string.
 * @returns A Promise resolving to a Uint8Array containing the PDF file.
 */
async function textToPdf(text: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Use a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const maxWidth = width - 2 * margin;
    let y = height - margin;

    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
        // Wrap text for each paragraph
        const wrappedLines = wrapText(paragraph, font, fontSize, maxWidth);
        
        for (const line of wrappedLines) {
            // Add a new page if the current one is full
            if (y < margin) {
                page = pdfDoc.addPage([595.28, 841.89]);
                y = height - margin;
            }
            page.drawText(line, { x: margin, y, font, size: fontSize, color: { type: 'RGB', red: 0, green: 0, blue: 0 } });
            y -= fontSize + 4; // Line spacing
        }
        y -= 6; // Add extra space between paragraphs
    }
    return pdfDoc.save();
}

// --- API ENDPOINTS ---

/**
 * @route POST /api/convert
 * @description Main endpoint for all file conversions.
 */
router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
  const inputFile = req.file;
  if (!inputFile) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  let tempConvertedPath: string | null = null;

  try {
    const { conversionType, targetFormat } = req.body;
    
    if (!conversionType || !targetFormat) {
        return res.status(400).json({ message: 'Missing conversionType or targetFormat in request body.' });
    }

    let resultBuffer: Buffer | Uint8Array;
    let resultMime = 'application/octet-stream';
    let resultFilename = `${path.parse(inputFile.originalname).name}_converted.${targetFormat}`;

    console.log(`Received request for ${conversionType} to ${targetFormat}`);

    // --- Conversion Routing ---
    switch (conversionType) {
        case 'word-to-pdf':
            validateFileType(inputFile, ['doc', 'docx', 'odt']);
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'wordpdf', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/pdf';
            break;

        case 'pdf-to-word':
            validateFileType(inputFile, ['pdf']);
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'pdfword', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;

        case 'image-to-pdf':
            validateFileType(inputFile, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']);
            tempConvertedPath = await convertWithILovePDF(inputFile.path, 'imagepdf', resultFilename);
            resultBuffer = fs.readFileSync(tempConvertedPath);
            resultMime = 'application/pdf';
            break;

        case 'text-to-pdf':
            validateFileType(inputFile, ['txt']);
            const textContent = fs.readFileSync(inputFile.path, 'utf-8');
            resultBuffer = await textToPdf(textContent);
            resultMime = 'application/pdf';
            break;

        case 'ocr-extract':
            validateFileType(inputFile, ['png', 'jpg', 'jpeg', 'bmp']);
            // Pre-process image with sharp for better OCR accuracy
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

        default:
            return res.status(400).json({ message: `Unsupported conversion type: ${conversionType}` });
    }

    // Send the converted file to the client
    res.setHeader('Content-Type', resultMime);
    res.setHeader('Content-Disposition', `attachment; filename="${resultFilename}"`);
    res.send(resultBuffer);

  } catch (err: any) {
    console.error('Conversion failed:', err);
    res.status(500).json({
      message: 'Conversion failed',
      error: err.message || 'An unknown error occurred.',
    });
  } finally {
    // --- Cleanup ---
    // Delete the original uploaded file
    if (inputFile && fs.existsSync(inputFile.path)) {
      fs.unlinkSync(inputFile.path);
      console.log(`Cleaned up original file: ${inputFile.path}`);
    }
    // Delete the temporary converted file (if one was created)
    if (tempConvertedPath && fs.existsSync(tempConvertedPath)) {
      fs.unlinkSync(tempConvertedPath);
      console.log(`Cleaned up temporary converted file: ${tempConvertedPath}`);
    }
  }
});

/**
 * @route GET /api/test-conversion
 * @description A self-contained test endpoint for TXT to PDF conversion.
 */
router.get('/api/test-conversion', async (req: Request, res: Response) => {
  try {
    console.log('Running test conversion: TXT to PDF');
    const testContent = 'This is a test document for conversion.\nIt should appear on a PDF and this line should wrap properly if it gets long enough to exceed the page margins.';
    const pdfBuffer = await textToPdf(testContent);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).send('Test conversion failed - no output buffer');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.send(Buffer.from(pdfBuffer));
    console.log('Test conversion successful.');
  } catch (err: any) {
    console.error('Test conversion failed:', err);
    res.status(500).send(`Test conversion failed: ${err.message}`);
  }
});

/**
 * @route GET /api/health
 * @description Health check endpoint to verify iLovePDF API key and status.
 */
router.get('/api/health', async (req: Request, res: Response) => {
  try {
    // iLovePDF doesn't have a generic /info endpoint, so we test the 'start' endpoint
    // which is a good proxy for API key validity and service health.
    await axios.post('https://api.ilovepdf.com/v1/start/imagepdf', {}, {
      headers: { Authorization: `Bearer ${ILOVEPDF_API_KEY}` }
    });
    res.json({ status: 'active', message: 'iLovePDF API is reachable and key seems valid.' });
  } catch (err: any) {
    console.error('API Health Check Failed:', err.message);
    if (err.response?.status === 401) {
        return res.status(401).json({ status: 'error', message: 'iLovePDF API key is invalid.' });
    }
    res.status(500).json({
      status: 'error',
      message: 'Could not connect to iLovePDF API.',
      details: err.message,
    });
  }
});

// Use the router in the main app
app.use(router);

// Export the app for use in a server file or for testing
export default app;

// Example of how to start the server (e.g., in a server.ts file)
/*
import app from './your-file-name';
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
*/
