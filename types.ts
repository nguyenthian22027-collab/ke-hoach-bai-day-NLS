

export enum Subject {
  TOAN = "Toán",
  VAN = "Ngữ Văn",
  LY = "Vật Lí",
  HOA = "Hóa Học",
  SINH = "Sinh Học",
  KHTN = "Khoa học tự nhiên",
  LSDIA = "Lịch sử và Địa lí",
  KHXH = "Khoa học xã hội",
  TNXH = "Tự nhiên và Xã hội",
  KHOA_HOC = "Khoa học",
  ANH = "Tiếng Anh",
  SU = "Lịch Sử",
  DIA = "Địa Lí",
  GDCD = "GDCD / GDKT&PL",
  CONG_NGHE = "Công Nghệ",
  TIN = "Tin Học",
  THE_DUC = "Thể Dục",
  NQTN = "Nghệ thuật",
  HDKH = "Hoạt động trải nghiệm",
  GDQPAN = "Giáo dục Quốc phòng - An ninh",
  GDDP = "Giáo dục Địa phương"
}

export interface LessonInfo {
  subject: Subject;
  grade: number;
  content: string;
  distributionContent?: string; // Nội dung phân phối chương trình
}

// Interface lưu trữ file DOCX gốc cho XML Injection
export interface OriginalDocxFile {
  arrayBuffer: ArrayBuffer;
  fileName: string;
}

export type IntegrationMode = 'NLS' | 'AI' | 'BOTH';

export interface ProcessingOptions {
  analyzeOnly: boolean;
  detailedReport: boolean;
  comparisonExport: boolean;
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  selectedMathModel?: string;
  integrationMode?: IntegrationMode;
}

export interface GeminiResponse {
  rawText: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  subject: Subject;
  grade: number;
  lessonTitle: string;
  originalFileName?: string;
  result: string;
  integrationMode?: IntegrationMode;
}

