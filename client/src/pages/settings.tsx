import { useState, useEffect } from 'react';
import { Moon, Sun, Download, Trash2, Info, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/components/theme-provider';
import { LocalStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [stats, setStats] = useState({ conversionsToday: 0, totalConversions: 0, savedFiles: 0 });

  useEffect(() => {
    setStats(LocalStorage.getStats());
  }, []);

  const handleClearData = () => {
    localStorage.clear();
    setStats({ conversionsToday: 0, totalConversions: 0, savedFiles: 0 });
    toast({
      title: "Data Cleared",
      description: "All local data has been cleared successfully.",
    });
  };

  const handleExportData = () => {
    const allData = {
      stats: LocalStorage.getStats(),
      recentFiles: LocalStorage.getRecentFiles(),
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `smart_converter_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    toast({
      title: "Data Exported",
      description: "Your data has been exported successfully.",
    });
  };

  const installPWA = () => {
    if ('serviceWorker' in navigator) {
      toast({
        title: "Install App",
        description: "Use your browser's 'Add to Home Screen' option to install the app.",
      });
    }
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Customize your app experience</p>
      </div>

      {/* Appearance Section */}
      <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Appearance</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon className="text-gray-600 dark:text-gray-400" size={16} />
              ) : (
                <Sun className="text-gray-600 dark:text-gray-400" size={16} />
              )}
            </div>
            <div>
              <div className="font-medium text-sm">Dark Mode</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled'}
              </div>
            </div>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Data Management</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
                <Download className="text-blue-600 dark:text-blue-400" size={16} />
              </div>
              <div>
                <div className="font-medium text-sm">Export Data</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Download your conversion history</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              Export
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 dark:bg-red-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
                <Trash2 className="text-red-600 dark:text-red-400" size={16} />
              </div>
              <div>
                <div className="font-medium text-sm">Clear All Data</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Remove all local data and history</div>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">App Information</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
                <Download className="text-green-600 dark:text-green-400" size={16} />
              </div>
              <div>
                <div className="font-medium text-sm">Install App</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Add to your device's home screen</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={installPWA}>
              Install
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center">
              <Info className="text-gray-600 dark:text-gray-400" size={16} />
            </div>
            <div>
              <div className="font-medium text-sm">Version 1.0.0</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Smart File Converter PWA</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-lg flex items-center justify-center">
              <Shield className="text-gray-600 dark:text-gray-400" size={16} />
            </div>
            <div>
              <div className="font-medium text-sm">Offline Capable</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">All conversions work without internet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Usage Statistics</h3>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{stats.conversionsToday}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.totalConversions}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.savedFiles}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Saved</div>
          </div>
        </div>
      </div>
    </div>
  );
}
