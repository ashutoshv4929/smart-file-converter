import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

export class GhostscriptUtils {
    private static readonly GS_PATH = 'C:\\Program Files\\gs\\gs10.05.1\\bin\\gswin64c.exe';
    private static tempDir = path.join(process.cwd(), 'temp');
    private static outputDir = path.join(process.cwd(), 'output');

    protected static async ensureDirectories(): Promise<void> {
        if (!existsSync(this.tempDir)) {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
        if (!existsSync(this.outputDir)) {
            await fs.mkdir(this.outputDir, { recursive: true });
        }
    }

    static async init() {
        await this.ensureDirectories();
    }

    private static async executeCommand(command: string, cwd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || `Command failed: ${error.message}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    static async getPdfPageCount(pdfPath: string): Promise<number> {
        // मूल फाइल को टेम्प डायरेक्टरी में कॉपी करें
        const tempPdfPath = path.join(os.tmpdir(), path.basename(pdfPath));
        await fs.copyFile(pdfPath, tempPdfPath);
        
        const command = `"${this.GS_PATH}" -q -dNODISPLAY -c "(${tempPdfPath.replace(/\\/g, '/')}) (r) file runpdfbegin pdfpagecount = quit"`;
        try {
            const { stdout } = await execAsync(command);
            return parseInt(stdout.trim(), 10);
        } catch (error) {
            console.error('PDF पेज काउंट प्राप्त करने में त्रुटि:', error);
            throw error;
        } finally {
            // टेम्प फाइल डिलीट करें
            await fs.unlink(tempPdfPath).catch(() => {});
        }
    }

    static async convertPdfToImages(pdfPath: string): Promise<string[]> {
        await this.init();
        // मूल फाइल को टेम्प डायरेक्टरी में कॉपी करें
        const tempPdfPath = path.join(os.tmpdir(), path.basename(pdfPath));
        await fs.copyFile(pdfPath, tempPdfPath);
        
        const outputPattern = path.join(this.tempDir, 'page-%d.png');
        const command = `"${this.GS_PATH}" -dNOPAUSE -sDEVICE=png16m -r300 -o "${outputPattern}" "${tempPdfPath}"`;
        
        try {
            await execAsync(command);
            const files = await fs.readdir(this.tempDir);
            return files
                .filter(file => file.endsWith('.png'))
                .map(file => path.join(this.tempDir, file));
        } catch (error) {
            console.error('PDF को इमेज में कन्वर्ट करने में त्रुटि:', error);
            throw error;
        } finally {
            // टेम्प फाइल डिलीट करें
            await fs.unlink(tempPdfPath).catch(() => {});
        }
    }

    static async cleanup(): Promise<void> {
        try {
            // Remove all files in temp directory
            const files = await fs.readdir(this.tempDir);
            for (const file of files) {
                await fs.unlink(path.join(this.tempDir, file));
            }
        } catch (error) {
            console.error('Error cleaning up temp files:', error);
        }
    }
}
