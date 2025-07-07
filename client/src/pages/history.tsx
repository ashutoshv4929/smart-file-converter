import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, File, Images, Calendar, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocalStorage } from '@/lib/storage';
import { ConversionStats } from '@/types/conversion';

export default function History() {
  const [stats, setStats] = useState<ConversionStats>({ conversionsToday: 0, totalConversions: 0, savedFiles: 0 });

  // Fetch server conversions
  const { data: serverConversions } = useQuery({
    queryKey: ['/api/conversions'],
  });

  const { data: recentConversions } = useQuery({
    queryKey: ['/api/conversions/recent/7'],
  });

  useEffect(() => {
    setStats(LocalStorage.getStats());
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConversionIcon = (originalFormat: string, targetFormat: string) => {
    if (targetFormat === 'pdf') {
      return <FileText className="text-red-600 dark:text-red-400" size={16} />;
    } else if (targetFormat === 'docx') {
      return <File className="text-blue-600 dark:text-blue-400" size={16} />;
    }
    return <Images className="text-green-600 dark:text-green-400" size={16} />;
  };

  const getConversionBg = (targetFormat: string) => {
    if (targetFormat === 'pdf') {
      return 'bg-red-100 dark:bg-red-900/30';
    } else if (targetFormat === 'docx') {
      return 'bg-blue-100 dark:bg-blue-900/30';
    }
    return 'bg-green-100 dark:bg-green-900/30';
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">Conversion History</h1>
        <p className="text-gray-600 dark:text-gray-400">Track your file conversion activity</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600 dark:text-blue-400" size={16} />
            </div>
            <div>
              <div className="text-lg font-bold">{stats.conversionsToday}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
            </div>
          </div>
        </div>

        <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 dark:bg-green-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600 dark:text-green-400" size={16} />
            </div>
            <div>
              <div className="text-lg font-bold">{stats.totalConversions}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">All Time</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="all">All History</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-6">
          <div className="space-y-3">
            {recentConversions?.length > 0 ? (
              recentConversions.map((conversion: any) => (
                <div key={conversion.id} className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getConversionBg(conversion.targetFormat)}`}>
                      {getConversionIcon(conversion.originalFormat, conversion.targetFormat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{conversion.fileName}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(conversion.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {conversion.originalFormat.split('/').pop()} → {conversion.targetFormat}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      conversion.status === 'completed' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {conversion.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="mx-auto mb-4" size={48} />
                <p>No recent conversions</p>
                <p className="text-sm">Conversions from the last 7 days will appear here</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-3">
            {serverConversions?.length > 0 ? (
              serverConversions.map((conversion: any) => (
                <div key={conversion.id} className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getConversionBg(conversion.targetFormat)}`}>
                      {getConversionIcon(conversion.originalFormat, conversion.targetFormat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{conversion.fileName}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(conversion.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {(conversion.fileSize / 1024 / 1024).toFixed(1)} MB • {conversion.originalFormat.split('/').pop()} → {conversion.targetFormat}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      conversion.status === 'completed' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {conversion.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <File className="mx-auto mb-4" size={48} />
                <p>No conversion history</p>
                <p className="text-sm">Start converting files to see your history here</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
