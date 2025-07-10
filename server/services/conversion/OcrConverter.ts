import { createWorker } from 'tesseract.js';
import path from 'path';
import { BaseConverter, ConversionOptions } from './BaseConverter';
import fs from 'fs-extra';

export class OcrConverter extends BaseConverter {
  async convert(options: ConversionOptions): Promise<string> {
    const { inputPath, outputPath } = options;
    
    try {
      const worker = await createWorker('eng');
      
      // Perform OCR on the image
      const { data } = await worker.recognize(inputPath);
      
      // Write the recognized text to the output file
      await fs.writeFile(outputPath, data.text);
      
      await worker.terminate();
      
      return outputPath;
    } catch (error) {
      throw new Error(`OCR conversion failed: ${error}`);
    }
  }
}
