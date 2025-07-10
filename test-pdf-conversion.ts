import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { PdfJsUtils } from './server/services/conversion/pdf-js-utils';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPdfConversion() {
    try {
        // एक सैंपल PDF बनाएं
        const testPdfPath = path.join(process.cwd(), 'test.pdf');
        await fs.writeFile(testPdfPath, 'This is a test PDF content');
        
        // PDF का पाथ सेट करें
        const pdfPath = testPdfPath;
        
        console.log('PDF को प्रोसेस कर रहा हूँ...');
        
        // पेज काउंट पाएं
        const pageCount = await PdfJsUtils.getPageCount(pdfPath);
        console.log(`PDF में कुल ${pageCount} पेज हैं`);
        
        // PDF को इमेज में कन्वर्ट करें
        console.log('PDF को इमेज में कन्वर्ट कर रहा हूँ...');
        const images = await PdfJsUtils.convertPdfToImages(pdfPath);
        
        console.log('कन्वर्जन सफल! बनी हुई इमेजेस:');
        console.log(images);
        
        // सफाई
        // Note: We don't have cleanup in PdfJsUtils, but we can delete the test file
        await fs.unlink(testPdfPath);
    } catch (error) {
        console.error('त्रुटि हुई:', error);
    } finally {
        process.exit(0);
    }
}

// टेस्ट फंक्शन को चलाएं
testPdfConversion();
