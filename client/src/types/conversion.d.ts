export type ConversionType = 'pdf' | 'word' | 'image' | 'text';

export interface ConversionConfig {
  title: string;
  acceptTypes: string;
  outputOptions: {
    format: string;
    icon: React.ComponentType;
    label: string;
    description: string;
  }[];
}

export interface ConversionProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  conversionType: ConversionType;
}

export interface ConversionStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  mostConvertedType: ConversionType;
}

export interface RecentFile {
  id: string;
  filename: string;
  conversionType: ConversionType;
  timestamp: string;
  size: string;
}
