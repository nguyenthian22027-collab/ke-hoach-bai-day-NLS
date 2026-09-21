

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

export type IntegrationMode = 'NLS' | 'AI' | 'BOTH' | 'NONE';

export type DisabilityType = 'GENERAL' | 'INTELLECTUAL' | 'VISUAL' | 'HEARING' | 'MOTOR';

export type EnglishIntegrationLevel = 'NONE' | 'BASIC' | 'INTER' | 'CLIL';

// Phiên bản Khung Năng lực AI: QĐ 2422 (chính thức 2026-2027) hoặc QĐ 3439 (thí điểm cũ)
export type AIFrameworkVersion = 'QD2422' | 'QD3439';

// Môi trường thiết bị dạy học: Lớp học đảo ngược (làm ở nhà) hoặc có thiết bị trực tiếp
export type TeachingEnvironment = 'FLIPPED_CLASSROOM' | 'IN_CLASS_DEVICES';

export interface ProcessingOptions {
  analyzeOnly: boolean;
  detailedReport: boolean;
  comparisonExport: boolean;
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  selectedMathModel?: string;
  integrationMode?: IntegrationMode;
  aiFrameworkVersion?: AIFrameworkVersion; // Phiên bản Khung NL AI (mặc định: QD2422)
  includeDisabilitySupport?: boolean;
  disabilityType?: DisabilityType;
  disabilityTypes?: DisabilityType[]; // Danh sách các đối tượng khuyết tật được chọn (hỗ trợ đa chọn)
  disabilityCustomTarget?: string; // Yêu cầu cần đạt đối với HSKT (nhập tay hoặc trích từ PPCT)
  includeEnglishIntegration?: boolean;
  englishIntegrationLevel?: EnglishIntegrationLevel;
  englishCustomTarget?: string; // Yêu cầu cần đạt / Thuật ngữ Tiếng Anh nhập tay hoặc trích từ PPCT (Ưu tiên số 1)
  hasExistingNLS?: boolean; // File giáo án đã có NLS được chèn sẵn → Chế độ Bổ sung
  enableStem?: boolean; // Tích hợp STEM vào Hoạt động Vận dụng (mặc định: false)
  stemCustomTarget?: string; // YCCĐ STEM nhập tay từ phụ lục đầu năm (Ưu tiên số 1)
  enableSummaryTable?: boolean; // Bảng Tổng hợp Hoạt động NLS & AI cuối giáo án (mặc định: false)
  includeQPAN?: boolean; // Lồng ghép Giáo dục Quốc phòng và An ninh (Thông tư 08/2024/TT-BGDĐT)
  qpanCustomTarget?: string; // Nội dung lồng ghép QPAN nhập tay từ phụ lục đầu năm (Ưu tiên số 1)
  // Lớp học đảo ngược (Flipped Classroom)
  teachingEnvironment?: TeachingEnvironment; // Mặc định: IN_CLASS_DEVICES (giữ nguyên luồng cũ)
  nextLessonContent?: string;  // Nội dung file giáo án bài tiếp theo (text đã đọc từ docx)
  nextLessonTitle?: string;    // Tên bài học tiếp theo (nhập tay - Cách 2)
  nextLessonSummary?: string;  // Tóm tắt nội dung bài tiếp theo (nhập tay - Cách 2)
  // Phạm vi tích hợp hoạt động (Tránh quá tải, chọn hoạt động trọng tâm)
  activityScope?: 'ALL' | 'CUSTOM'; // 'ALL' (mặc định): trải đều HĐ 1->4; 'CUSTOM': theo lựa chọn của GV
  selectedMainActivities?: number[]; // [1, 2, 3, 4] hoặc [2]...
  selectedSubActivitiesHD2?: string[]; // ['2.1', '2.2']...
  customSubActivityNote?: string; // Ghi chú tên mục cụ thể
  // YCCĐ / Mã NLS & AI dán tay trực tiếp (Ưu tiên số 1 - Khóa chặn tuyệt đối)
  nlsCustomTarget?: string; // Yêu cầu cần đạt / Mã NLS nhập tay
  aiCustomTarget?: string;  // Yêu cầu cần đạt / Mã Năng lực AI nhập tay
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
  includeDisabilitySupport?: boolean;
  disabilityType?: DisabilityType;
  disabilityTypes?: DisabilityType[];
  disabilityCustomTarget?: string;
  englishIntegrationLevel?: EnglishIntegrationLevel;
  englishCustomTarget?: string;
  stemCustomTarget?: string;
  qpanCustomTarget?: string;
  teachingEnvironment?: TeachingEnvironment;
  includeQPAN?: boolean;
  activityScope?: 'ALL' | 'CUSTOM';
  selectedMainActivities?: number[];
  selectedSubActivitiesHD2?: string[];
  customSubActivityNote?: string;
  nlsCustomTarget?: string;
  aiCustomTarget?: string;
}
export type ProPackage = 'TRIAL' | 'BONUS_5' | 'BONUS_10' | 'BONUS_20' | '1_YEAR' | '2_YEARS' | 'LIFETIME';

export interface LicenseInfo {
  deviceId: string;
  isPro: boolean;
  packageType: ProPackage;
  trialStartDate: number;
  trialDaysRemaining: number;
  trialDownloadsUsed: number;        // Số lượt đã tải về (0 -> 5)
  trialDownloadsRemaining: number;   // Số lượt còn lại (5 -> 0)
  maxTrialDownloads: number;         // 5 lượt
  isTrialExpired: boolean;           // true khi đã dùng hết 5 lượt tải
  proExpiryDate?: number;            // Unix timestamp hết hạn (nếu gói theo năm)
  licenseKey?: string;
}
