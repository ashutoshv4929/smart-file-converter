import { promises as fs } from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import libre from 'libreoffice-convert';
import { promisify } from 'util';

// Load environment variables from .env file
dotenv.config();

const libreConvert = promisify(libre.convert);

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads');
  }
}

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists before setting up router
ensureUploadsDir().then(() => {
  // --- UTILITY FUNCTIONS ---
  function validateFileType(file: Express.Multer.File, allowedTypes: string[]) {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (!allowedTypes.includes(ext)) {
      throw new Error(`Unsupported file type: .${ext}. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  async function convertWithLibreOffice(inputPath: string, outputFormat: string): Promise<string> {
    console.log(`Starting conversion: ${inputPath} to ${outputFormat}`);
    try {
      const input = await fs.readFile(inputPath);
      console.log(`Read input file (${input.length} bytes)`);

      const output = await libreConvert(input, `.${outputFormat}`, undefined);
      console.log(`Conversion successful (${output.length} bytes output)`);

      const outputFilename = `${path.basename(inputPath, path.extname(inputPath))}.${outputFormat}`;
      const outputPath = path.join('uploads', outputFilename);
      await fs.writeFile(outputPath, output);
      console.log(`Output saved: ${outputPath}`);

      return outputPath;
    } catch (err) {
      console.error('LibreOffice conversion failed:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      throw new Error(`Conversion failed: ${errorMessage}`);
    }
  }

  // --- API ENDPOINT ---
  router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
    const inputFile = req.file;
    if (!inputFile) return res.status(400).json({ message: 'No file uploaded.' });

    let tempConvertedPath: string | null = null;
    try {
      const { conversionType } = req.body;
      let resultBuffer: Buffer;
      let resultMime = 'application/octet-stream';
      let resultFilename = `${path.parse(inputFile.originalname).name}_converted`;

      switch (conversionType) {
        case 'word-to-pdf':
          validateFileType(inputFile, ['doc', 'docx', 'odt']);
          tempConvertedPath = await convertWithLibreOffice(inputFile.path, 'pdf');
          resultBuffer = await fs.readFile(tempConvertedPath);
          resultMime = 'application/pdf';
          resultFilename += '.pdf';
          break;

        case 'pdf-to-word':
          validateFileType(inputFile, ['pdf']);
          tempConvertedPath = await convertWithLibreOffice(inputFile.path, 'docx');
          resultBuffer = await fs.readFile(tempConvertedPath);
          resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          resultFilename += '.docx';
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
      try {
        if (inputFile) await fs.unlink(inputFile.path);
        if (tempConvertedPath) await fs.unlink(tempConvertedPath);
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr);
      }
    }
  });
});

export default router;
