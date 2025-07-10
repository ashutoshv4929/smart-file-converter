import { LibreOfficeConverter } from './LibreOfficeConverter';
import { PdfConverter } from './PdfConverter';
import { OcrConverter } from './OcrConverter';
import { ImageConverter } from './ImageConverter';
import path from 'path';
import fs from 'fs-extra';

export class ConversionService {
  private converters: { [key: string]: any };
  private libreOffice: LibreOfficeConverter;
  private pdfConverter: PdfConverter;
  private ocrConverter: OcrConverter;
  private imageConverter: ImageConverter;

  constructor() {
    this.converters = {};
    this.initializeConverters();
    this.libreOffice = this.converters['libreoffice'];
    this.pdfConverter = this.converters['pdf'];
    this.ocrConverter = this.converters['ocr'];
    this.imageConverter = this.converters['image'];
  }

  private initializeConverters() {
    this.converters['libreoffice'] = new LibreOfficeConverter();
    this.converters['pdf'] = new PdfConverter();
    this.converters['ocr'] = new OcrConverter(['eng']); // Add OCR converter
    this.converters['image'] = new ImageConverter();
  }

  async convertFile(
    inputPath: string,
    outputFormat: string,
    options: any = {}
  ): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error('Input file does not exist');
    }

    const extension = path.extname(inputPath).toLowerCase().substring(1);
    const outputPath = this.getOutputPath(inputPath, outputFormat);

    try {
      // Document conversions using LibreOffice
      if (this.isDocumentFormat(extension)) {
        if (outputFormat === 'pdf') {
          // Convert document to PDF
          return await this.libreOffice.convert({
            inputPath,
            outputPath,
            options
          });
        } else if (this.isDocumentFormat(outputFormat)) {
          // Convert between document formats
          return await this.libreOffice.convert({
            inputPath,
            outputPath,
            options
          });
        }
      }

      // PDF conversions
      if (extension === 'pdf') {
        return await this.pdfConverter.convert({
          inputPath,
          outputPath,
          options
        });
      }

      // Image conversions
      if (this.isImageFormat(extension)) {
        if (outputFormat === 'pdf') {
          // Convert image to PDF
          return await this.imageConverter.convert({
            inputPath,
            outputPath,
            options
          });
        } else if (outputFormat === 'txt') {
          // OCR processing
          return await this.ocrConverter.convert({
            inputPath,
            outputPath,
            options
          });
        } else {
          // Image to image conversion
          return await this.imageConverter.convert({
            inputPath,
            outputPath,
            options
          });
        }
      }

      // If no specific handler found, try LibreOffice as a fallback
      return await this.libreOffice.convert({
        inputPath,
        outputPath,
        options
      });
    } catch (error: any) {
      console.error('Conversion failed:', error);
      throw new Error(`कनवर्जन प्रक्रिया में त्रुटि: ${error.message}`);
    }
  }

  private getOutputPath(inputPath: string, outputFormat: string): string {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${name}.${outputFormat}`);
  }

  private isDocumentFormat(extension: string): boolean {
    const documentFormats = [
      'doc', 'docx', 'odt', 'rtf', 'txt', 'html', 'htm',
      'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods', 'csv'
    ];
    return documentFormats.includes(extension.toLowerCase());
  }

  private isImageFormat(extension: string): boolean {
    const imageFormats = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg'
    ];
    return imageFormats.includes(extension.toLowerCase());
  }

  // Helper methods for specific conversions
  async convertToPdf(inputPath: string, options: any = {}): Promise<string> {
    const outputPath = this.getOutputPath(inputPath, 'pdf');
    return this.convertFile(inputPath, 'pdf', options);
  }

  async convertToImage(inputPath: string, format: string = 'jpg', options: any = {}): Promise<string> {
    return this.convertFile(inputPath, format, options);
  }

  async extractText(inputPath: string, options: any = {}): Promise<string> {
    const outputPath = this.getOutputPath(inputPath, 'txt');
    return this.convertFile(inputPath, 'txt', options);
  }

  // Cleanup resources
  async cleanup() {
    await this.ocrConverter.terminate();
  }

  terminateAll(): void {
    Object.values(this.converters).forEach(converter => {
      if ('terminate' in converter && typeof converter.terminate === 'function') {
        (converter as any).terminate();
      }
    });
  }
}

// Singleton instance
export const conversionService = new ConversionService();
