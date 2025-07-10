import { BaseConverter, ConversionOptions } from './BaseConverter';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';

const execAsync = promisify(exec);

export class ImageConverter extends BaseConverter {
  private convertPath: string;
  private identifyPath: string;

  constructor() {
    super();
    // Windows paths (adjust as needed)
    if (process.platform === 'win32') {
      this.convertPath = 'magick convert';
      this.identifyPath = 'magick identify';
    } else {
      this.convertPath = 'convert';
      this.identifyPath = 'identify';
    }
  }

  async convert(options: ConversionOptions): Promise<string> {
    const { inputPath, outputPath, options: imgOptions = {} } = options;
    const format = path.extname(outputPath).toLowerCase().substring(1);
    
    try {
      // Create output directory if not exists
      await fs.ensureDir(path.dirname(outputPath));

      // Get image information
      const info = await this.getImageInfo(inputPath);
      
      // Build ImageMagick command
      let command = `"${this.convertPath}" "${inputPath}"`;
      
      // Apply transformations based on options
      if (imgOptions.resize) {
        command += ` -resize ${imgOptions.resize}`;
      }
      
      if (imgOptions.quality) {
        command += ` -quality ${imgOptions.quality}`;
      }
      
      if (imgOptions.grayscale) {
        command += ' -colorspace Gray';
      }
      
      if (imgOptions.crop) {
        command += ` -crop ${imgOptions.crop.width}x${imgOptions.crop.height}+${imgOptions.crop.x}+${imgOptions.crop.y}`;
      }
      
      // Add output format and path
      command += ` "${outputPath}"`;
      
      // Execute conversion
      await this.executeCommand(command);
      
      return outputPath;
    } catch (error) {
      console.error('Image conversion failed:', error);
      throw new Error(`Image conversion failed: ${error.message}`);
    }
  }

  async getImageInfo(imagePath: string): Promise<Record<string, any>> {
    try {
      const { stdout } = await this.executeCommand(`"${this.identifyPath}" -format "%w,%h,%m,%[channels]" "${imagePath}"`);
      const [width, height, format, channels] = stdout.trim().split(',');
      
      return {
        width: parseInt(width, 10),
        height: parseInt(height, 10),
        format: format.toLowerCase(),
        channels: channels.toLowerCase(),
        size: (await fs.stat(imagePath)).size
      };
    } catch (error) {
      console.error('Failed to get image info:', error);
      throw new Error(`Failed to get image info: ${error.message}`);
    }
  }

  async createThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 200,
    height: number = 200
  ): Promise<string> {
    try {
      const command = `"${this.convertPath}" "${inputPath}" -thumbnail ${width}x${height}^ -gravity center -extent ${width}x${height} "${outputPath}"`;
      await this.executeCommand(command);
      return outputPath;
    } catch (error) {
      console.error('Thumbnail creation failed:', error);
      throw new Error(`Thumbnail creation failed: ${error.message}`);
    }
  }

  async applyWatermark(
    inputPath: string,
    outputPath: string,
    watermarkText: string,
    options: any = {}
  ): Promise<string> {
    try {
      const {
        fontSize = 24,
        fontColor = 'gray',
        opacity = 50,
        position = 'southeast',
        margin = 10
      } = options;

      const command = `"${this.convertPath}" "${inputPath}" ` +
        `-font Arial -pointsize ${fontSize} -fill ${fontColor} -gravity ${position} ` +
        `-draw "text ${margin},${margin} '${watermarkText}'" "${outputPath}"`;
      
      await this.executeCommand(command);
      return outputPath;
    } catch (error) {
      console.error('Watermark application failed:', error);
      throw new Error(`Watermark application failed: ${error.message}`);
    }
  }
}
