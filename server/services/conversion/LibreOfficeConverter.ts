import { BaseConverter, ConversionOptions } from './BaseConverter';
import path from 'path';

export class LibreOfficeConverter extends BaseConverter {
  private libreOfficePath: string;
  private supportedFormats = {
    'doc': 'docx',
    'docx': 'docx',
    'odt': 'odt',
    'rtf': 'rtf',
    'txt': 'txt',
    'html': 'html',
    'pdf': 'pdf',
    'ppt': 'pptx',
    'pptx': 'pptx',
    'xls': 'xlsx',
    'xlsx': 'xlsx',
    'ods': 'ods',
  };

  constructor() {
    super();
    // Windows के लिए LibreOffice पाथ
    this.libreOfficePath = process.platform === 'win32' 
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
      : 'libreoffice';
  }

  async convert(options: ConversionOptions): Promise<string> {
    const { inputPath, outputPath, options: conversionOptions = {} } = options;
    
    // Output directory और फाइल नाम निकालें
    const outputDir = path.dirname(outputPath);
    const outputExt = path.extname(outputPath).toLowerCase().substring(1);
    
    // Check if format supported
    if (!Object.values(this.supportedFormats).includes(outputExt)) {
      throw new Error(`Unsupported output format: ${outputExt}`);
    }

    try {
      // Create output directory if not exists
      await fs.ensureDir(outputDir);
      
      // Conversion command
      const command = `"${this.libreOfficePath}" --headless --convert-to ${outputExt} --outdir "${outputDir}" "${inputPath}"`;
      
      // Execute conversion
      await this.executeCommand(command);
      
      // Get the converted file path
      const convertedFileName = path.basename(inputPath, path.extname(inputPath)) + '.' + outputExt;
      const convertedFilePath = path.join(outputDir, convertedFileName);
      
      // Rename to the desired output path if needed
      if (convertedFilePath !== outputPath) {
        await fs.rename(convertedFilePath, outputPath);
      }
      
      return outputPath;
    } catch (error) {
      console.error('LibreOffice conversion failed:', error);
      throw new Error(`Document conversion failed: ${error.message}`);
    }
  }
}
