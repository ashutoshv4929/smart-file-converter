import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { conversionService } from '../services/conversion/ConversionService';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
fs.ensureDir('uploads');

// File upload and conversion endpoint
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { format, options = {} } = req.body;
    const inputPath = req.file.path;
    const outputPath = path.join('converted', `${req.file.filename}.${format}`);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Perform conversion
    const resultPath = await conversionService.convertFile(
      inputPath,
      format,
      typeof options === 'string' ? JSON.parse(options) : options
    );

    // Send the converted file
    res.download(resultPath, path.basename(resultPath), async (err) => {
      // Cleanup: Delete the uploaded and converted files
      try {
        await fs.unlink(inputPath);
        await fs.unlink(resultPath);
      } catch (error) {
        console.error('Error cleaning up files:', error);
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Conversion error:', error);
      res.status(500).json({ 
        error: 'Conversion failed', 
        details: error.message 
      });
    } else {
      console.error('Conversion error:', error);
      res.status(500).json({ 
        error: 'Conversion failed', 
        details: 'Unknown error' 
      });
    }
  }
});

// File upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'कोई फाइल अपलोड नहीं की गई' });
    }

    const inputPath = req.file.path;
    const outputFormat = req.body.outputFormat || 'pdf';
    const outputPath = `converted/${Date.now()}.${outputFormat}`;

    // फाइल कनवर्जन प्रक्रिया शुरू करें
    await conversionService.convertFile(inputPath, outputPath, { outputFormat });

    res.json({ 
      success: true, 
      message: 'फाइल सफलतापूर्वक कनवर्ट हो गई',
      downloadUrl: `/download/${path.basename(outputPath)}`
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('कनवर्जन में त्रुटि:', error);
      res.status(500).json({ error: 'आंतरिक सर्वर त्रुटि', details: error.message });
    } else {
      console.error('कनवर्जन में त्रुटि:', error);
      res.status(500).json({ error: 'आंतरिक सर्वर त्रुटि', details: 'अज्ञात त्रुटि' });
    }
  }
});

// Get supported formats
router.get('/formats', (req, res) => {
  const formats = {
    document: ['doc', 'docx', 'odt', 'rtf', 'txt', 'pdf', 'html', 'ppt', 'pptx', 'xls', 'xlsx'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    conversion: {
      'document-to-pdf': {
        from: ['doc', 'docx', 'odt', 'rtf', 'txt', 'html', 'ppt', 'pptx', 'xls', 'xlsx'],
        to: 'pdf'
      },
      'pdf-to-document': {
        from: 'pdf',
        to: ['docx', 'odt', 'txt']
      },
      'image-to-pdf': {
        from: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
        to: 'pdf'
      },
      'image-conversion': {
        from: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
        to: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp']
      },
      'ocr': {
        from: ['jpg', 'jpeg', 'png', 'pdf', 'tiff', 'bmp'],
        to: 'txt'
      }
    }
  };
  
  res.json(formats);
});

export default router;
