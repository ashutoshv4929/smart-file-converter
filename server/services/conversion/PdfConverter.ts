import { BaseConverter, ConversionOptions } from './BaseConverter';
import path from 'path';
import fs from 'fs-extra';

export class PdfConverter extends BaseConverter {
  private ghostscriptPath: string;
  private pdftoppmPath: string;
  private pdftotextPath: string;
  private pdfinfoPath: string;

  constructor() {
    super();
    // Windows paths (adjust as needed)
    if (process.platform === 'win32') {
      this.ghostscriptPath = 'gswin64c';
      this.pdftoppmPath = 'pdftoppm';
      this.pdftotextPath = 'pdftotext';
      this.pdfinfoPath = 'pdfinfo';
    } else {
      this.ghostscriptPath = 'gs';
      this.pdftoppmPath = 'pdftoppm';
      this.pdftotextPath = 'pdftotext';
      this.pdfinfoPath = 'pdfinfo';
    }
  }

  async convert(options: ConversionOptions): Promise<string> {
    const { inputPath, outputPath, options: conversionOptions = {} } = options;
    const format = path.extname(outputPath).toLowerCase().substring(1);

    try {
      // Create output directory if not exists
      await fs.ensureDir(path.dirname(outputPath));

      switch (format) {
        case 'jpg':
        case 'jpeg':
        case 'png':
          await this.convertToImage(inputPath, outputPath, format, conversionOptions);
          break;
        case 'txt':
          await this.convertToText(inputPath, outputPath, conversionOptions);
          break;
        case 'pdf':
          // For PDF optimization or modification
          await this.optimizePdf(inputPath, outputPath, conversionOptions);
          break;
        default:
          throw new Error(`Unsupported output format: ${format}`);
      }

      return outputPath;
    } catch (error) {
      console.error('PDF conversion failed:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  private async convertToImage(
    inputPath: string,
    outputPath: string,
    format: string,
    options: any
  ): Promise<void> {
    const { dpi = 300, page = 1 } = options;
    const tempFile = this.getTempFilePath(`.${format}`);
    
    // Use pdftoppm to convert PDF to image
    const command = `"${this.pdftoppmPath}" -${format} -f ${page} -l ${page} -r ${dpi} -singlefile "${inputPath}" "${path.join(path.dirname(tempFile), 'output')}"`;
    
    await this.executeCommand(command);
    
    // Rename the output file to the desired path
    const tempOutput = path.join(path.dirname(tempFile), `output.${format}`);
    if (await fs.pathExists(tempOutput)) {
      await fs.move(tempOutput, outputPath, { overwrite: true });
    } else {
      throw new Error('Image conversion output not found');
    }
  }

  private async convertToText(
    inputPath: string,
    outputPath: string,
    options: any
  ): Promise<void> {
    const { layout = 'simple' } = options;
    const layoutParam = layout === 'simple' ? '-layout' : '';
    
    // Use pdftotext to extract text from PDF
    const command = `"${this.pdftotextPath}" ${layoutParam} "${inputPath}" "${outputPath}"`;
    await this.executeCommand(command);
  }

  private async optimizePdf(
    inputPath: string,
    outputPath: string,
    options: any
  ): Promise<void> {
    const { quality = 'printer', ...rest } = options;
    
    // Ghostscript command for PDF optimization
    const command = `"${this.ghostscriptPath}" -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 ` +
      `-dPDFSETTINGS=/${quality} -dNOPAUSE -dQUIET -dBATCH ` +
      `-sOutputFile="${outputPath}" "${inputPath}"`;
    
    await this.executeCommand(command);
  }

  async getPdfInfo(inputPath: string): Promise<Record<string, string>> {
    try {
      const { stdout } = await this.executeCommand(`"${this.pdfinfoPath}" "${inputPath}"`);
      const info: Record<string, string> = {};
      
      // Parse pdfinfo output
      stdout.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          info[key] = value;
        }
      });
      
      return info;
    } catch (error) {
      console.error('Failed to get PDF info:', error);
      throw new Error(`Failed to get PDF info: ${error.message}`);
    }
  }
}
