import { v4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  options?: Record<string, any>;
}

export abstract class BaseConverter {
  protected tempDir: string;
  
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  protected ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  protected getTempFilePath(extension: string = ''): string {
    return path.join(this.tempDir, `${v4()}${extension}`);
  }

  protected async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execAsync(command);
    } catch (error: any) {
      console.error(`Command failed: ${command}`, error);
      throw new Error(`Command execution failed: ${error.stderr || error.message}`);
    }
  }

  protected async cleanup(files: string[]) {
    for (const file of files) {
      if (file && fs.existsSync(file)) {
        try {
          await fs.unlink(file);
        } catch (error) {
          console.error(`Error cleaning up file ${file}:`, error);
        }
      }
    }
  }

  abstract convert(options: ConversionOptions): Promise<string>;
}
