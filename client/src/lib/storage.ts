import { ConversionStats, RecentFile } from '@/types/conversion';

export class LocalStorage {
  private static STATS_KEY = 'file_converter_stats';
  private static RECENT_FILES_KEY = 'file_converter_recent_files';
  
  static getStats(): ConversionStats {
    const stored = localStorage.getItem(this.STATS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      conversionsToday: 0,
      totalConversions: 0,
      savedFiles: 0
    };
  }
  
  static updateStats(increment: Partial<ConversionStats>) {
    const current = this.getStats();
    const updated = {
      ...current,
      ...increment
    };
    localStorage.setItem(this.STATS_KEY, JSON.stringify(updated));
  }
  
  static incrementConversion() {
    const stats = this.getStats();
    this.updateStats({
      conversionsToday: stats.conversionsToday + 1,
      totalConversions: stats.totalConversions + 1,
      savedFiles: stats.savedFiles + 1
    });
  }
  
  static getRecentFiles(): RecentFile[] {
    const stored = localStorage.getItem(this.RECENT_FILES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }
  
  static addRecentFile(file: Omit<RecentFile, 'id'>) {
    const recentFiles = this.getRecentFiles();
    const newFile: RecentFile = {
      ...file,
      id: Date.now()
    };
    
    const updated = [newFile, ...recentFiles].slice(0, 10); // Keep only 10 most recent
    localStorage.setItem(this.RECENT_FILES_KEY, JSON.stringify(updated));
  }
  
  static removeRecentFile(id: number) {
    const recentFiles = this.getRecentFiles();
    const updated = recentFiles.filter(file => file.id !== id);
    localStorage.setItem(this.RECENT_FILES_KEY, JSON.stringify(updated));
  }
  
  static clearDailyStats() {
    const stats = this.getStats();
    this.updateStats({ conversionsToday: 0 });
  }
}

// Reset daily stats at midnight
const now = new Date();
const lastReset = localStorage.getItem('last_daily_reset');
const today = now.toDateString();

if (lastReset !== today) {
  LocalStorage.clearDailyStats();
  localStorage.setItem('last_daily_reset', today);
}
