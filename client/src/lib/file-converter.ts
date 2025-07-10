import { PDFDocument, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import Tesseract from 'tesseract.js';

export class FileConverter {
  
  // Convert Word/Text to PDF
  static async convertToPdf(file: File): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    let content = '';
    
    if (file.type === 'text/plain') {
      content = await file.text();
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For .docx files, we'll extract basic text content
      // Note: Full docx parsing would require additional libraries
      content = await file.text();
    }
    
    const lines = content.split('\n');
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    
    let yPosition = height - margin;
    
    for (const line of lines) {
      if (yPosition < margin) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        yPosition = newPage.getSize().height - margin;
        newPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }
      yPosition -= lineHeight;
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
  
  // Convert PDF to text
  static async pdfToText(file: File): Promise<string> {
    // Basic PDF text extraction
    // Note: Full PDF parsing would require a dedicated library like PDF.js
    const text = await file.text();
    return text;
  }
  
  // Convert text to Word document
  static async textToWord(text: string): Promise<Blob> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: text.split('\n').map(line => 
          new Paragraph({
            children: [new TextRun(line || ' ')],
          })
        ),
      }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
  }
  
  // Convert images to PDF
  static async imagesToPdf(files: File[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    
    for (const file of files) {
      const imageBytes = await file.arrayBuffer();
      let image;
      
      if (file.type === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        throw new Error(`Unsupported image format: ${file.type}`);
      }
      
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const imgDims = image.scale(Math.min(width / image.width, height / image.height));
      
      page.drawImage(image, {
        x: (width - imgDims.width) / 2,
        y: (height - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
  
  // OCR text extraction from images
  static async extractTextFromImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const worker = await Tesseract.createWorker();
    
    try {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(file, {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress * 100);
          }
        }
      });
      
      return text;
    } finally {
      await worker.terminate();
    }
  }
  
  // Download file with proper naming
  static downloadFile(blob: Blob, originalName: string, targetFormat: string) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const extension = targetFormat === 'pdf' ? 'pdf' : 
                    targetFormat === 'word' ? 'docx' : 'txt';
    const fileName = `${nameWithoutExt}_converted.${extension}`;
    
    saveAs(blob, fileName);
  }
}
