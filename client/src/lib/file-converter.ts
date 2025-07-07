import { PDFDocument, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import Tesseract from 'tesseract.js';

export class FileConverter {
  // Universal backend-driven conversion
  static async convertViaBackend(file: File, conversionType: string, targetFormat: string, onProgress?: (percent: number) => void): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversionType', conversionType);
    formData.append('targetFormat', targetFormat);
    
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Conversion failed');
    const blob = await response.blob();
    return blob;
  }

  // Download helper
  static downloadFile(blob: Blob, originalName: string, targetFormat: string) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const extension = targetFormat === 'pdf' ? 'pdf' : 
                    targetFormat === 'word' ? 'docx' : targetFormat;
    const fileName = `${nameWithoutExt}_converted.${extension}`;
    saveAs(blob, fileName);
  }
}
