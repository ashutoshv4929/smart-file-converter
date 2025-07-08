import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CloudConvert from 'cloudconvert';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

// --- CONFIGURATION ---
// Using the API key you provided. For production, it's best to move this to an environment variable.
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYWVhMzI0NzVmNmY4ZTY4MDQ0ODY4MGFmZTU2OGRmOGVhMjM5NmZhMWQyMmI1NjE0MTg5OGJmYTI1ODdjYjM0YmM3MWQ0NmQ0Yzg5ODU0MjQiLCJpYXQiOjE3NTE5Nzg0ODIuNjYxODM1LCJuYmYiOjE3NTE5Nzg0ODIuNjYxODM2LCJleHAiOjQ5MDc2NTIwODIuNjU3NTczLCJzdWIiOiI3MjM4NjMyNyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.HJlfJEsFVekdLP_Kt_gEEU9p45_zParNNf1p63xN5xHRjKlX-BaXMFKfheD0IauJyc47QFqo-HmbttqwLW12S8Zu-n2aQEcowLU2N39M1L46mMSXCcP6R35FQ3HpR9DKCh7n502gVJRfk9ST-z6aCuwhIQfEuwT8GzyH9lxl5N-4FsIUrSrvdICGyK-OI3Q8pQwS5X90E-7QmLGZH-kFRvxHT7P73N866BfnzV9RALz1tvv044OvzCcNiw8yYSxu0M_TusyL6fCGEmWhZ6diMCKEXSDumC2cB6Fzm2NBPqcsrYk9G2XOn3yQcG7UnSESL1aPo5UgzTSvMjppPMJGLX-FjAEL-9v79n8gqB4h-w-PJ4TVxc201FKZtYaYCd8Y7nRewA4rXblJbuh5FofQgEfLyLZ6hKiXPdyhDi-jVXhtmDS0jXK1SEWE_wLzqFMnFignPz8fZ_FNWeUcu6rdP5AsY1L4IkejfLyfYS2IJSVsUbmkF0taVU4fI0s0Kr2wnJJHgeZtUUe_5l73GtiQa7U2hJfGxxKSR-8xqujtIyklB8ljC6Pjq1FUWwjHrqH_CJv44rroSHx2RUx3Hn4fTmp0L8g0rFJkwRsomsmzkjjtnxrK35mZhAgXZIlx9_3qn1SrApopw37MA7ZlW4nyR4UKzfyDSFBu7_AkKia0jsw';

// Initialize CloudConvert
const cloudConvert = new CloudConvert(CLOUDCONVERT_API_KEY);
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- UTILITY FUNCTION ---

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

// --- API ENDPOINTS ---

/**
 * @route POST /api/convert
 * @description Main endpoint for all file conversions using the CloudConvert API.
 */
router.post('/api/convert', upload.single('file'), async (req: Request, res: Response) => {
  const inputFile = req.file;
  if (!inputFile) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { conversionType, targetFormat } = req.body;
    
    if (!conversionType || !targetFormat) {
        return res.status(400).json({ message: 'Missing conversionType or targetFormat in request body.' });
    }

    let resultMime = 'application/octet-stream';
    let resultFilename = `${path.parse(inputFile.originalname).name}_converted.${targetFormat}`;
    let conversionTaskDefinition = {};

    console.log(`Starting CloudConvert job for ${conversionType} to ${targetFormat}`);

    // --- Define Conversion Task ---
    switch (conversionType) {
        case 'word-to-pdf':
            validateFileType(inputFile, ['doc', 'docx', 'odt']);
            conversionTaskDefinition = { 'convert-file': { operation: 'convert', input: 'import-file', output_format: 'pdf' } };
            resultMime = 'application/pdf';
            break;

        case 'pdf-to-word':
            validateFileType(inputFile, ['pdf']);
            conversionTaskDefinition = { 'convert-file': { operation: 'convert', input: 'import-file', output_format: 'docx' } };
            resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;

        case 'image-to-pdf':
            validateFileType(inputFile, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']);
            conversionTaskDefinition = { 'convert-file': { operation: 'convert', input: 'import-file', output_format: 'pdf' } };
            resultMime = 'application/pdf';
            break;

        case 'text-to-pdf':
            validateFileType(inputFile, ['txt']);
            conversionTaskDefinition = { 'convert-file': { operation: 'convert', input: 'import-file', output_format: 'pdf' } };
            resultMime = 'application/pdf';
            break;

        case 'ocr-extract':
            validateFileType(inputFile, ['png', 'jpg', 'jpeg', 'bmp', 'pdf']);
            conversionTaskDefinition = { 'extract-text': { operation: 'ocr', input: 'import-file', output_format: targetFormat } };
            if (targetFormat === 'docx') {
                resultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else { // txt
                resultMime = 'text/plain';
                resultFilename = `${path.parse(inputFile.originalname).name}_extracted.txt`;
            }
            break;

        default:
            return res.status(400).json({ message: `Unsupported conversion type: ${conversionType}` });
    }

    // --- Execute CloudConvert Job ---
    // 1. Create a job with an upload task
    let job = await cloudConvert.jobs.create({
      tasks: { 'import-file': { operation: 'import/upload' } }
    });

    // 2. Upload the file
    const importTask = job.tasks.find(task => task.name === 'import-file');
    if (!importTask) throw new Error('Import task not found in job.');
    await cloudConvert.tasks.upload(importTask, fs.createReadStream(inputFile.path), inputFile.originalname);

    // 3. Add conversion and export tasks to the job
    const conversionTaskName = Object.keys(conversionTaskDefinition)[0];
    job = await cloudConvert.jobs.addTasks(job.id, {
        ...conversionTaskDefinition,
        'export-result': {
            operation: 'export/url',
            input: conversionTaskName,
            inline: false,
            archive_multiple_files: false
        }
    });

    // 4. Wait for the job to complete
    job = await cloudConvert.jobs.wait(job.id);
    console.log('CloudConvert job finished.');

    // 5. Get the result file
    const exportTask = job.tasks.find(task => task.operation === 'export/url');
    if (exportTask?.status !== 'finished' || !exportTask.result?.files?.[0]?.url) {
        const failedTask = job.tasks.find(task => task.status === 'error');
        throw new Error(`CloudConvert task failed: ${failedTask?.message || 'Could not get exported file URL.'}`);
    }
    const fileUrl = exportTask.result.files[0].url;

    // 6. Download the result and send to the user
    const downloadResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const resultBuffer = Buffer.from(downloadResponse.data, 'binary');

    res.setHeader('Content-Type', resultMime);
    res.setHeader('Content-Disposition', `attachment; filename="${resultFilename}"`);
    res.send(resultBuffer);

  } catch (err: any) {
    console.error('Conversion failed:', err);
    res.status(500).json({
      message: 'Conversion failed',
      error: err.response?.data?.message || err.message || 'An unknown error occurred.',
    });
  } finally {
    // --- Cleanup ---
    if (inputFile && fs.existsSync(inputFile.path)) {
      fs.unlinkSync(inputFile.path);
      console.log(`Cleaned up original file: ${inputFile.path}`);
    }
  }
});

/**
 * @route GET /api/health
 * @description Health check endpoint to verify CloudConvert API key and status.
 */
router.get('/api/health', async (req: Request, res: Response) => {
  try {
    await cloudConvert.users.me();
    res.json({ status: 'active', message: 'CloudConvert API is reachable and key is valid.' });
  } catch (err: any) {
    console.error('API Health Check Failed:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Could not connect to CloudConvert API.',
      details: err.message,
    });
  }
});

export default router;
