import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/storage';
import { RecentFile } from '@/types/conversion';
import { FileText, File, Images, Share, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Files() {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setFiles(LocalStorage.getRecentFiles());
  }, []);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteFile = (id: number) => {
    LocalStorage.removeRecentFile(id);
    setFiles(LocalStorage.getRecentFiles());
    
    toast({
      title: "File Removed",
      description: "File removed from your files list.",
    });
  };

  const handleShareFile = async (file: RecentFile) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          text: `Converted file: ${file.name}`,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(`Converted file: ${file.name}`);
      toast({
        title: "Copied to Clipboard",
        description: "File information copied to clipboard.",
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="text-red-600 dark:text-red-400" size={20} />;
      case 'docx':
        return <File className="text-blue-600 dark:text-blue-400" size={20} />;
      default:
        return <Images className="text-green-600 dark:text-green-400" size={20} />;
    }
  };

  const getFileIconBg = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'docx':
        return 'bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'bg-green-100 dark:bg-green-900/30';
    }
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">My Files</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your converted files</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <div key={file.id} className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFileIconBg(file.type)}`}>
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{file.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{file.date}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {file.size} • {file.originalFormat} → {file.targetFormat}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleShareFile(file)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                  >
                    <Share size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <File className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
              {searchQuery ? 'No files found' : 'No files yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Start converting files to see them here'
              }
            </p>
          </div>
        )}
      </div>

      {/* File Statistics */}
      {filteredFiles.length > 0 && (
        <div className="mt-8 bg-surface dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">File Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{filteredFiles.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Files</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {filteredFiles.filter(f => f.type === 'pdf').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">PDF Files</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {filteredFiles.filter(f => f.type === 'docx').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Word Files</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
