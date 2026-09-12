import React, { useState } from 'react';
import { Download, CheckCircle, FileText, ChevronDown, ChevronUp, Copy, Check, MapPin, ListChecks, FileSpreadsheet, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  UnderlineType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType
} from 'docx';
import FileSaver from 'file-saver';
import JSZip from 'jszip';
import { OriginalDocxFile, LicenseInfo, Subject } from '../types';
import { recordTrialDownload } from '../services/licenseService';
import { TranslationModal } from './TranslationModal';

interface ResultDisplayProps {
  result: string | null;
  loading: boolean;
  originalDocx?: OriginalDocxFile | null;
  licenseInfo?: LicenseInfo;
  onOpenLicense?: () => void;
  onDownloadSuccess?: () => void;
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  subject?: Subject;
  grade?: number;
}

// Interface cho các section NLS đã parse
interface NLSSection {
  marker: string;  // Ví dụ: "HOẠT_ĐỘNG_1", "MỤC_TIÊU"
  content: string;
  activityPatterns?: string[]; // Pattern tiêu đề Hoạt động X để giới hạn phạm vi
  searchPatterns: string[]; // Patterns vị trí chèn trong phạm vi
  locationGuidance?: string; // Vị trí chèn chi tiết trích dẫn dòng/câu từ AI
  quotedText?: string; // Đoạn trích dẫn nguyên văn câu liền trước từ AI
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  loading,
  originalDocx,
  licenseInfo,
  onOpenLicense,
  onDownloadSuccess,
  apiKey,
  apiKeys,
  selectedModel,
  subject,
  grade,
}) => {
  const isPro = licenseInfo?.isPro ?? false;
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'word'>('word');
  const effectiveTab = isPro ? activeTab : 'word';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Parse tất cả các section NLS từ kết quả AI (supports both Vietnamese NLS_ and English DC_ markers)
  const parseAllNLSSections = (content: string): NLSSection[] => {
    const sections: NLSSection[] = [];

    // Regex để tìm tất cả các section: ===NLS_XXX=== hoặc ===DC_XXX=== ... ===END===
    const sectionRegex = /===(NLS|DC)_([^=]+)===([\s\S]*?)===(?:END|end)===/gi;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      const prefix = match[1]; // NLS or DC
      let rawMarker = match[2].trim();
      const sectionContent = match[3].trim();

      let locationGuidance = '';
      if (rawMarker.includes('|VITRI:')) {
        const parts = rawMarker.split('|VITRI:');
        rawMarker = parts[0].trim();
        locationGuidance = parts[1].trim();
      } else if (rawMarker.includes('|POSITION:')) {
        const parts = rawMarker.split('|POSITION:');
        rawMarker = parts[0].trim();
        locationGuidance = parts[1].trim();
      }

      // Trích xuất đoạn văn bản trích dẫn ("Sau dòng: ...") của AI để dùng cho Smart Matching 2 lớp
      let quotedText = '';
      if (locationGuidance) {
        const quoteMatch = locationGuidance.match(/Sau dòng:\s*["“'‘]([^"”'’]+)["”'’]/i) ||
                           locationGuidance.match(/After line:\s*["“'‘]([^"”'’]+)["”'’]/i) ||
                           locationGuidance.match(/["“'‘]([^"”'’]{6,})["”'’]/);
        if (quoteMatch) {
          quotedText = quoteMatch[1].trim();
        }
      }

      const marker = rawMarker;

      let activityPatterns: string[] = [];
      let searchPatterns: string[] = [];

      // ================== VIETNAMESE NLS MARKERS ==================
      if (prefix === 'NLS') {
        if (marker === 'MỤC_TIÊU') {
          // Ưu tiên chèn TRƯỚC mục "3. Phẩm chất" để NLS luôn nằm ở cuối phần "2. Năng lực"
          searchPatterns = [
            '3. Phẩm chất', '3.Phẩm chất', '3. Phẩm chất:', 'c) Phẩm chất', 'c. Phẩm chất',
            '3. Thẩm chất', 'Phẩm chất:', 'Phẩm chất',
            'III. TIẾN TRÌNH DẠY HỌC', 'III. TIẾN TRÌNH', 'III. Tiến trình'
          ];
        }
        // Parse format: HOẠT_ĐỘNG_X hoặc HOẠT_ĐỘNG_X_VỊ_TRÍ
        else if (marker.startsWith('HOẠT_ĐỘNG_')) {
          const raw = marker.replace('HOẠT_ĐỘNG_', '');
          const parts = raw.split('_');

          let actNum = parts[0];
          let subPartIndex = 1;

          // Xử lý số hoạt động dạng 2_1 (tức Hoạt động 2.1)
          if (parts.length > 1 && !isNaN(Number(parts[1]))) {
            actNum = `${parts[0]}.${parts[1]}`;
            subPartIndex = 2;
          }

          const subPart = parts.slice(subPartIndex).join('_'); // VỊ_TRÍ: TỔ_CHỨC, BƯỚC_X...

          // Pattern để khoanh vùng đúng Hoạt động X
          activityPatterns = [
            `Hoạt động ${actNum}:`, `Hoạt động ${actNum}.`, `Hoạt động ${actNum} `,
            `HOẠT ĐỘNG ${actNum}:`, `HOẠT ĐỘNG ${actNum}.`, `HOẠT ĐỘNG ${actNum}`,
            `Hoạt động ${actNum}`, `HĐ ${actNum}:`, `HĐ${actNum}`
          ];

          // Ưu tiên tiêu đề bảng (*Chuyển giao...) trước Bước X để tránh khớp nhầm vào Phụ lục/Phiếu học tập
          if (subPart === 'BƯỚC_1') {
            searchPatterns = [
              '*Chuyển giao nhiệm vụ học tập', '*Chuyển giao nhiệm vụ', '*Chuyển giao',
              'Chuyển giao nhiệm vụ học tập', 'Chuyển giao nhiệm vụ', 'Chuyển giao',
              'B1.', 'B1:', 'B1 .', 'B1 ', 'B1', '*B1', '* B1',
              'Bước 1:', 'Bước 1.', 'Bước 1', 'bước 1', 'NV1:', 'NV1.', 'Nhiệm vụ 1:', 'Nhiệm vụ 1',
              '- Giao nhiệm vụ:', 'Giao nhiệm vụ:', '- Giao nhiệm vụ', '* Giao nhiệm vụ', '*GV giao nhiệm vụ',
              '1. Chuyển giao', 'a. Chuyển giao', 'a) Chuyển giao'
            ];
          } else if (subPart === 'BƯỚC_2') {
            searchPatterns = [
              '*Thực hiện nhiệm vụ học tập', '*Thực hiện nhiệm vụ', '*HS thực hiện',
              'Thực hiện nhiệm vụ học tập', 'Thực hiện nhiệm vụ', 'Thực hiện',
              'B2.', 'B2:', 'B2 .', 'B2 ', 'B2', '*B2', '* B2',
              'Bước 2:', 'Bước 2.', 'Bước 2', 'bước 2', 'NV2:', 'NV2.', 'Nhiệm vụ 2:', 'Nhiệm vụ 2',
              'Hướng dẫn HS thực hiện nhiệm vụ', 'Hướng dẫn HS thực hiện', '*Hướng dẫn HS',
              '- Hướng dẫn HS:', 'Hướng dẫn HS:',
              '2. Thực hiện', 'b. Thực hiện', 'b) Thực hiện'
            ];

          } else if (subPart === 'BƯỚC_3') {
            searchPatterns = [
              '*Báo cáo kết quả và thảo luận', '*Báo cáo kết quả', '*Báo cáo', '*Thảo luận',
              'Báo cáo kết quả và thảo luận', 'Báo cáo kết quả', 'Báo cáo, thảo luận', 'Báo cáo', 'Thảo luận',
              'B3.', 'B3:', 'B3 ', 'B3', '*B3', '* B3',
              'Bước 3:', 'Bước 3.', 'Bước 3', 'bước 3', 'NV3:', 'NV3.', 'Nhiệm vụ 3:', 'Nhiệm vụ 3',
              '- Báo cáo kết quả:', 'Báo cáo kết quả:',
              '3. Báo cáo', 'c. Báo cáo', 'c) Báo cáo'
            ];
          } else if (subPart === 'BƯỚC_4' || subPart === 'KẾT_LUẬN') {
            searchPatterns = [
              '*Đánh giá kết quả thực hiện nhiệm vụ', '*Đánh giá kết quả', '*Đánh giá',
              '*Kết luận, nhận định', '*Kết luận', '*Nhận xét',
              'Đánh giá kết quả thực hiện nhiệm vụ', 'Đánh giá kết quả', 'Kết luận, nhận định', 'Kết luận',
              'B4.', 'B4:', 'B4 ', 'B4', '*B4', '* B4',
              'Bước 4:', 'Bước 4.', 'Bước 4', 'bước 4', 'NV4:', 'NV4.', 'Nhiệm vụ 4:', 'Nhiệm vụ 4',
              '- Đánh giá kết quả thực hiện nhiệm vụ:', 'Đánh giá kết quả thực hiện nhiệm vụ:',
              '4. Kết luận', 'd. Kết luận', 'd) Kết luận'
            ];
          } else {
            // Cho TỔ_CHỨC, NỘI_DUNG, SẢN_PHẨM => Luôn ép chèn vào "d. Tổ chức thực hiện"
            searchPatterns = [
              'd) Tổ chức thực hiện', 'd. Tổ chức thực hiện', 'd.Tổ chức thực hiện',
              'd)Tổ chức', 'd.Tổ chức', 'Tổ chức thực hiện', 'd) Tổ chức', 'd. Tổ chức', '* Tổ chức'
            ];
          }
        }
        // Backward compatibility
        else if (marker === 'NỘI_DUNG' || marker === 'SẢN_PHẨM' || marker === 'TỔ_CHỨC') {
          searchPatterns = ['d) Tổ chức thực hiện', 'd. Tổ chức thực hiện', 'd.Tổ chức thực hiện', 'd)Tổ chức'];
        } else if (marker === 'BƯỚC_1') {
          searchPatterns = [
            '*Chuyển giao nhiệm vụ học tập', '*Chuyển giao nhiệm vụ', '*Chuyển giao',
            'Chuyển giao nhiệm vụ học tập', 'Chuyển giao nhiệm vụ', 'Chuyển giao',
            'B1.', 'B1:', 'B1 ', 'B1', '*B1', '* B1',
            'Bước 1:', 'Bước 1.', 'Bước 1', 'bước 1', 'NV1:', 'NV1.', 'Nhiệm vụ 1:', 'Nhiệm vụ 1',
            '- Giao nhiệm vụ:', 'Giao nhiệm vụ:', '- Giao nhiệm vụ', '* Giao nhiệm vụ', '*GV giao nhiệm vụ',
            '1. Chuyển giao', 'a. Chuyển giao', 'a) Chuyển giao'
          ];
        } else if (marker === 'BƯỚC_2') {
          searchPatterns = [
            '*Thực hiện nhiệm vụ học tập', '*Thực hiện nhiệm vụ', '*HS thực hiện',
            'Thực hiện nhiệm vụ học tập', 'Thực hiện nhiệm vụ', 'Thực hiện',
            'B2.', 'B2:', 'B2 ', 'B2', '*B2', '* B2',
            'Bước 2:', 'Bước 2.', 'Bước 2', 'bước 2', 'NV2:', 'NV2.', 'Nhiệm vụ 2:', 'Nhiệm vụ 2',
            'Hướng dẫn HS thực hiện nhiệm vụ', 'Hướng dẫn HS thực hiện', '*Hướng dẫn HS',
            '- Hướng dẫn HS:', 'Hướng dẫn HS:',
            '2. Thực hiện', 'b. Thực hiện', 'b) Thực hiện'
          ];
        } else if (marker === 'BƯỚC_3') {
          searchPatterns = [
            '*Báo cáo kết quả và thảo luận', '*Báo cáo kết quả', '*Báo cáo', '*Thảo luận',
            'Báo cáo kết quả và thảo luận', 'Báo cáo kết quả', 'Báo cáo, thảo luận', 'Báo cáo', 'Thảo luận',
            'B3.', 'B3:', 'B3 ', 'B3', '*B3', '* B3',
            'Bước 3:', 'Bước 3.', 'Bước 3', 'bước 3', 'NV3:', 'NV3.', 'Nhiệm vụ 3:', 'Nhiệm vụ 3',
            '- Báo cáo kết quả:', 'Báo cáo kết quả:',
            '3. Báo cáo', 'c. Báo cáo', 'c) Báo cáo'
          ];
        } else if (marker === 'BƯỚC_4') {
          searchPatterns = [
            '*Đánh giá kết quả thực hiện nhiệm vụ', '*Đánh giá kết quả', '*Đánh giá',
            '*Kết luận, nhận định', '*Kết luận', '*Nhận xét',
            'Đánh giá kết quả thực hiện nhiệm vụ', 'Đánh giá kết quả', 'Kết luận, nhận định', 'Kết luận',
            'B4.', 'B4:', 'B4 ', 'B4', '*B4', '* B4',
            'Bước 4:', 'Bước 4.', 'Bước 4', 'bước 4', 'NV4:', 'NV4.', 'Nhiệm vụ 4:', 'Nhiệm vụ 4',
            '- Đánh giá kết quả thực hiện nhiệm vụ:', 'Đánh giá kết quả thực hiện nhiệm vụ:',
            '4. Kết luận', 'd. Kết luận', 'd) Kết luận'
          ];
        } else if (marker === 'CỦNG_CỐ' || marker === 'BẢNG_TỔNG_HỢP') {
          searchPatterns = [
            'IV. DẶN DÒ', 'IV. CỦNG CỐ', 'V. HƯỚNG DẪN VỀ NHÀ',
            'Củng cố', 'Vận dụng', 'Hướng dẫn về nhà', 'Dặn dò',
            'Hoạt động 4', 'Hoạt động 3', 'Tiến trình dạy học'
          ];
        }
        // ================== STEM MARKERS: THIẾT BỊ GV & HS (STEM mini) ==================
        // Chèn phần Thiết bị STEM cho Giáo viên: TRƯỚC dòng "2. Học sinh:"
        else if (marker === 'THIẾT_BỊ_GV') {
          searchPatterns = [
            '2. Học sinh:', '2. Học sinh', '2.Học sinh:', '2.Học sinh',
            '2. học sinh:', '2. học sinh', '2.học sinh:', '2.học sinh',
            'b. Học sinh:', 'b. Học sinh', 'b) Học sinh:', 'b) Học sinh',
            'Đối với học sinh:', 'Đối với học sinh',
            'III. TIẾN TRÌNH DẠY HỌC', 'III. TIẾN TRÌNH', 'III. Tiến trình', 'III.Tiến trình',
            'TIẾN TRÌNH DẠY HỌC', 'Tiến trình dạy học'
          ];
        }
        // Chèn phần Thiết bị STEM cho Học sinh: TRƯỚC phần TIẾN TRÌNH DẠY HỌC
        else if (marker === 'THIẾT_BỊ_HS') {
          searchPatterns = [
            'III. TIẾN TRÌNH DẠY HỌC', 'III. TIẾN TRÌNH', 'III. Tiến trình', 'III.Tiến trình',
            'TIẾN TRÌNH DẠY HỌC', 'Tiến trình dạy học',
            'Hoạt động 1:', 'Hoạt động 1.', 'Hoạt động 1 ', 'HOẠT ĐỘNG 1',
            '1. Hoạt động Khởi động', '1. Khởi động', '1. Khởi động:', '1.Hoạt động 1'
          ];
        }
        // Chèn Dặn dò tiết sau (Lớp học đảo ngược): chèn VÀO CUỐI phần Dặn dò / Hướng dẫn tự học
        else if (marker === 'DẶN_DÒ_TIẾT_SAU') {
          searchPatterns = [
            'Hướng dẫn tự học', 'HƯỚNG DẪN TỰ HỌC', 'Hướng dẫn về nhà',
            'Dặn dò', 'DẶN DÒ', 'Dặn dò:', 'DẶN DÒ:',
            'IV. DẶN DÒ', 'IV. Dặn dò', '4. Dặn dò', '4. DẶN DÒ',
            'Hướng dẫn học sinh tự học', 'Hướng dẫn học bài', 'Hướng dẫn về nhà:',
            'HƯỚNG DẪN VỀ NHÀ', 'Hướng dẫn HS tự học', 'Hướng dẫn bài về nhà'
          ];
        }
        // ================== STEM RUBRIC: Bảng Rubric 3 tiêu chí ==================
        // Chèn bảng Rubric TRƯỚC phần Dặn dò / Hướng dẫn về nhà
        else if (marker === 'RUBRIC_STEM') {
          searchPatterns = [
            'Hướng dẫn tự học', 'HƯỚNG DẪN TỰ HỌC', 'Hướng dẫn về nhà',
            'Dặn dò', 'DẶN DÒ', 'Dặn dò:', 'DẶN DÒ:',
            'IV. DẶN DÒ', 'IV. Dặn dò', '4. Dặn dò', '4. DẶN DÒ',
            'Hướng dẫn học sinh tự học', 'Hướng dẫn học bài', 'Hướng dẫn về nhà:',
            'HƯỚNG DẪN VỀ NHÀ', 'Hướng dẫn HS tự học', 'Hướng dẫn bài về nhà'
          ];
        }
        // ================== BẢNG TỔNG HỢP HOẠT ĐỘNG NLS & AI ==================
        // Chèn vào CUỐI TÀI LIỆU (sau phần Dặn dò, trước w:sectPr)
        // searchPatterns không dùng — xử lý đặc biệt ở injectNLSWithDOMParser
        else if (marker === 'BẢNG_TỔNG_HỢP_HĐ') {
          searchPatterns = []; // Không tìm kiếm vị trí — chèn cuối tài liệu trực tiếp
        }
      }
      // ================== ENGLISH DC MARKERS ==================
      else if (prefix === 'DC') {
        if (marker === 'OBJECTIVES') {
          searchPatterns = [
            // Tiếng Anh (môn Tiếng Anh)
            '3. Attitudes', 'Attitudes', 'attitudes', 'ATTITUDES',
            '3. Character', 'II. TEACHING AIDS', 'II. EQUIPMENT',
            // Tiếng Việt (tương thích 2 chiều — khi AI lỡ sinh DC_ cho giáo án tiếng Việt)
            '3. Phẩm chất', '3.Phẩm chất', '3. Phẩm chất:', '3. Về phẩm chất',
            'c) Phẩm chất', 'c. Phẩm chất', 'Phẩm chất:', 'Phẩm chất',
            'III. TIẾN TRÌNH DẠY HỌC', 'III. Tiến trình', 'III. TIẾN TRÌNH',
            'II. THIẾT BỊ DẠY HỌC', 'II. Thiết bị', 'II. THIẾT BỊ'
          ];

        } else if (marker.startsWith('WARM_UP')) {
          const parts = marker.replace('WARM_UP_', '').split('_');
          const subPart = parts.join('_');

          const warmUpPatterns = [
            'A. Warm up', 'A.Warm up', 'Warm up:', 'WARM UP',
            'Warm up', 'warm up', 'Warm-up'
          ];

          if (subPart === 'ORGANIZATION' || subPart === '') {
            searchPatterns = [
              ...warmUpPatterns,
              'd) Organization', 'd. Organization', 'Organization:',
              "TEACHER'S ACTIVITIES", "STUDENTS' ACTIVITIES"
            ];
          } else if (subPart === 'CONTENT') {
            searchPatterns = [...warmUpPatterns, 'b) Content', 'b. Content', 'Content:'];
          } else if (subPart === 'OUTCOMES') {
            searchPatterns = [...warmUpPatterns, 'c) Outcomes', 'c. Outcomes', 'Outcomes:'];
          } else if (subPart === 'OBJECTIVE') {
            searchPatterns = [...warmUpPatterns, 'a) Objective', 'a. Objective', 'Objective:'];
          } else {
            searchPatterns = warmUpPatterns;
          }
        }
        // Parse ACTIVITY_X sections  
        else if (marker.startsWith('ACTIVITY_')) {
          const parts = marker.replace('ACTIVITY_', '').split('_');
          const actNum = parts[0]; // Activity number
          const subPart = parts.slice(1).join('_'); // POSITION: CONTENT, OUTCOMES, ORGANIZATION...

          // Search patterns for Activity X (English)
          const actPatternsEn = [
            `Activity ${actNum}:`, `Activity ${actNum}.`, `Activity ${actNum} `,
            `**Activity ${actNum}`, `ACTIVITY ${actNum}`, `Activity${actNum}`,
            `Activity ${actNum}`, `activity ${actNum}`,
            // Also support "Presentation", "Practice", "Production" naming
            ...(actNum === '1' ? ['Presentation', 'presentation', 'PRESENTATION'] : []),
            ...(actNum === '2' ? ['Practice', 'practice', 'PRACTICE'] : []),
            ...(actNum === '3' ? ['Production', 'production', 'PRODUCTION'] : [])
          ];

          // Tương thích 2 chiều: Bổ sung các mẫu Hoạt động tiếng Việt
          // để DC_ marker cũng tìm được khi áp dụng cho giáo án tiếng Việt
          const actPatternsVi = [
            `Hoạt động ${actNum}:`, `Hoạt động ${actNum}.`, `Hoạt động ${actNum} .`, `Hoạt động ${actNum} `,
            `HOẠT ĐỘNG ${actNum}:`, `HOẠT ĐỘNG ${actNum}.`, `HOẠT ĐỘNG ${actNum}`,
            `Hoạt động ${actNum}`, `HĐ ${actNum}:`, `HĐ ${actNum}.`, `HĐ${actNum}`
          ];

          const actPatterns = [...actPatternsEn, ...actPatternsVi];

          // Set activityPatterns để injectNLSWithDOMParser có thể khoanh vùng đúng Hoạt động X
          activityPatterns = actPatterns;

          if (subPart === 'CONTENT') {

            searchPatterns = [
              ...actPatterns,
              'b) Content', 'b. Content', 'Content:', 'b)Content',
              '* Content', '- Content', 'CONTENT'
            ];
          } else if (subPart === 'OUTCOMES') {
            searchPatterns = [
              ...actPatterns,
              'c) Outcomes', 'c. Outcomes', 'Outcomes:', 'c)Outcomes',
              '* Outcomes', '- Outcomes', 'OUTCOMES'
            ];
          } else if (subPart === 'ORGANIZATION') {
            searchPatterns = [
              ...actPatterns,
              // Tiếng Anh
              'd) Organization', 'd. Organization', 'd)Organization',
              'Organization:', '* Organization', 'ORGANIZATION',
              "TEACHER'S ACTIVITIES", "STUDENTS' ACTIVITIES",
              // Tiếng Việt — tương thích 2 chiều (giáo án KHTN/Sinh/Toán...)
              'd. Tổ chức thực hiện:', 'd. Tổ chức thực hiện', 'd) Tổ chức thực hiện',
              'd.Tổ chức thực hiện', 'd)Tổ chức thực hiện',
              'b. Tổ chức thực hiện:', 'b. Tổ chức thực hiện', 'b) Tổ chức thực hiện',
              'b.Tổ chức thực hiện', 'b)Tổ chức thực hiện',
              'B. Tổ chức thực hiện:', 'b. Tổ chức hoạt động:', 'Tổ chức thực hiện:',
              'Tổ chức thực hiện', 'HOẠT ĐỘNG CỦA GV - HS', 'HOẠT ĐỘNG CỦA GV VÀ HS',
              'B1. Chuyển giao nhiệm vụ học tập', 'B1. Chuyển giao',
              'B1 . Chuyển giao nhiệm vụ học tập', 'B1 . Chuyển giao',
              'Bước 1:', 'Bước 1.', 'Bước 1 :', '*Chuyển giao nhiệm vụ học tập'
            ];
          } else if (subPart === 'OBJECTIVE') {
            searchPatterns = [
              ...actPatterns,
              'a) Objective', 'a. Objective', 'Objective:', 'a)Objective',
              '* Objective', '- Objective'
            ];
          } else if (subPart === 'TEACHER_ACTIVITIES') {
            searchPatterns = [
              ...actPatterns,
              "TEACHER'S ACTIVITIES", "Teacher's Activities", "Teacher's activities"
            ];
          } else if (subPart === 'STUDENT_ACTIVITIES') {
            searchPatterns = [
              ...actPatterns,
              "STUDENTS' ACTIVITIES", "Students' Activities", "Students' activities"
            ];
          } else {
            // Fallback for ACTIVITY_X general (no specific POSITION)
            searchPatterns = actPatterns;
          }
        }
        // Parse CONSOLIDATION sections
        else if (marker.startsWith('CONSOLIDATION')) {
          const parts = marker.replace('CONSOLIDATION_', '').split('_');
          const subPart = parts.join('_');

          const consolidationPatterns = [
            'C. Consolidation', 'C.Consolidation', 'Consolidation:',
            'CONSOLIDATION', 'Consolidation', 'consolidation'
          ];

          if (subPart === 'ORGANIZATION' || subPart === '' || marker === 'CONSOLIDATION') {
            searchPatterns = [
              ...consolidationPatterns,
              'd) Organization', "TEACHER'S ACTIVITIES"
            ];
          } else {
            searchPatterns = consolidationPatterns;
          }
        }
        // Parse HOMEWORK sections
        else if (marker.startsWith('HOMEWORK')) {
          searchPatterns = [
            'D. Homework', 'D.Homework', 'Homework:',
            'HOMEWORK', 'Homework', 'homework'
          ];
        }
      }

      // BUG #4 FIX: Cập nhật mô tả standardizedLocation để khớp chính xác với hành vi chèn Word XML thực tế.
      // Các mô tả phản ánh đúng: BƯỚC_X chèn SAU dòng tiêu đề bước trong "d. Tổ chức thực hiện";
      // TỔ_CHỨC chèn ngay dưới tiêu đề "d. Tổ chức thực hiện" (trước nội dung đầu tiên của bảng GV-HS).
      let standardizedLocation = '';
      if (prefix === 'NLS') {
        if (marker === 'MỤC_TIÊU') {
          standardizedLocation = 'Mục I. MỤC TIÊU > Cuối phần "2. Năng lực" (Ngay TRƯỚC mục "3. Phẩm chất")';
        } else if (marker.startsWith('HOẠT_ĐỘNG_')) {
          const raw = marker.replace('HOẠT_ĐỘNG_', '');
          const parts = raw.split('_');
          let actNum = parts[0];
          let subPartIndex = 1;
          if (parts.length > 1 && !isNaN(Number(parts[1]))) {
            actNum = `${parts[0]}.${parts[1]}`;
            subPartIndex = 2;
          }
          const subPart = parts.slice(subPartIndex).join('_');
          if (subPart === 'BƯỚC_1') {
            standardizedLocation = `Hoạt động ${actNum} > d. Tổ chức thực hiện > Ngay SAU dòng "Bước 1: Chuyển giao nhiệm vụ học tập" (hoặc "*Chuyển giao nhiệm vụ học tập" trong bảng GV-HS)`;
          } else if (subPart === 'BƯỚC_2') {
            standardizedLocation = `Hoạt động ${actNum} > d. Tổ chức thực hiện > Ngay SAU dòng "Bước 2: Thực hiện nhiệm vụ học tập" (hoặc "*Thực hiện nhiệm vụ học tập" trong bảng GV-HS)`;
          } else if (subPart === 'BƯỚC_3') {
            standardizedLocation = `Hoạt động ${actNum} > d. Tổ chức thực hiện > Ngay SAU dòng "Bước 3: Báo cáo kết quả và thảo luận" (hoặc "*Báo cáo kết quả và thảo luận" trong bảng GV-HS)`;
          } else if (subPart === 'BƯỚC_4' || subPart === 'KẾT_LUẬN') {
            standardizedLocation = `Hoạt động ${actNum} > d. Tổ chức thực hiện > Ngay SAU dòng "Bước 4: Đánh giá kết quả" (hoặc "*Đánh giá kết quả thực hiện nhiệm vụ" trong bảng GV-HS)`;
          } else {
            standardizedLocation = `Hoạt động ${actNum} > d. Tổ chức thực hiện > Ngay dưới dòng "d. Tổ chức thực hiện:" (trước Chuyển giao nhiệm vụ học tập)`;
          }
        } else if (marker === 'BƯỚC_1') {
          standardizedLocation = 'd. Tổ chức thực hiện > Ngay SAU dòng "Bước 1: Chuyển giao nhiệm vụ học tập" (hoặc "*Chuyển giao nhiệm vụ" trong bảng GV-HS)';
        } else if (marker === 'BƯỚC_2') {
          standardizedLocation = 'd. Tổ chức thực hiện > Ngay SAU dòng "Bước 2: Thực hiện nhiệm vụ học tập" (hoặc "*Thực hiện nhiệm vụ học tập" trong bảng GV-HS)';
        } else if (marker === 'BƯỚC_3') {
          standardizedLocation = 'd. Tổ chức thực hiện > Ngay SAU dòng "Bước 3: Báo cáo kết quả và thảo luận" (hoặc "*Báo cáo kết quả" trong bảng GV-HS)';
        } else if (marker === 'BƯỚC_4') {
          standardizedLocation = 'd. Tổ chức thực hiện > Ngay SAU dòng "Bước 4: Đánh giá kết quả" (hoặc "*Đánh giá kết quả thực hiện nhiệm vụ" trong bảng GV-HS)';
        } else if (marker === 'CỦNG_CỐ' || marker === 'BẢNG_TỔNG_HỢP') {
          standardizedLocation = 'Cuối cùng của giáo án (Ngay SAU phần Vận dụng / Củng cố / Hướng dẫn về nhà)';
        } else if (marker === 'THIẾT_BỊ_GV') {
          standardizedLocation = 'Mục II. THIẾT BỊ DẠY HỌC > Cuối phần "1. Giáo viên:" (Ngay TRƯỚC dòng "2. Học sinh:")';
        } else if (marker === 'THIẾT_BỊ_HS') {
          standardizedLocation = 'Mục II. THIẾT BỊ DẠY HỌC > Cuối phần "2. Học sinh:" (Ngay TRƯỚC phần III. TIẾN TRÌNH DẠY HỌC)';
        } else if (marker === 'DẶN_DÒ_TIẾT_SAU') {
          standardizedLocation = 'Phần Hướng dẫn tự học / Dặn dò > Cuối bài (Chuẩn bị cho bài học tiếp theo)';
        } else if (marker === 'RUBRIC_STEM') {
          standardizedLocation = 'Cuối giáo án > Ngay TRƯỚC phần Dặn dò / Hướng dẫn về nhà (Bảng Rubric 3 tiêu chí STEM mini)';
        } else if (marker === 'BẢNG_TỔNG_HỢP_HĐ') {
          standardizedLocation = 'Cuối giáo án > Ngay SAU phần Dặn dò / Hướng dẫn về nhà (Bảng Tổng hợp Hoạt động NLS & AI)';
        } else {
          standardizedLocation = 'd. Tổ chức thực hiện > Ngay dưới dòng "d. Tổ chức thực hiện:" (trước Chuyển giao nhiệm vụ học tập)';
        }
      } else if (prefix === 'DC') {
        if (marker === 'OBJECTIVES') {
          standardizedLocation = 'Section I. OBJECTIVES > Under "2. Competence" (Right BEFORE "3. Attitudes")';
        } else if (marker.startsWith('WARM_UP')) {
          standardizedLocation = 'Warm-up Activity > Under "d) Organization" (Right AFTER "d) Organization" heading, before first activity row)';
        } else if (marker.startsWith('ACTIVITY_')) {
          const parts = marker.replace('ACTIVITY_', '').split('_');
          const actNum = parts[0];
          const subPart = parts.slice(1).join('_');
          if (subPart === 'ORGANIZATION') {
            standardizedLocation = `Activity ${actNum} > Right AFTER "d) Organization" heading (before first Teacher/Student activity row)`;
          } else if (subPart === 'CONTENT') {
            standardizedLocation = `Activity ${actNum} > Right AFTER "b) Content" heading`;
          } else if (subPart === 'OUTCOMES') {
            standardizedLocation = `Activity ${actNum} > Right AFTER "c) Outcomes" heading`;
          } else {
            standardizedLocation = `Activity ${actNum} > Under "d) Organization" (Right AFTER "d) Organization" heading)`;
          }
        } else if (marker.startsWith('CONSOLIDATION') || marker.startsWith('HOMEWORK')) {
          standardizedLocation = 'End of lesson plan (Right AFTER Consolidation / Homework)';
        } else {
          standardizedLocation = 'Under "d) Organization" of the corresponding activity';
        }
      }

      // BUG #1 FIX: Ưu tiên locationGuidance từ AI (|VITRI:...) vì nó chứa dòng cụ thể trong giáo án gốc.
      // standardizedLocation chỉ là fallback khi AI không cung cấp VITRI.
      // Nếu có cả hai, hiển thị VITRI của AI kèm vị trí chuẩn để người dùng đối chiếu.
      const finalLocationGuidance = locationGuidance
        ? `${locationGuidance}\n📌 Vị trí chuẩn: ${standardizedLocation}`
        : standardizedLocation;

      sections.push({
        marker: `${prefix}_${marker}`,
        content: sectionContent,
        activityPatterns,
        searchPatterns,
        locationGuidance: finalLocationGuidance,
        quotedText
      });
    }

    return sections;
  };

  // Helper: Tạo Table
  const createTableFromMarkdown = (tableLines: string[]): Table | null => {
    try {
      const validLines = tableLines.filter(line => !line.match(/^\|?\s*[-:]+[-|\s:]*\|?\s*$/));
      const rows = validLines.map(line => {
        const cells = line.split('|');
        if (line.trim().startsWith('|')) cells.shift();
        if (line.trim().endsWith('|')) cells.pop();
        return new TableRow({
          children: cells.map(cellContent => new TableCell({
            children: [new Paragraph({ children: parseTextWithFormatting(cellContent.trim()) })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            width: { size: 100 / cells.length, type: WidthType.PERCENTAGE }
          }))
        });
      });
      return new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } });
    } catch (e) {
      return null;
    }
  };

  // Làm sạch LaTeX → Unicode (xử lý các ký hiệu phổ biến trong giáo án)
  const cleanLatex = (text: string): string => {
    return text
      // Xử lý <br> thành dấu cách (sẽ được xử lý thành xuống dòng ở cấp cao hơn)
      .replace(/<br\s*\/?>/gi, '\n')
      // Ký hiệu nhiệt độ
      .replace(/\$\^\\circ\\text\{C\}\$/g, '°C')
      .replace(/\$\\text\{C\}\$/g, '°C')
      .replace(/\$\^\\circ C\$/g, '°C')
      .replace(/\$\\circ C\$/g, '°C')
      // Ký hiệu Kelvin
      .replace(/\$\\text\{K\}\$/g, 'K')
      .replace(/\$\^\\text\{K\}\$/g, 'K')
      // Dấu mũi tên
      .replace(/\$\\rightarrow\$/g, '→')
      .replace(/\\rightarrow/g, '→')
      // Phân số đơn giản trong LaTeX
      .replace(/\$\\frac\{([^}]+)\}\{([^}]+)\}\$/g, '$1/$2')
      // Số mũ đơn giản: $x^2$ → x²
      .replace(/\$(\w+)\^\{?2\}?\$/g, '$1²')
      .replace(/\$(\w+)\^\{?3\}?\$/g, '$1³')
      .replace(/\$(\w+)\^\{?n\}?\$/g, '$1ⁿ')
      // Tập hợp số
      .replace(/\$\\mathbb\{R\}\$/g, 'ℝ')
      .replace(/\$\\mathbb\{N\}\$/g, 'ℕ')
      // Phương trình dạng $ax + by = c$ → bỏ dấu $
      .replace(/\$([^$]+)\$/g, '$1')
      // Dọn dẹp LaTeX block $$...$$
      .replace(/\$\$([^$]+)\$\$/g, '$1')
      // Dọn dẹp lệnh \text{...}
      .replace(/\\text\{([^}]+)\}/g, '$1')
      // Dọn dẹp \begin{cases}...\end{cases}
      .replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, inner) =>
        inner.replace(/\\\\/g, '; ').replace(/\s+/g, ' ').trim()
      )
      // Dọn dẹp lệnh LaTeX còn sót \xxx
      .replace(/\\([a-zA-Z]+)\{([^}]*)\}/g, '$2')
      .replace(/\\([a-zA-Z]+)/g, '')
      // Dọn dẹp dấu { } còn lại
      .replace(/[{}]/g, '')
      .trim();
  };

  // Helper: Parse text với định dạng → TextRun[] (dùng cho DOCX export)
  const parseTextWithFormatting = (text: string): TextRun[] => {
    // Làm sạch LaTeX và <br> trước khi parse định dạng
    const cleanedText = cleanLatex(text);
    const parts = cleanedText.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<blue>.*?<\/blue>|<purple>.*?<\/purple>|<green>.*?<\/green>|<orange>.*?<\/orange>|<red>.*?<\/red>)/g);
    return parts.map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true });
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return new TextRun({ text: part.slice(1, -1), italics: true });
      }
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return new TextRun({ text: part.replace(/<\/?u>/g, ''), underline: { type: UnderlineType.SINGLE } });
      }
      if (part.startsWith('<blue>') && part.endsWith('</blue>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?blue>/g, '')), color: "DC2626", bold: true });
      }
      if (part.startsWith('<purple>') && part.endsWith('</purple>')) {
        return new TextRun({ text: cleanLatex(part.replace(/\<\/?purple\>/g, '')), color: "0055D4", bold: true });
      }
      if (part.startsWith('<green>') && part.endsWith('</green>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?green>/g, '')), color: "7B2FBE", italics: true });
      }
      if (part.startsWith('<orange>') && part.endsWith('</orange>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?orange>/g, '')), color: "B45309", italics: true });
      }
      if (part.startsWith('<red>') && part.endsWith('</red>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?red>/g, '')), color: "FF0000" });
      }
      return new TextRun({ text: part });
    });
  };

  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Helper: Chuyển đổi một dòng markdown/thẻ màu thành các <w:r> trong Word XML
  const convertLineToWordRunsXml = (line: string): string => {
    const cleaned = cleanLatex(line);
    const tokenRegex = /(<blue>[\s\S]*?<\/blue>|<purple>[\s\S]*?<\/purple>|<green>[\s\S]*?<\/green>|<orange>[\s\S]*?<\/orange>|<red>[\s\S]*?<\/red>|<u>[\s\S]*?<\/u>|\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g;
    const parts = cleaned.split(tokenRegex);
    let runsXml = '';

    for (const part of parts) {
      if (!part) continue;
      let text = part;
      let isBlue = false;
      let isPurple = false;
      let isGreen = false;
      let isOrange = false;
      let isRed = false;
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;

      if (part.startsWith('<blue>') && part.endsWith('</blue>')) {
        isBlue = true;
        text = part.slice(6, -7);
      } else if (part.startsWith('<purple>') && part.endsWith('</purple>')) {
        isPurple = true;
        text = part.slice(8, -9);
      } else if (part.startsWith('<green>') && part.endsWith('</green>')) {
        isGreen = true;
        isItalic = true;
        text = part.slice(7, -8);
      } else if (part.startsWith('<orange>') && part.endsWith('</orange>')) {
        isOrange = true;
        isItalic = true;
        text = part.slice(8, -9);
      } else if (part.startsWith('<red>') && part.endsWith('</red>')) {
        isRed = true;
        text = part.slice(5, -6);
      } else if (part.startsWith('<u>') && part.endsWith('</u>')) {
        isUnderline = true;
        text = part.slice(3, -4);
      } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        isBold = true;
        text = part.slice(2, -2);
      } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        isItalic = true;
        text = part.slice(1, -1);
      }

      // Xử lý nếu bên trong còn lồng tiếp thẻ
      if (text.includes('<blue>') || text.includes('</blue>')) {
        isBlue = true;
        text = text.replace(/<\/?blue>/g, '');
      }
      if (text.includes('<purple>') || text.includes('</purple>')) {
        isPurple = true;
        text = text.replace(/<\/?purple>/g, '');
      }
      if (text.includes('<green>') || text.includes('</green>')) {
        isGreen = true;
        isItalic = true;
        text = text.replace(/<\/?green>/g, '');
      }
      if (text.includes('<orange>') || text.includes('</orange>')) {
        isOrange = true;
        isItalic = true;
        text = text.replace(/<\/?orange>/g, '');
      }
      if (text.includes('<red>') || text.includes('</red>')) {
        isRed = true;
        text = text.replace(/<\/?red>/g, '');
      }
      if (text.startsWith('**') && text.endsWith('**') && text.length >= 4) {
        isBold = true;
        text = text.slice(2, -2);
      }
      if (text.startsWith('*') && text.endsWith('*') && text.length >= 2) {
        isItalic = true;
        text = text.slice(1, -1);
      }

      const escapedText = escapeXml(text);
      if (!escapedText) continue;

      let rPr = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
      if (isBold) rPr += `<w:b/>`;
      if (isItalic) rPr += `<w:i/>`;
      if (isUnderline) rPr += `<w:u w:val="single"/>`;
      if (isBlue) rPr += `<w:color w:val="DC2626"/>`;
      else if (isPurple) rPr += `<w:color w:val="0055D4"/>`;
      else if (isGreen) rPr += `<w:color w:val="7B2FBE"/>`;
      else if (isOrange) rPr += `<w:color w:val="B45309"/>`;
      else if (isRed) rPr += `<w:color w:val="FF0000"/>`;

      runsXml += `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapedText}</w:t></w:r>`;
    }

    return runsXml;
  };

  // Helper: Chuyển đổi Markdown Table sang Word XML Table (<w:tbl>)
  const convertMarkdownTableToWordXmlTable = (markdown: string): string => {
    const lines = markdown.split('\n').filter(l => l.trim().startsWith('|'));
    const validLines = lines.filter(line => !line.match(/^\|?\s*[-:]+[-|\s:]*\|?\s*$/));
    if (validLines.length === 0) return '';

    let tblXml = `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
      </w:tblPr>`;

    validLines.forEach((line, rowIndex) => {
      const cells = line.split('|');
      if (line.trim().startsWith('|')) cells.shift();
      if (line.trim().endsWith('|')) cells.pop();

      const isHeader = rowIndex === 0;
      tblXml += `<w:tr>`;

      cells.forEach((cellText, colIndex) => {
        const cleanCell = escapeXml(cellText.trim().replace(/<\/?(blue|purple|green|orange|red)>/g, '').replace(/\*\*/g, ''));
        const totalCols = cells.length;
        const isCenter = colIndex === 0 || isHeader;
        const alignXml = isCenter ? `<w:jc w:val="center"/>` : `<w:jc w:val="both"/>`;
        const boldXml = isHeader ? `<w:b/>` : ``;
        const shdXml = isHeader ? `<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>` : ``;

        tblXml += `<w:tc>
          <w:tcPr>
            ${shdXml}
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              ${alignXml}
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
                ${boldXml}
              </w:rPr>
              <w:t>${cleanCell}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
      });

      tblXml += `</w:tr>`;
    });

    tblXml += `</w:tbl>`;
    return tblXml;
  };

  // Chuyển Markdown sang Word XML - HỖ TRỢ CẢ ĐOẠN VĂN (<w:p>) VÀ BẢNG THỰC (<w:tbl>)
  const convertMarkdownToWordXml = (markdown: string): string => {
    // Bước 1: Thay thế <br> thành ký tự xuống dòng thực sự trước khi split
    const normalizedMarkdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    const lines = normalizedMarkdown.split('\n');
    let xml = '';
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        const tblXml = convertMarkdownTableToWordXmlTable(tableBuffer.join('\n'));
        if (tblXml) {
          xml += tblXml;
        }
        tableBuffer = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Bỏ qua các dòng thông báo/hướng dẫn
      if (trimmed.startsWith('[Chèn') || trimmed.startsWith('(Chèn') ||
        trimmed.startsWith('[chèn') || trimmed.startsWith('(chèn') ||
        trimmed.startsWith('(tiếp tục') || trimmed.startsWith('[tiếp tục') ||
        trimmed.startsWith('...') || (trimmed.startsWith('===') && trimmed.endsWith('==='))) {
        continue;
      }

      // Phát hiện dòng bảng Markdown
      if (trimmed.startsWith('|')) {
        inTable = true;
        tableBuffer.push(trimmed);
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (!trimmed) continue;

      let processedLine = trimmed;

      // Tiêu đề bảng markdown dạng "### BẢNG TIÊU CHÍ ĐÁNH GIÁ..."
      if (processedLine.startsWith('### ') || processedLine.startsWith('## ')) {
        const headingText = processedLine.replace(/^#+\s*/, '');
        xml += `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>${escapeXml(headingText)}</w:t></w:r></w:p>`;
        continue;
      }

      // Loại bỏ "* Tích hợp NLS:" hoặc "Tích hợp NLS:" ở đầu dòng nhưng GIỮ NGUYÊN MÃ NLS (1.1.TC1a:)
      processedLine = processedLine.replace(/^\*?\s*Tích hợp NLS:\s*/i, '- ');

      const runsXml = convertLineToWordRunsXml(processedLine);
      if (runsXml) {
        xml += `<w:p>${runsXml}</w:p>`;
      }
    }

    if (inTable) {
      flushTable();
    }

    return xml;
  };

  // Helper: Chuyển đổi Markdown Table sang HTML Table chuẩn cho Clipboard (Copy vào Word ra bảng thực)
  const markdownTableToHtmlTable = (markdown: string): string => {
    const lines = markdown.split('\n').filter(l => l.trim().startsWith('|'));
    const validLines = lines.filter(line => !line.match(/^\|?\s*[-:]+[-|\s:]*\|?\s*$/));
    if (validLines.length === 0) return '';

    let html = `<table border="1" style="border-collapse: collapse; width: 100%; font-family: 'Times New Roman', Times, serif; font-size: 13pt; margin-top: 8px; margin-bottom: 8px;">`;
    validLines.forEach((line, rowIndex) => {
      const cells = line.split('|');
      if (line.trim().startsWith('|')) cells.shift();
      if (line.trim().endsWith('|')) cells.pop();

      const isHeader = rowIndex === 0;
      html += `<tr>`;
      cells.forEach(cellText => {
        const cleanCell = cleanLatex(cellText.trim().replace(/<\/?blue>/g, '').replace(/<\/?purple>/g, '').replace(/<\/?green>/g, '').replace(/<\/?orange>/g, '').replace(/<\/?red>/g, ''));
        const tag = isHeader ? 'th' : 'td';
        const style = isHeader
          ? 'border: 1px solid #000000; padding: 6px 10px; font-weight: bold; background-color: #f3f4f6; text-align: center;'
          : 'border: 1px solid #000000; padding: 6px 10px; vertical-align: middle; text-align: left;';
        html += `<${tag} style="${style}">${cleanCell}</${tag}>`;
      });
      html += `</tr>`;
    });
    html += `</table>`;
    return html;
  };

  // Helper: Chuyển Markdown thành Rich HTML để dán vào Word có màu sắc & font chuẩn
  const convertMarkdownToHtmlForClipboard = (content: string): string => {
    if (content.trim().startsWith('|')) {
      return markdownTableToHtmlTable(content);
    }

    const lines = content.split('\n');
    let html = `<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35;">`;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || (trimmed.startsWith('===') && trimmed.endsWith('==='))) continue;

      let clean = cleanLatex(trimmed);
      let isBlue = clean.includes('<blue>');
      let isPurple = clean.includes('<purple>');
      let isGreen = clean.includes('<green>');
      let isOrange = clean.includes('<orange>');
      let isRed = clean.includes('<red>');

      clean = clean.replace(/<\/?blue>/g, '').replace(/<\/?purple>/g, '').replace(/<\/?green>/g, '').replace(/<\/?orange>/g, '').replace(/<\/?red>/g, '');
      // Chuyển Markdown **...** thành <b>...</b>
      clean = clean.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      clean = clean.replace(/\*(.*?)\*/g, '<i>$1</i>');

      let style = "margin-bottom: 4px; font-family: 'Times New Roman', Times, serif;";
      if (isBlue) {
        style += " color: #dc2626; font-weight: 600;";
      } else if (isPurple) {
        style += " color: #1d4ed8; font-weight: 600;";
      } else if (isGreen) {
        style += " color: #7e22ce; font-style: italic;";
      } else if (isOrange) {
        style += " color: #b45309; font-style: italic;";
      } else if (isRed) {
        style += " color: #dc2626;";
      }

      html += `<p style="${style}">${clean}</p>`;
    }
    html += `</div>`;
    return html;
  };

  // Helper: Chuyển Markdown thành Plain Text sạch sẽ không còn thẻ tag
  const convertMarkdownToCleanPlainText = (content: string): string => {
    let clean = cleanLatex(content);
    clean = clean.replace(/<\/?blue>/g, '').replace(/<\/?purple>/g, '').replace(/<\/?green>/g, '').replace(/<\/?orange>/g, '').replace(/<\/?red>/g, '').replace(/<\/?u>/g, '');
    clean = clean.replace(/\*\*(.*?)\*\*/g, '$1');
    clean = clean.replace(/\*(.*?)\*/g, '$1');
    return clean.trim();
  };

  // Hàm sao chép thông minh: Ghi cả Rich HTML (giữ màu/bảng cho Word) và Plain Text sạch
  const copyRichContentToClipboard = async (content: string): Promise<boolean> => {
    const plainText = convertMarkdownToCleanPlainText(content);
    const htmlText = convertMarkdownToHtmlForClipboard(content);

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        await navigator.clipboard.write([item]);
        return true;
      } else {
        await navigator.clipboard.writeText(plainText);
        return true;
      }
    } catch (e) {
      console.warn("ClipboardItem write failed, fallback to plain text:", e);
      try {
        await navigator.clipboard.writeText(plainText);
        return true;
      } catch (err) {
        console.error("Clipboard copy failed entirely:", err);
        return false;
      }
    }
  };

// (convertMarkdownTableToWordXmlTable moved above convertMarkdownToWordXml)

  // Helper: DOMParser XML Injection sau/trước node hoặc trong Scope
  const injectNLSWithDOMParser = (
    xmlString: string,
    sections: NLSSection[]
  ): { resultXml: string; insertedCount: number; notInsertedSections: string[] } => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    // Kiểm tra xem parse có lỗi không
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError && parseError.length > 0) {
      console.error("DOMParser XML parse error:", parseError[0].textContent);
      return { resultXml: xmlString, insertedCount: 0, notInsertedSections: sections.map(s => s.marker) };
    }

    // Lấy tất cả các paragraph nodes trong w:body
    const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));

    // Hàm chuyển đổi chuỗi XML NLS thành danh sách các node XML để chèn vào doc
    const parseNLSNodes = (nlsXmlStr: string): Node[] => {
      const wrapped = `<root xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${nlsXmlStr}</root>`;
      const nlsDoc = parser.parseFromString(wrapped, 'application/xml');
      const root = nlsDoc.documentElement;
      const nodes: Node[] = [];
      for (let i = 0; i < root.childNodes.length; i++) {
        const imported = xmlDoc.importNode(root.childNodes[i], true);
        nodes.push(imported);
      }
      return nodes;
    };

    // Hàm chuẩn hóa văn bản để so sánh (bỏ khoảng trắng thừa, lowercase)
    const normalizeText = (text: string): string => {
      return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };

    // Hàm lọc sạch dấu câu và ký tự đầu dòng để so khớp nội dung cốt lõi
    const cleanPunctuation = (text: string): string => {
      return text.toLowerCase().replace(/[*_\-+:.,;!?"'“”‘’()[\]{}/\\~`]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    let insertedCount = 0;
    const notInsertedSections: string[] = [];

    for (const section of sections) {
      // Bỏ qua bảng tổng hợp cũ — không chèn vào file Word (chỉ giữ BẢNG_TỔNG_HỢP_HĐ mới)
      if ((section.marker.includes('BẢNG_TỔNG_HỢP') && !section.marker.includes('BẢNG_TỔNG_HỢP_HĐ')) || section.marker.includes('SUMMARY_TABLE')) {
        continue;
      }

      let nlsXmlStr = '';
      if (section.marker.includes('BẢNG_TỔNG_HỢP_HĐ')) {
        nlsXmlStr = `
          <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="0055D4"/></w:pBdr></w:pPr></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>BẢNG TỔNG HỢP HOẠT ĐỘNG NĂNG LỰC SỐ (NLS) VÀ AI TÍCH HỢP</w:t></w:r></w:p>
          ${convertMarkdownTableToWordXmlTable(section.content)}
        `;
      } else if (section.content.trim().startsWith('|') || section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE')) {
        nlsXmlStr = `
          <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="0055D4"/></w:pBdr></w:pPr></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>BẢNG TỔNG HỢP NĂNG LỰC SỐ TRONG BÀI HỌC</w:t></w:r></w:p>
          ${convertMarkdownTableToWordXmlTable(section.content)}
        `;
      } else {
        nlsXmlStr = convertMarkdownToWordXml(section.content);
      }

      const nlsNodes = parseNLSNodes(nlsXmlStr);
      if (nlsNodes.length === 0) continue;

      let inserted = false;

      // 1. Cho Bảng tổng hợp hoạt động NLS & AI -> Chèn vào CUỐI CÙNG của giáo án (sau phần Dặn dò, trước w:sectPr)
      if (section.marker.includes('BẢNG_TỔNG_HỢP_HĐ') || section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE')) {
        const bodyNode = xmlDoc.getElementsByTagName('w:body')[0];
        if (bodyNode) {
          const sectPr = bodyNode.getElementsByTagName('w:sectPr')[0];
          nlsNodes.forEach(node => {
            if (sectPr && sectPr.parentNode === bodyNode) {
              bodyNode.insertBefore(node, sectPr);
            } else {
              bodyNode.appendChild(node);
            }
          });
          inserted = true;
          console.log(`✓ DOMParser đã chèn BẢNG_TỔNG_HỢP_HĐ vào cuối tài liệu`);
        }
      }
      // 2. Nếu là Mục tiêu -> Tìm TRƯỚC "3. Phẩm chất" hoặc "III. Tiến trình"
      else if (section.marker.includes('MỤC_TIÊU') || section.marker.includes('OBJECTIVES')) {
        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const targetP = paragraphs.find(p => normalizeText(p.textContent || '').includes(normPattern));
          if (targetP && targetP.parentNode) {
            // Chèn TRƯỚC targetP
            nlsNodes.forEach(node => {
              targetP.parentNode?.insertBefore(node, targetP);
            });
            inserted = true;
            break;
          }
        }

        // Fallback cho Mục tiêu: Chèn SAU "2. Năng lực" hoặc "2.2 Năng lực đặc thù"
        if (!inserted) {
          const fallbackPatterns = ['2.2. Năng lực đặc thù', '2.2 Năng lực đặc thù', '2.2.', '2. Năng lực'];
          for (const pattern of fallbackPatterns) {
            const normPattern = normalizeText(pattern);
            const targetP = paragraphs.find(p => normalizeText(p.textContent || '').includes(normPattern));
            if (targetP && targetP.parentNode) {
              // Chèn SAU targetP
              const refNode = targetP.nextSibling;
              nlsNodes.forEach(node => {
                targetP.parentNode?.insertBefore(node, refNode);
              });
              inserted = true;
              break;
            }
          }
        }
      } 
      // 3. Nếu là Thiết bị STEM Giáo viên -> Tìm và chèn TRƯỚC dòng "2. Học sinh:"
      else if (section.marker.includes('THIẾT_BỊ_GV')) {
        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const compactPattern = normPattern.replace(/\s+/g, '');
          const targetP = paragraphs.find(p => {
            const normP = normalizeText(p.textContent || '');
            return normP.includes(normPattern) || normP.replace(/\s+/g, '').includes(compactPattern);
          });
          if (targetP && targetP.parentNode) {
            // Chèn TRƯỚC targetP (ngay trước dòng "2. Học sinh:")
            nlsNodes.forEach(node => {
              targetP.parentNode?.insertBefore(node, targetP);
            });
            inserted = true;
            console.log(`✓ DOMParser đã chèn THIẾT_BỊ_GV thành công trước: "${pattern}"`);
            break;
          }
        }
      }
      // 4. Nếu là Thiết bị STEM Học sinh -> Tìm và chèn TRƯỚC dòng "III. Tiến trình dạy học"
      else if (section.marker.includes('THIẾT_BỊ_HS')) {
        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const compactPattern = normPattern.replace(/\s+/g, '');
          const targetP = paragraphs.find(p => {
            const normP = normalizeText(p.textContent || '');
            return normP.includes(normPattern) || normP.replace(/\s+/g, '').includes(compactPattern);
          });
          if (targetP && targetP.parentNode) {
            // Chèn TRƯỚC targetP (ngay trước dòng "III. Tiến trình dạy học")
            nlsNodes.forEach(node => {
              targetP.parentNode?.insertBefore(node, targetP);
            });
            inserted = true;
            console.log(`✓ DOMParser đã chèn THIẾT_BỊ_HS thành công trước: "${pattern}"`);
            break;
          }
        }
      }
      // 5. Nếu là Dặn dò tiết sau (Lớp học đảo ngược) -> Tìm và chèn SAU phần Dặn dò / Hướng dẫn tự học
      else if (section.marker.includes('DẶN_DÒ_TIẾT_SAU')) {
        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const compactPattern = normPattern.replace(/\s+/g, '');
          const targetP = paragraphs.find(p => {
            const normP = normalizeText(p.textContent || '');
            return normP.includes(normPattern) || normP.replace(/\s+/g, '').includes(compactPattern);
          });
          if (targetP && targetP.parentNode) {
            // Chèn SAU targetP
            const nextSibling = targetP.nextSibling;
            nlsNodes.forEach(node => {
              if (nextSibling) {
                targetP.parentNode?.insertBefore(node, nextSibling);
              } else {
                targetP.parentNode?.appendChild(node);
              }
            });
            inserted = true;
            console.log(`✓ DOMParser đã chèn DẶN_DÒ_TIẾT_SAU thành công sau: "${pattern}"`);
            break;
          }
        }
        // Fallback: Nếu không tìm thấy heading dặn dò thì chèn vào cuối tài liệu (trước w:sectPr)
        if (!inserted) {
          const bodyNode = xmlDoc.getElementsByTagName('w:body')[0];
          if (bodyNode) {
            const sectPr = bodyNode.getElementsByTagName('w:sectPr')[0];
            nlsNodes.forEach(node => {
              if (sectPr && sectPr.parentNode === bodyNode) {
                bodyNode.insertBefore(node, sectPr);
              } else {
                bodyNode.appendChild(node);
              }
            });
            inserted = true;
            console.log(`✓ DOMParser fallback chèn DẶN_DÒ_TIẾT_SAU vào cuối văn bản`);
          }
        }
      }
      // 6. Bảng Rubric STEM -> Tìm và chèn TRƯỚC phần Dặn dò / Hướng dẫn về nhà
      else if (section.marker.includes('RUBRIC_STEM')) {
        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const compactPattern = normPattern.replace(/\s+/g, '');
          const targetP = paragraphs.find(p => {
            const normP = normalizeText(p.textContent || '');
            return normP.includes(normPattern) || normP.replace(/\s+/g, '').includes(compactPattern);
          });
          if (targetP && targetP.parentNode) {
            // Chèn TRƯỚC targetP (ngay trước dòng Dặn dò)
            nlsNodes.forEach(node => {
              targetP.parentNode?.insertBefore(node, targetP);
            });
            inserted = true;
            console.log(`✓ DOMParser đã chèn RUBRIC_STEM thành công trước: "${pattern}"`);
            break;
          }
        }
        // Fallback: nếu không tìm thấy Dặn dò -> chèn cuối tài liệu (trước w:sectPr)
        if (!inserted) {
          const bodyNode = xmlDoc.getElementsByTagName('w:body')[0];
          if (bodyNode) {
            const sectPr = bodyNode.getElementsByTagName('w:sectPr')[0];
            nlsNodes.forEach(node => {
              if (sectPr && sectPr.parentNode === bodyNode) {
                bodyNode.insertBefore(node, sectPr);
              } else {
                bodyNode.appendChild(node);
              }
            });
            inserted = true;
            console.log(`✓ DOMParser fallback chèn RUBRIC_STEM vào cuối văn bản`);
          }
        }
      }
      // 6. Cho các Hoạt động -> Dùng Scoped Search (Khoanh vùng Hoạt động X)
      else {
        let scopeStartIdx = -1;
        let scopeEndIdx = paragraphs.length;

        // BẮT ĐẦU SCOPE: Tìm tiêu đề Hoạt động X
        if (section.activityPatterns && section.activityPatterns.length > 0) {
          for (const actPattern of section.activityPatterns) {
            const normAct = normalizeText(actPattern);
            const idx = paragraphs.findIndex(p => normalizeText(p.textContent || '').includes(normAct));
            if (idx !== -1) {
              scopeStartIdx = idx;
              break;
            }
          }
        }

        // KẾT THÚC SCOPE: Khớp tiêu đề Hoạt động CÓ SỐ THỨ TỰ (VD: "Hoạt động 2:", "1. Hoạt động 1", "Hđ 3.", "Hoạt động 2.2")
        // hoặc các mục kết thúc như III. Tiến trình, IV. Củng cố, V. Dặn dò, Bảng tổng hợp
        if (scopeStartIdx !== -1) {
          for (let i = scopeStartIdx + 1; i < paragraphs.length; i++) {
            const text = normalizeText(paragraphs[i].textContent || '');
            if (
              /^hoạt động \d[\d.]*/.test(text) || 
              /^\d+\.\s*hoạt động \d[\d.]*/.test(text) || 
              /^hđ \d[\d.]*/.test(text) || 
              /^activity \d[\d.]*/i.test(text) ||
              /^\d+\.\s*activity \d[\d.]*/i.test(text) ||
              text.startsWith('iii. tiến trình dạy học') ||
              text.startsWith('iv. dặn dò') ||
              text.startsWith('iv. củng cố') ||
              text.startsWith('v. hướng dẫn về nhà') ||
              text.startsWith('bảng tổng hợp')
            ) {
              scopeEndIdx = i;
              break;
            }
          }
        }

        // Tìm từ khóa vị trí trong vùng scope (từ scopeStartIdx đến scopeEndIdx)
        const scopedParagraphs = scopeStartIdx !== -1 
          ? paragraphs.slice(scopeStartIdx, scopeEndIdx) 
          : paragraphs;

        // Giới hạn trong phần "d. Tổ chức thực hiện" cho BƯỚC / TỔ_CHỨC markers
        const isBuocMarker = section.marker.includes('BƯỚC_') || section.marker.includes('STEP_') || section.marker.includes('TỔ_CHỨC') || section.marker.includes('ORGANIZATION');
        let finalSearchScope = scopedParagraphs;

        if (isBuocMarker) {
          const tochuNormPatterns = [
            // Mẫu chuẩn CV 5512
            'd) tổ chức thực hiện', 'd. tổ chức thực hiện', 'd.tổ chức thực hiện',
            'd)tổ chức', 'd. tổ chức',
            // Mẫu thực tế của nhiều GV (b. thay vì d.)
            'b. tổ chức thực hiện', 'b) tổ chức thực hiện', 'b.tổ chức thực hiện',
            'b)tổ chức', 'b. tổ chức', 'b. tổ chức hoạt động',
            'tổ chức thực hiện',
            // Tiêu đề bảng 2 cột
            'hoạt động của gv - hs', 'hoạt động của gv và hs',
            'hoat dong cua gv', 'hoạt động của giáo viên'
          ];
          const tochuIdx = scopedParagraphs.findIndex(p =>
            tochuNormPatterns.some(pat => normalizeText(p.textContent || '').includes(pat))
          );
          if (tochuIdx !== -1) {
            // Giới hạn tìm kiếm từ dòng "d. Tổ chức thực hiện" trở đi
            finalSearchScope = scopedParagraphs.slice(tochuIdx);
          }
        }


        let targetP: Element | null = null;

        // =========================================================================
        // TIER 1 (ƯU TIÊN SỐ 1 - EXACT QUOTATION MATCH):
        // Nếu AI có trích dẫn câu cụ thể ("Sau dòng: ..."), tìm chính xác dòng đó trong finalSearchScope
        // Giúp file Word khớp 100% từng câu với Tab hướng dẫn thủ công!
        // =========================================================================
        if (section.quotedText && section.quotedText.length >= 3) {
          const normQuote = normalizeText(section.quotedText);
          const cleanQuote = cleanPunctuation(section.quotedText);

          const foundByQuote = finalSearchScope.find(p => {
            const pRaw = p.textContent || '';
            const normPText = normalizeText(pRaw);
            const cleanPText = cleanPunctuation(pRaw);

            // So khớp nguyên bản hoặc so khớp sau khi lọc sạch dấu câu
            if (normPText.includes(normQuote) || cleanPText.includes(cleanQuote)) return true;

            // So khớp đoạn đầu (ít nhất 15 ký tự)
            if (cleanQuote.length >= 15 && cleanPText.includes(cleanQuote.substring(0, 15))) return true;

            return false;
          });

          if (foundByQuote) {
            targetP = foundByQuote;
            console.log(`✓ [Tier 1 Quotation Match] Khớp chính xác câu trích dẫn của AI cho ${section.marker}: "${section.quotedText.substring(0, 50)}..."`);
          }
        }

        // =========================================================================
        // TIER 2 (FALLBACK - STEP HEADING MATCH):
        // Nếu không khớp câu trích dẫn, fallback tìm theo tiêu đề bước trong finalSearchScope
        // =========================================================================
        if (!targetP) {
          for (const pattern of section.searchPatterns) {
            const normPattern = normalizeText(pattern);
            const found = finalSearchScope.find(p => normalizeText(p.textContent || '').includes(normPattern));
            if (found) {
              targetP = found;
              console.log(`✓ [Tier 2 Fallback Match] Khớp theo tiêu đề bước cho ${section.marker}: "${pattern}"`);
              break;
            }
          }
        }

        if (targetP && targetP.parentNode) {
          // Chèn SAU targetP
          const refNode = targetP.nextSibling;
          nlsNodes.forEach(node => {
            targetP.parentNode?.insertBefore(node, refNode);
          });
          inserted = true;
        }
      }

      if (inserted) {
        insertedCount++;
        console.log(`✓ DOMParser đã chèn NLS thành công cho: ${section.marker}`);
      } else {
        notInsertedSections.push(section.marker);
        console.log(`✗ DOMParser không tìm thấy vị trí cho: ${section.marker}`);
      }
    }

    // Nếu có section không chèn được, chèn vào cuối body
    if (notInsertedSections.length > 0) {
      const bodyNode = xmlDoc.getElementsByTagName('w:body')[0];
      if (bodyNode) {
        let fallbackXmlStr = `
          <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="0055D4"/></w:pBdr></w:pPr></w:p>
          <w:p><w:r><w:rPr><w:color w:val="0055D4"/></w:rPr><w:t>═══ NỘI DUNG NLS BỔ SUNG ═══</w:t></w:r></w:p>
        `;

        for (const section of sections) {
          if (notInsertedSections.includes(section.marker)) {
            fallbackXmlStr += `<w:p><w:r><w:rPr><w:color w:val="0055D4"/></w:rPr><w:t>[${section.marker}]</w:t></w:r></w:p>`;
            fallbackXmlStr += convertMarkdownToWordXml(section.content);
          }
        }

        const fallbackNodes = parseNLSNodes(fallbackXmlStr);
        fallbackNodes.forEach(node => {
          bodyNode.appendChild(node);
        });
      }
    }

    const resultXml = serializer.serializeToString(xmlDoc);
    return { resultXml, insertedCount, notInsertedSections };
  };

  // XML Injection với NHIỀU vị trí chèn sử dụng DOMParser
  const injectContentToDocx = async (
    originalArrayBuffer: ArrayBuffer,
    aiResult: string
  ): Promise<Blob> => {
    const zip = await JSZip.loadAsync(originalArrayBuffer);

    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('File DOCX không hợp lệ');
    }

    const documentXml = await documentXmlFile.async('string');

    // Parse tất cả các section từ kết quả AI
    const sections = parseAllNLSSections(aiResult);

    // Chèn nội dung bằng DOMParser
    const { resultXml, insertedCount } = injectNLSWithDOMParser(documentXml, sections);

    console.log(`DOMParser XML Injection thành công: ${insertedCount}/${sections.length} section được chèn vào đúng vị trí`);

    zip.file('word/document.xml', resultXml);

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  };

  // Fallback: Tạo file DOCX mới
  const createNewDocx = async (content: string): Promise<Blob> => {
    const lines = content.split('\n');
    const children: (Paragraph | Table)[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      const trimmed = line.trim();

      if (trimmed.startsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        if (tableBuffer.length > 0) {
          const tableNode = createTableFromMarkdown(tableBuffer);
          if (tableNode) {
            children.push(tableNode);
            children.push(new Paragraph({ text: "" }));
          }
          tableBuffer = [];
        }
        inTable = false;
      }

      if (!trimmed || (trimmed.startsWith('===') && trimmed.endsWith('==='))) continue;

      if (trimmed.startsWith('## ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.replace('## ', '')),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmed.startsWith('### ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.replace('### ', '')),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 150, after: 50 }
        }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed.substring(2)),
          bullet: { level: 0 }
        }));
      } else {
        children.push(new Paragraph({
          children: parseTextWithFormatting(trimmed),
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED
        }));
      }
    }

    if (tableBuffer.length > 0) {
      const tableNode = createTableFromMarkdown(tableBuffer);
      if (tableNode) children.push(tableNode);
    }

    const doc = new Document({
      sections: [{ properties: {}, children: children }],
    });

    return await Packer.toBlob(doc);
  };

  // Hàm chính xuất file DOCX
  const generateDocx = async () => {
    if (!result) return;

    // Kiểm tra bản quyền & lượt tải dùng thử
    if (!isPro) {
      if (licenseInfo?.isTrialExpired || (licenseInfo?.trialDownloadsRemaining ?? 0) <= 0) {
        alert("⚠️ Bạn đã sử dụng hết 5 lượt tải về dùng thử miễn phí. Vui lòng kích hoạt Bản Pro để tiếp tục sử dụng không giới hạn!");
        onOpenLicense?.();
        return;
      }
      const rec = recordTrialDownload();
      if (!rec.success) {
        alert("⚠️ Bạn đã sử dụng hết 5 lượt tải về dùng thử miễn phí. Vui lòng kích hoạt Bản Pro để tiếp tục sử dụng không giới hạn!");
        onOpenLicense?.();
        return;
      }
      onDownloadSuccess?.();
    }

    setIsGeneratingDoc(true);

    try {
      let blob: Blob;
      let fileName: string;

      if (originalDocx?.arrayBuffer) {
        console.log('XML Injection: Chèn NLS vào nhiều vị trí...');
        blob = await injectContentToDocx(originalDocx.arrayBuffer, result);
        fileName = originalDocx.fileName.replace('.docx', '_NLS.docx');
      } else {
        console.log('Tạo file DOCX mới...');
        blob = await createNewDocx(result);
        fileName = 'Giao_an_NLS.docx';
      }

      FileSaver.saveAs(blob, fileName);
    } catch (error) {
      console.error("Lỗi tạo file docx:", error);
      alert("Không thể tạo file .docx. Hệ thống sẽ tải về file văn bản thô.");
      handleDownloadTxt();
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;

    // Kiểm tra bản quyền & lượt tải dùng thử
    if (!isPro) {
      if (licenseInfo?.isTrialExpired || (licenseInfo?.trialDownloadsRemaining ?? 0) <= 0) {
        alert("⚠️ Bạn đã sử dụng hết 5 lượt tải về dùng thử miễn phí. Vui lòng kích hoạt Bản Pro để tiếp tục sử dụng không giới hạn!");
        onOpenLicense?.();
        return;
      }
      const rec = recordTrialDownload();
      if (!rec.success) {
        alert("⚠️ Bạn đã sử dụng hết 5 lượt tải về dùng thử miễn phí. Vui lòng kích hoạt Bản Pro để tiếp tục sử dụng không giới hạn!");
        onOpenLicense?.();
        return;
      }
      onDownloadSuccess?.();
    }

    const blob = new Blob([result], { type: 'text/plain' });
    FileSaver.saveAs(blob, 'Giao_an_NLS.txt');
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-6"></div>
        <h3 className="text-lg font-semibold text-blue-900 animate-pulse">Đang xử lý...</h3>
        <p className="text-slate-500 mt-2 text-sm">Đang phân tích giáo án và tích hợp năng lực số...</p>
      </div>
    );
  }

  if (!result) return null;

  const components = {
    blue: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#dc2626', fontWeight: 600 }}>{children}</span>
    ),
    purple: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{children}</span>
    ),
    green: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#7e22ce', fontStyle: 'italic', fontWeight: 600 }}>{children}</span>
    ),
    orange: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#b45309', fontStyle: 'italic', fontWeight: 600 }}>{children}</span>
    ),
    red: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#dc2626' }}>{children}</span>
    ),
  };

  // Đếm số section NLS
  const sections = parseAllNLSSections(result);

  const handleCopySection = async (content: string, index: number) => {
    await copyRichContentToClipboard(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllManualGuides = async () => {
    let fullGuideText = "=== HƯỚNG DẪN CHÈN THỦ CÔNG NĂNG LỰC SỐ VÀO GIÁO ÁN (CHUẨN KHỚP FILE WORD) ===\n\n";
    let fullGuideHtml = `<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35;"><h3 style="color: #1e1b4b;">HƯỚNG DẪN CHÈN THỦ CÔNG NĂNG LỰC SỐ VÀO GIÁO ÁN (CHUẨN KHỚP FILE WORD)</h3>`;

    sections.forEach((sec, idx) => {
      // Bỏ qua bảng tổng hợp cũ
      if ((sec.marker.includes('BẢNG_TỔNG_HỢP') && !sec.marker.includes('BẢNG_TỔNG_HỢP_HĐ')) || sec.marker.includes('SUMMARY_TABLE')) {
        return;
      }

      const markerTitle = sec.marker
        .replace(/^NLS_/, '')
        .replace(/^DC_/, '')
        .replace(/_/g, ' ');

      fullGuideText += `[MỤC ${idx + 1}: ${markerTitle}]\n`;
      if (sec.locationGuidance) {
        fullGuideText += `📍 Vị trí chèn: ${sec.locationGuidance}\n`;
      }
      fullGuideText += `📌 Nội dung cần chèn:\n${convertMarkdownToCleanPlainText(sec.content)}\n\n-----------------------------------\n\n`;

      fullGuideHtml += `<hr style="margin: 16px 0; border: 1px dashed #cbd5e1;"/><p><b>[MỤC ${idx + 1}: ${markerTitle}]</b></p>`;
      if (sec.locationGuidance) {
        fullGuideHtml += `<p style="color: #b45309; background: #fef3c7; padding: 4px 8px; border-left: 4px solid #f59e0b;"><b>📍 Vị trí chèn:</b> ${escapeXml(sec.locationGuidance)}</p>`;
      }
      fullGuideHtml += `<p><b>📌 Nội dung cần chèn:</b></p>${convertMarkdownToHtmlForClipboard(sec.content)}`;
    });

    fullGuideHtml += `</div>`;

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([fullGuideHtml], { type: 'text/html' });
        const textBlob = new Blob([fullGuideText], { type: 'text/plain' });
        const item = new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(fullGuideText);
      }
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (e) {
      await navigator.clipboard.writeText(fullGuideText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  // Hiển thị nội dung preview - hỗ trợ tất cả các markers linh hoạt (Vietnamese + English)
  const getCleanResultForPreview = (content: string): string => {
    return content
      // ================== VIETNAMESE NLS MARKERS ==================
      .replace(/===NLS_MỤC_TIÊU.*?===/g, '\n**📌 MỤC TIÊU NĂNG LỰC SỐ:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_NỘI_DUNG.*?===/g, '\n**📌 HOẠT ĐỘNG $1 - NỘI DUNG NLS:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_SẢN_PHẨM.*?===/g, '\n**📌 HOẠT ĐỘNG $1 - SẢN PHẨM NLS:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_TỔ_CHỨC.*?===/g, '\n**📌 HOẠT ĐỘNG $1 - TỔ CHỨC NLS:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_MỤC_TIÊU_HĐ.*?===/g, '\n**📌 HOẠT ĐỘNG $1 - MỤC TIÊU NLS:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_BƯỚC_(\d+).*?===/g, '\n**📌 HOẠT ĐỘNG $1 - BƯỚC $2 NLS:**\n')
      .replace(/===NLS_HOẠT_ĐỘNG_(\d+)_KẾT_LUẬN.*?===/g, '\n**📌 HOẠT ĐỘNG $1 - KẾT LUẬN NLS:**\n')
.replace(/===NLS_HOẠT_ĐỘNG_(\d+).*?===/g, '\n**📌 HOẠT ĐỘNG $1 - NLS:**\n')
      .replace(/===NLS_CỦNG_CỐ.*?===/g, '\n**📌 CỦNG CỐ - TÍCH HỢP NLS:**\n')
      .replace(/===NLS_THIẾT_BỊ_GV.*?===/g, '\n**📌 THIẾT BỊ DẠY HỌC (GIÁO VIÊN):**\n')
      .replace(/===NLS_THIẾT_BỊ_HS.*?===/g, '\n**📌 THIẾT BỊ DẠY HỌC (HỌC SINH):**\n')
      .replace(/===NLS_DẶN_DÒ_TIẾT_SAU.*?===/g, '\n**📌 DẶN DÒ CHUẨN BỊ CHO BÀI HỌC TIẾP THEO:**\n')
      .replace(/===NLS_RUBRIC_STEM.*?===/g, '\n**📌 BẢNG RUBRIC 3 TIÊU CHÍ STEM (Chèn trước Dặn dò):**\n')
      .replace(/===NLS_BẢNG_TỔNG_HỢP_HĐ.*?===/g, '\n**📌 BẢNG TỔNG HỢP HOẠT ĐỘNG NĂNG LỰC SỐ VÀ AI TÍCH HỢP (Chèn cuối giáo án):**\n')

      // ================== ENGLISH DC MARKERS ==================
      .replace(/===DC_OBJECTIVES.*?===/g, '\n**📌 DIGITAL COMPETENCE OBJECTIVES:**\n')
      .replace(/===DC_WARM_UP_ORGANIZATION.*?===/g, '\n**📌 WARM UP - DC ORGANIZATION:**\n')
      .replace(/===DC_WARM_UP_CONTENT.*?===/g, '\n**📌 WARM UP - DC CONTENT:**\n')
      .replace(/===DC_WARM_UP_OUTCOMES.*?===/g, '\n**📌 WARM UP - DC OUTCOMES:**\n')
      .replace(/===DC_WARM_UP_OBJECTIVE.*?===/g, '\n**📌 WARM UP - DC OBJECTIVE:**\n')
      .replace(/===DC_WARM_UP.*?===/g, '\n**📌 WARM UP - DC:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_CONTENT.*?===/g, '\n**📌 ACTIVITY $1 - DC CONTENT:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_OUTCOMES.*?===/g, '\n**📌 ACTIVITY $1 - DC OUTCOMES:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_ORGANIZATION.*?===/g, '\n**📌 ACTIVITY $1 - DC ORGANIZATION:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_OBJECTIVE.*?===/g, '\n**📌 ACTIVITY $1 - DC OBJECTIVE:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_TEACHER_ACTIVITIES.*?===/g, '\n**📌 ACTIVITY $1 - TEACHER DC:**\n')
      .replace(/===DC_ACTIVITY_(\d+)_STUDENT_ACTIVITIES.*?===/g, '\n**📌 ACTIVITY $1 - STUDENT DC:**\n')
      .replace(/===DC_ACTIVITY_(\d+).*?===/g, '\n**📌 ACTIVITY $1 - DC:**\n')
      .replace(/===DC_CONSOLIDATION_ORGANIZATION.*?===/g, '\n**📌 CONSOLIDATION - DC:**\n')
      .replace(/===DC_CONSOLIDATION.*?===/g, '\n**📌 CONSOLIDATION - DC:**\n')
      .replace(/===DC_HOMEWORK.*?===/g, '\n**📌 HOMEWORK - DC:**\n')

      .replace(/===END===/g, '\n---\n');
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-indigo-900/10 border border-indigo-100/90 overflow-hidden animate-fade-in-up">
      {/* Header status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-indigo-500/20">
        <div className="flex items-center space-x-3.5 text-left">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl flex-shrink-0 shadow-lg shadow-emerald-500/30">
            <CheckCircle size={28} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Phân tích & Tích hợp Giáo án Thành công!</h2>
            <p className="text-indigo-200/90 text-xs sm:text-sm mt-0.5 font-medium">
              Đã trích xuất <strong className="text-emerald-400">{sections.length} phần nội dung</strong> để tích hợp vào bài dạy của bạn.
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {result.includes("(Nội dung trích xuất nguyên văn từ PPCT)") && (
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-400/30 flex items-center shadow-xs">
              ✓ Chuẩn PPCT
            </span>
          )}
          {originalDocx && (
            <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-200 font-bold rounded-full border border-indigo-400/30 flex items-center shadow-xs">
              ✓ Sẵn sàng xuất Word XML
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation (Bản Pro hiển thị 2 Tab, Bản dùng thử chỉ hiển thị giao diện Xuất Word) */}
      {isPro ? (
        <div className="flex border-b border-slate-200/80 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 rounded-2xl transition-all ${
              effectiveTab === 'manual'
                ? 'bg-white text-indigo-950 shadow-md shadow-indigo-900/5 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListChecks size={19} className={effectiveTab === 'manual' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>📋 Hướng dẫn chèn thủ công (Copy nhanh)</span>
            <span className="ml-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800">
              {sections.length} mục
            </span>
          </button>

          <button
            onClick={() => setActiveTab('word')}
            className={`flex-1 py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 rounded-2xl transition-all ${
              effectiveTab === 'word'
                ? 'bg-white text-indigo-950 shadow-md shadow-indigo-900/5 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileSpreadsheet size={19} className={effectiveTab === 'word' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>📁 Xuất file Word tự động (.docx)</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between text-xs sm:text-sm text-indigo-950 font-bold px-6 gap-2">
          <span className="flex items-center space-x-2">
            <FileSpreadsheet size={18} className="text-blue-600" />
            <span>📁 Chế độ Dùng thử: Xuất file Word tự động (.docx)</span>
          </span>
          <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 font-bold">
            Còn lại: {licenseInfo?.trialDownloadsRemaining ?? 5}/5 lượt tải miễn phí
          </span>
        </div>
      )}

      {/* Tab 1: Hướng dẫn chèn thủ công (CHỈ HIỂN THỊ CHO BẢN PRO) */}
      {isPro && effectiveTab === 'manual' && (
        <div className="p-6 sm:p-7 bg-slate-50/50 space-y-6">
          {/* Instructions banner */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <h3 className="font-extrabold text-indigo-950 text-base flex items-center">
                <MapPin className="text-indigo-600 mr-2 flex-shrink-0" size={20} />
                Hướng dẫn chèn thủ công (Chuẩn vị trí neo như File Word)
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">
                Vị trí chèn và nội dung được đồng bộ <strong>100% khớp với Luồng xuất file Word</strong>. Bấm nút <strong>Copy</strong> để dán trực tiếp vào file Word (giữ nguyên màu sắc và bảng kẻ ô).
              </p>
            </div>
            <button
              onClick={handleCopyAllManualGuides}
              className="flex-shrink-0 flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:brightness-110 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              {copiedAll ? (
                <>
                  <Check size={16} className="text-emerald-300" />
                  <span>Đã copy tất cả!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy tất cả hướng dẫn</span>
                </>
              )}
            </button>
          </div>

          {/* Cards for each section */}
          <div className="space-y-5 text-left">
            {sections.map((section, idx) => {
              // Ẩn bảng tổng hợp cũ — không hiển thị trong tab hướng dẫn thủ công (giữ lại BẢNG_TỔNG_HỢP_HĐ mới)
              if ((section.marker.includes('BẢNG_TỔNG_HỢP') && !section.marker.includes('BẢNG_TỔNG_HỢP_HĐ')) || section.marker.includes('SUMMARY_TABLE')) {
                return null;
              }

              const formattedTitle = section.marker
                .replace(/^NLS_/, '')
                .replace(/^DC_/, '')
                .replace(/_/g, ' ');

              const isCopied = copiedIndex === idx;
              const hasBlue = section.content.includes('<blue>');
              const hasPurple = section.content.includes('<purple>');
              const hasGreen = section.content.includes('<green>');
              const hasOrange = section.content.includes('<orange>');
              const hasRed = section.content.includes('<red>');
              const isTable = section.content.trim().startsWith('|') || section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE');

              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-200/40 overflow-hidden hover:border-indigo-300 transition-all duration-300">
                  {/* Card Header */}
                  <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-indigo-300">
                        {formattedTitle}
                      </span>
                      {hasBlue && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          Năng lực số
                        </span>
                      )}
                      {hasPurple && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30">
                          Năng lực AI
                        </span>
                      )}
                      {hasGreen && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Hỗ trợ HSKT
                        </span>
                      )}
                      {hasOrange && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Tiếng Anh
                        </span>
                      )}
                      {hasRed && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/30">
                          QPAN (TT 08)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopySection(section.content, idx)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Đã copy</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy đoạn này</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Guidance */}
                    {section.locationGuidance && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                        <MapPin size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-amber-950 font-bold">Vị trí dán chuẩn xác:</strong>
                          <p className="mt-0.5 font-medium leading-relaxed">{section.locationGuidance}</p>
                        </div>
                      </div>
                    )}

                    {/* Content Preview (Text hoặc Table) */}
                    {isTable ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm overflow-x-auto">
                        <p className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                          📊 BẢNG TỔNG HỢP NĂNG LỰC SỐ TOÀN BÀI (5 CỘT CHUẨN - TỰ ĐỘNG KẺ Ô KHI DÁN VÀO WORD):
                        </p>
                        <div className="prose prose-sm max-w-none font-serif text-slate-900 border border-slate-300 rounded-lg p-3 bg-white shadow-2xs" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components as any}>
                            {section.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm space-y-1.5">
                        <p className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
                          📌 Nội dung cần dán (Chữ màu chuẩn - Times New Roman):
                        </p>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          {section.content.split('\n').map((line, lineIdx) => {
                            const cleaned = cleanLatex(line.replace(/<\/?blue>/g, '').replace(/<\/?purple>/g, '').replace(/<\/?green>/g, '').replace(/<\/?orange>/g, '').replace(/<\/?red>/g, ''));
                            if (!cleaned.trim() || (cleaned.startsWith('===') && cleaned.endsWith('==='))) return null;
                            const isBlue = line.includes('<blue>');
                            const isPurple = line.includes('<purple>');
                            const isGreen = line.includes('<green>');
                            const isOrange = line.includes('<orange>');
                            const isRed = line.includes('<red>');

                            let colorClass = 'text-slate-800';
                            if (isBlue) colorClass = 'text-red-600 font-bold';
                            else if (isPurple) colorClass = 'text-blue-700 font-bold';
                            else if (isGreen) colorClass = 'text-purple-700 italic font-semibold';
                            else if (isOrange) colorClass = 'text-amber-800 italic font-semibold';
                            else if (isRed) colorClass = 'text-red-600 font-semibold';

                            return (
                              <div
                                key={lineIdx}
                                className={`py-0.5 ${colorClass}`}
                                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                              >
                                {cleaned}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Xuất file Word tự động */}
      {effectiveTab === 'word' && (
        <div className="p-8 sm:p-10 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-xl space-y-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-950 tracking-tight">Chèn tự động & Xuất file Word (.docx)</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Hệ thống sử dụng công nghệ <strong>XML Injection</strong> để chèn thẳng các đoạn nội dung vào <strong>đúng vị trí trong file Word gốc của bạn</strong>, giữ nguyên 100% hình ảnh, bảng biểu và công thức MathType.
            </p>
            {originalDocx ? (
              <p className="text-emerald-800 font-bold text-sm bg-emerald-100/90 p-3 rounded-2xl border border-emerald-300/80 shadow-2xs">
                ✓ Đã nhận diện file Word gốc: <strong>{originalDocx.fileName}</strong>
              </p>
            ) : (
              <p className="text-amber-800 font-bold text-sm bg-amber-100/90 p-3 rounded-2xl border border-amber-300/80 shadow-2xs">
                ⚠️ Chưa tải file Word gốc. Hệ thống sẽ xuất file Word mới với các đoạn nội dung đã phân bổ.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={generateDocx}
              disabled={isGeneratingDoc}
              className="flex-1 flex items-center justify-center space-x-2.5 px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl text-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {isGeneratingDoc ? (
                <span className="animate-pulse">Đang tạo file...</span>
              ) : (
                <>
                  <Download size={22} />
                  <span>Tải về .docx</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex-none flex items-center justify-center px-4 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-300 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              title="Tải bản text dự phòng"
            >
              <FileText size={22} />
            </button>
          </div>

          {originalDocx && (
            <button
              type="button"
              onClick={() => setShowTranslateModal(true)}
              className="w-full max-w-md flex items-center justify-center space-x-2 py-3.5 px-6 bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white rounded-2xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Globe size={20} />
              <span>🌐 Chuyển toàn bộ sang Tiếng Anh (Giữ nguyên Word gốc)</span>
            </button>
          )}

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center text-indigo-600 text-sm font-bold hover:underline mt-2"
          >
            {showPreview ? (
              <>Thu gọn xem trước Markdown <ChevronUp size={16} className="ml-1" /></>
            ) : (
              <>Xem trước toàn văn Markdown <ChevronDown size={16} className="ml-1" /></>
            )}
          </button>

          {showPreview && (
            <div className="w-full text-left p-6 sm:p-8 prose prose-indigo max-w-none border border-slate-200 bg-white rounded-2xl shadow-inner mt-4">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                components={components as any}
              >
                {getCleanResultForPreview(result)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Modal Chuyển toàn bộ sang Tiếng Anh */}
      <TranslationModal
        isOpen={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        originalDocx={originalDocx}
        result={result}
        injectContentToDocx={injectContentToDocx}
        apiKey={apiKey}
        apiKeys={apiKeys}
        selectedModel={selectedModel}
        subject={subject}
        grade={grade}
        initialMode="INTEGRATED"
      />
    </div>
  );
};

export default ResultDisplay;