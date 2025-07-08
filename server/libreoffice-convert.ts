import { exec } from 'child_process';
import path from 'path';

/**
 * Convert files using LibreOffice headless mode.
 * @param inputPath Full path of the input file
 * @param outputDir Directory for the output file
 * @param targetExt Output file extension (e.g. 'pdf', 'docx', 'pptx')
 * @returns Promise<string> - Path to the converted file
 */
export function libreOfficeConvert(inputPath: string, outputDir: string, targetExt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `soffice --headless --convert-to ${targetExt} --outdir "${outputDir}" "${inputPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('LibreOffice conversion error:', stderr || error.message);
        return reject(new Error(stderr || error.message));
      }
      // Output file ka naam same hota hai, sirf extension change hota hai
      const outputFile = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.' + targetExt);
      resolve(outputFile);
    });
  });
}
