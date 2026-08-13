import React, { useState } from 'react';
import { Download, CheckCircle, FileText, ChevronDown, ChevronUp, Copy, Check, MapPin, ListChecks, FileSpreadsheet } from 'lucide-react';
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
import { OriginalDocxFile } from '../types';

interface ResultDisplayProps {
  result: string | null;
  loading: boolean;
  originalDocx?: OriginalDocxFile | null;
}

// Interface cho các section NLS đã parse
interface NLSSection {
  marker: string;  // Ví dụ: "HOẠT_ĐỘNG_1", "MỤC_TIÊU"
  content: string;
  activityPatterns?: string[]; // Pattern tiêu đề Hoạt động X để giới hạn phạm vi
  searchPatterns: string[]; // Patterns vị trí chèn trong phạm vi
  locationGuidance?: string; // Vị trí chèn chi tiết trích dẫn dòng/câu từ AI
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, originalDocx }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'word'>('manual');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Parse tất cả các section NLS từ kết quả AI (supports both Vietnamese NLS_ and English DC_ markers)
  const parseAllNLSSections = (content: string): NLSSection[] => {
    const sections: NLSSection[] = [];

    // Regex để tìm tất cả các section: ===NLS_XXX=== hoặc ===DC_XXX=== ... ===END===
    const sectionRegex = /===(NLS|DC)_([^=]+)===([\s\S]*?)===END===/g;
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

          // Luôn ép chèn vào "d. Tổ chức thực hiện" hoặc các Bước trong Tổ chức thực hiện
          if (subPart === 'BƯỚC_1') {
            searchPatterns = [
              'Bước 1:', 'Bước 1.', 'bước 1',
              'Chuyển giao nhiệm vụ học tập', 'Chuyển giao nhiệm vụ', 'Chuyển giao',
              '*Chuyển giao nhiệm vụ học tập', 'NV1:', 'Nhiệm vụ 1:',
              // Từ khóa tiêu đề bước thực tế (không có "Bước X")
              'Giao nhiệm vụ:', '- Giao nhiệm vụ', '* Giao nhiệm vụ', 'Giao nhiệm vụ'
            ];
          } else if (subPart === 'BƯỚC_2') {
            searchPatterns = [
              'Bước 2:', 'Bước 2.', 'bước 2',
              'Thực hiện nhiệm vụ học tập', 'Thực hiện nhiệm vụ', 'HS thực hiện',
              '*Thực hiện nhiệm vụ học tập', 'NV2:', 'Nhiệm vụ 2:',
              // Từ khóa tiêu đề bước thực tế (không có "Bước X")
              'Hướng dẫn HS thực hiện nhiệm vụ', 'Hướng dẫn HS thực hiện',
              'Hướng dẫn HS:', '- Hướng dẫn HS', '* Hướng dẫn HS'
            ];
          } else if (subPart === 'BƯỚC_3') {
            searchPatterns = [
              'Bước 3:', 'Bước 3.', 'bước 3',
              'Báo cáo kết quả và thảo luận', 'Báo cáo kết quả', 'Báo cáo', 'Thảo luận',
              '*Báo cáo kết quả và thảo luận',
              // Từ khóa tiêu đề bước thực tế (không có "Bước X")
              'Báo cáo kết quả:', '- Báo cáo kết quả', '* Báo cáo kết quả'
            ];
          } else if (subPart === 'BƯỚC_4' || subPart === 'KẾT_LUẬN') {
            searchPatterns = [
              'Bước 4:', 'Bước 4.', 'bước 4',
              'Đánh giá kết quả thực hiện nhiệm vụ', 'Đánh giá kết quả', 'Kết luận, nhận định', 'Kết luận', 'Nhận định',
              '*Đánh giá kết quả thực hiện nhiệm vụ học tập',
              // Từ khóa tiêu đề bước thực tế (không có "Bước X")
              'Đánh giá kết quả thực hiện nhiệm vụ:', '- Đánh giá kết quả', '* Đánh giá kết quả'
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
            'Bước 1:', 'Chuyển giao nhiệm vụ học tập', 'Chuyển giao nhiệm vụ',
            'Giao nhiệm vụ:', 'Giao nhiệm vụ', '- Giao nhiệm vụ'
          ];
        } else if (marker === 'BƯỚC_2') {
          searchPatterns = [
            'Bước 2:', 'Thực hiện nhiệm vụ học tập', 'Thực hiện nhiệm vụ',
            'Hướng dẫn HS thực hiện nhiệm vụ', 'Hướng dẫn HS:', '- Hướng dẫn HS'
          ];
        } else if (marker === 'BƯỚC_3') {
          searchPatterns = [
            'Bước 3:', 'Báo cáo kết quả và thảo luận', 'Báo cáo kết quả',
            'Báo cáo kết quả:', '- Báo cáo kết quả'
          ];
        } else if (marker === 'BƯỚC_4') {
          searchPatterns = [
            'Bước 4:', 'Đánh giá kết quả thực hiện', 'Kết luận, nhận định',
            'Đánh giá kết quả thực hiện nhiệm vụ:', '- Đánh giá kết quả'
          ];
        } else if (marker === 'CỦNG_CỐ' || marker === 'BẢNG_TỔNG_HỢP') {
          searchPatterns = [
            'IV. DẶN DÒ', 'IV. CỦNG CỐ', 'V. HƯỚNG DẪN VỀ NHÀ',
            'Củng cố', 'Vận dụng', 'Hướng dẫn về nhà', 'Dặn dò',
            'Hoạt động 4', 'Hoạt động 3', 'Tiến trình dạy học'
          ];
        }
      }
      // ================== ENGLISH DC MARKERS ==================
      else if (prefix === 'DC') {
        if (marker === 'OBJECTIVES') {
          searchPatterns = [
            '3. Attitudes', 'Attitudes', 'attitudes', 'ATTITUDES',
            '3. Character', 'II. TEACHING AIDS', 'II. EQUIPMENT'
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

          // Search patterns for Activity X
          const actPatterns = [
            `Activity ${actNum}:`, `Activity ${actNum}.`, `Activity ${actNum} `,
            `**Activity ${actNum}`, `ACTIVITY ${actNum}`, `Activity${actNum}`,
            `Activity ${actNum}`, `activity ${actNum}`,
            // Also support "Presentation", "Practice", "Production" naming
            ...(actNum === '1' ? ['Presentation', 'presentation', 'PRESENTATION'] : []),
            ...(actNum === '2' ? ['Practice', 'practice', 'PRACTICE'] : []),
            ...(actNum === '3' ? ['Production', 'production', 'PRODUCTION'] : [])
          ];

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
              'd) Organization', 'd. Organization', 'd)Organization',
              'Organization:', 'd) Organization', 'd. Organization',
              '* Organization', 'ORGANIZATION',
              "TEACHER'S ACTIVITIES", "STUDENTS' ACTIVITIES"
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

      sections.push({
        marker: `${prefix}_${marker}`,
        content: sectionContent,
        activityPatterns,
        searchPatterns,
        locationGuidance
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
    const parts = cleanedText.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<red>.*?<\/red>|<green>.*?<\/green>|<blue>.*?<\/blue>)/g);
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
      if (part.startsWith('<red>') && part.endsWith('</red>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?red>/g, '')), color: "FF0000" });
      }
      if (part.startsWith('<green>') && part.endsWith('</green>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?green>/g, '')), color: "008000", italics: true });
      }
      if (part.startsWith('<blue>') && part.endsWith('</blue>')) {
        return new TextRun({ text: cleanLatex(part.replace(/<\/?blue>/g, '')), color: "0000FF", italics: true });
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

  // Chuyển Markdown sang Word XML - MÀU ĐỎ NLS/AI VÀ MÀU XANH HSKT
  const convertMarkdownToWordXml = (markdown: string): string => {
    // Bước 1: Thay thế <br> thành ký tự xuống dòng thực sự trước khi split
    const normalizedMarkdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    const lines = normalizedMarkdown.split('\n');
    let xml = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Bỏ qua các dòng thông báo/hướng dẫn
      if (trimmed.startsWith('[Chèn') || trimmed.startsWith('(Chèn') ||
        trimmed.startsWith('[chèn') || trimmed.startsWith('(chèn') ||
        trimmed.startsWith('(tiếp tục') || trimmed.startsWith('[tiếp tục') ||
        trimmed.startsWith('...') || trimmed.startsWith('===')) {
        continue;
      }

      let processedLine = trimmed;

      // Loại bỏ "* Tích hợp NLS:" hoặc "Tích hợp NLS:"
      processedLine = processedLine.replace(/^\*?\s*Tích hợp NLS:\s*/i, '- ');

      // Loại bỏ mã năng lực số dạng (1.1NC1a), (5.2.NC1a), (3.4NC1a), etc.
      processedLine = processedLine.replace(/\s*\(\d+\.\d+\.?[A-Za-z]+\d*[a-z]?\)/g, '');
      processedLine = processedLine.replace(/\s*\(\d+\.\d+[A-Za-z]+\d*[a-z]?\)/g, '');

      // Loại bỏ thẻ <u> và </u>
      processedLine = processedLine.replace(/<\/?u>/g, '');

      let isGreenContent = trimmed.includes('<green>') || trimmed.includes('</green>');
      let isRedContent = trimmed.includes('<red>') || trimmed.includes('</red>');
      let isBlueContent = trimmed.includes('<blue>') || trimmed.includes('</blue>');
      processedLine = processedLine.replace(/<\/?red>/g, '').replace(/<\/?green>/g, '').replace(/<\/?blue>/g, '');

      // Bước 2: Làm sạch LaTeX → Unicode trước khi escape XML
      processedLine = cleanLatex(processedLine);

      const content = escapeXml(processedLine);

      if (isGreenContent) {
        xml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:color w:val="008000"/><w:i/></w:rPr><w:t>${content}</w:t></w:r></w:p>`;
      } else if (isBlueContent) {
        xml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:color w:val="0000FF"/><w:i/></w:rPr><w:t>${content}</w:t></w:r></w:p>`;
      } else if (isRedContent) {
        xml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:color w:val="FF0000"/></w:rPr><w:t>${content}</w:t></w:r></w:p>`;
      } else {
        xml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr><w:t>${content}</w:t></w:r></w:p>`;
      }
    }

    return xml;
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
        const cleanCell = escapeXml(cellText.trim().replace(/<\/?red>/g, ''));
        const totalCols = cells.length;
        const isCenter = colIndex === 0 || colIndex === 1 || (totalCols === 6 && colIndex === 2) || colIndex === (totalCols - 1);
        const alignXml = isCenter ? `<w:jc w:val="center"/>` : `<w:jc w:val="both"/>`;
        const boldXml = isHeader ? `<w:b/>` : ``;

        tblXml += `<w:tc>
          <w:tcPr>
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

    let insertedCount = 0;
    const notInsertedSections: string[] = [];

    for (const section of sections) {
      let nlsXmlStr = '';
      if (section.content.trim().startsWith('|') || section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE')) {
        nlsXmlStr = `
          <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="FF0000"/></w:pBdr></w:pPr></w:p>
          <w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>BẢNG TỔNG HỢP NĂNG LỰC SỐ TRONG BÀI HỌC</w:t></w:r></w:p>
          ${convertMarkdownTableToWordXmlTable(section.content)}
        `;
      } else {
        nlsXmlStr = convertMarkdownToWordXml(section.content);
      }

      const nlsNodes = parseNLSNodes(nlsXmlStr);
      if (nlsNodes.length === 0) continue;

      let inserted = false;

      // 1. Cho Bảng tổng hợp -> Chèn vào CUỐI CÙNG của giáo án (sau dòng/nội dung cuối cùng của Hoạt động 4 / Vận dụng)
      if (section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE')) {
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
      // 2. Cho các Hoạt động -> Dùng Scoped Search (Khoanh vùng Hoạt động X)
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

        // KẾT THÚC SCOPE: Chỉ khớp tiêu đề Hoạt động CÓ SỐ THỨ TỰ (VD: "Hoạt động 2:", "Hđ 3.")
        // KHÔNG khớp với "HOẠT ĐỘNG CỦA GV - HS" hay "Hoạt động nhóm" (không có số sau "Hoạt động ")
        if (scopeStartIdx !== -1) {
          for (let i = scopeStartIdx + 1; i < paragraphs.length; i++) {
            const text = normalizeText(paragraphs[i].textContent || '');
            if (/^hoạt động \d/.test(text) || /^hđ \d/.test(text) || /^activity \d/i.test(text)) {
              scopeEndIdx = i;
              break;
            }
          }
        }

        // Tìm từ khóa vị trí trong vùng scope (từ scopeStartIdx đến scopeEndIdx)
        const scopedParagraphs = scopeStartIdx !== -1 
          ? paragraphs.slice(scopeStartIdx, scopeEndIdx) 
          : paragraphs;

        for (const pattern of section.searchPatterns) {
          const normPattern = normalizeText(pattern);
          const targetP = scopedParagraphs.find(p => normalizeText(p.textContent || '').includes(normPattern));
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
          <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="FF0000"/></w:pBdr></w:pPr></w:p>
          <w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>═══ NỘI DUNG NLS BỔ SUNG ═══</w:t></w:r></w:p>
        `;

        for (const section of sections) {
          if (notInsertedSections.includes(section.marker)) {
            fallbackXmlStr += `<w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>[${section.marker}]</w:t></w:r></w:p>`;
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
    red: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: 'red' }}>{children}</span>
    ),
    green: ({ children }: { children: React.ReactNode }) => (
      <span style={{ color: '#059669', fontStyle: 'italic', fontWeight: 600 }}>{children}</span>
    ),
  };

  // Đếm số section NLS
  const sections = parseAllNLSSections(result);

  const handleCopySection = (content: string, index: number) => {
    // Strips <red> tags when copying to clipboard so text is clean
    const cleanText = content.replace(/<\/?red>/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllManualGuides = () => {
    let fullGuideText = "=== HƯỚNG DẪN CHÈN THỦ CÔNG NĂNG LỰC SỐ VÀO GIÁO ÁN ===\n\n";
    sections.forEach((sec, idx) => {
      const markerTitle = sec.marker
        .replace(/^NLS_/, '')
        .replace(/^DC_/, '')
        .replace(/_/g, ' ');
      fullGuideText += `[MỤC ${idx + 1}: ${markerTitle}]\n`;
      if (sec.locationGuidance) {
        fullGuideText += `📍 Vị trí chèn: ${sec.locationGuidance}\n`;
      }
      fullGuideText += `📌 Nội dung NLS màu đỏ:\n${sec.content.replace(/<\/?red>/g, '')}\n\n-----------------------------------\n\n`;
    });

    navigator.clipboard.writeText(fullGuideText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
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
    <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden animate-fade-in-up">
      {/* Header status */}
      <div className="bg-blue-900 text-white px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 bg-green-500 text-white rounded-full flex-shrink-0 shadow-md">
            <CheckCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Phân tích giáo án thành công!</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
              Đã trích xuất <strong>{sections.length} phần NLS</strong> để tích hợp vào bài dạy.
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {result.includes("(Nội dung trích xuất nguyên văn từ PPCT)") && (
            <span className="px-3 py-1 bg-green-600/90 text-white font-medium rounded-full flex items-center">
              ✓ Chuẩn PPCT
            </span>
          )}
          {originalDocx && (
            <span className="px-3 py-1 bg-blue-700 text-blue-100 font-medium rounded-full flex items-center">
              ✓ Sẵn sàng xuất Word XML
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-blue-200 bg-blue-50/50">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-4 px-4 sm:px-6 font-bold text-sm sm:text-base flex items-center justify-center space-x-2 border-b-2 transition-all ${
            activeTab === 'manual'
              ? 'border-blue-600 text-blue-900 bg-white shadow-sm'
              : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-100/50'
          }`}
        >
          <ListChecks size={20} className={activeTab === 'manual' ? 'text-blue-600' : 'text-slate-400'} />
          <span>📋 Hướng dẫn chèn thủ công (Copy nhanh)</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            {sections.length} mục
          </span>
        </button>

        <button
          onClick={() => setActiveTab('word')}
          className={`flex-1 py-4 px-4 sm:px-6 font-bold text-sm sm:text-base flex items-center justify-center space-x-2 border-b-2 transition-all ${
            activeTab === 'word'
              ? 'border-blue-600 text-blue-900 bg-white shadow-sm'
              : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-100/50'
          }`}
        >
          <FileSpreadsheet size={20} className={activeTab === 'word' ? 'text-blue-600' : 'text-slate-400'} />
          <span>📁 Xuất file Word tự động (.docx)</span>
        </button>
      </div>

      {/* Tab 1: Hướng dẫn chèn thủ công */}
      {activeTab === 'manual' && (
        <div className="p-6 bg-slate-50/70 space-y-6">
          {/* Instructions banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <h3 className="font-bold text-blue-950 text-base flex items-center">
                <MapPin className="text-blue-600 mr-2 flex-shrink-0" size={20} />
                Hướng dẫn chèn thủ công theo từng dòng/vị trí cụ thể
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm">
                AI đã trích xuất {sections.length} phần NLS kèm <strong>trích dẫn câu/dòng liền trước trong giáo án gốc</strong> của thầy/cô. Bấm nút <strong>Copy</strong> để dán trực tiếp vào file Word.
              </p>
            </div>
            <button
              onClick={handleCopyAllManualGuides}
              className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm"
            >
              {copiedAll ? (
                <>
                  <Check size={16} className="text-green-300" />
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
              const formattedTitle = section.marker
                .replace(/^NLS_/, '')
                .replace(/^DC_/, '')
                .replace(/_/g, ' ');

              const isCopied = copiedIndex === idx;

              return (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all">
                  {/* Card Header */}
                  <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                    <span className="font-bold text-sm sm:text-base flex items-center">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 mr-2.5"></span>
                      MỤC {idx + 1}: {formattedTitle}
                    </span>
                    <button
                      onClick={() => handleCopySection(section.content, idx)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        isCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy đoạn NLS này</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Location guidance box */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <MapPin size={18} className="text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                            📍 Vị trí chèn trong giáo án của bạn:
                          </p>
                          <p className="text-amber-950 font-medium text-xs sm:text-sm mt-1 leading-relaxed">
                            {section.marker.includes('BẢNG_TỔNG_HỢP') || section.marker.includes('SUMMARY_TABLE')
                              ? '📍 Vị trí: Dòng cuối cùng của giáo án (Sau khi kết thúc toàn bộ dòng/nội dung cuối cùng của Hoạt động 4 / Vận dụng / Hướng dẫn về nhà)'
                              : (section.locationGuidance || 'Mục I. MỤC TIÊU -> 2. Năng lực (hoặc phần d. Tổ chức thực hiện của Hoạt động)')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content Preview (Text hoặc Table) */}
                    {section.content.trim().startsWith('|') || section.marker.includes('BẢNG_TỔNG_HỢP') ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm overflow-x-auto">
                        <p className="font-semibold text-xs text-slate-500 uppercase mb-3">
                          📊 BẢNG TỔNG HỢP NĂNG LỰC SỐ TOÀN BÀI (5 CỘT CHUẨN):
                        </p>
                        <div className="prose prose-sm max-w-none font-serif text-slate-900 border border-slate-300 rounded p-3 bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {section.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm text-red-600 space-y-1.5">
                        <p className="font-semibold text-xs text-slate-500 uppercase mb-2">
                          📌 Nội dung NLS cần dán (Chữ màu đỏ - Times New Roman):
                        </p>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base text-red-600" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          {section.content.split('\n').map((line, lineIdx) => {
                            const cleanLine = line.replace(/<\/?red>/g, '');
                            if (!cleanLine.trim()) return null;
                            return (
                              <div key={lineIdx} className="text-red-600 font-semibold py-0.5" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                {cleanLine}
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
      {activeTab === 'word' && (
        <div className="p-8 bg-blue-50/50 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-xl space-y-3">
            <h3 className="text-xl font-bold text-blue-950">Chèn tự động & Xuất file Word (.docx)</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Hệ thống sẽ sử dụng công nghệ <strong>XML Injection</strong> để chèn thẳng các đoạn NLS màu đỏ vào <strong>đúng vị trí trong file Word gốc của bạn</strong>, giữ nguyên 100% hình ảnh, bảng biểu và công thức MathType.
            </p>
            {originalDocx ? (
              <p className="text-green-700 font-medium text-sm bg-green-100 p-2.5 rounded-lg border border-green-200">
                ✓ Đã nhận diện file Word gốc: <strong>{originalDocx.fileName}</strong>
              </p>
            ) : (
              <p className="text-amber-800 font-medium text-sm bg-amber-100 p-2.5 rounded-lg border border-amber-200">
                ⚠️ Không có file Word gốc được tải lên. Hệ thống sẽ tạo một file Word mới với các đoạn NLS.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={generateDocx}
              disabled={isGeneratingDoc}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-md transform hover:-translate-y-0.5"
            >
              {isGeneratingDoc ? (
                <span className="animate-pulse">Đang tạo file...</span>
              ) : (
                <>
                  <Download size={24} />
                  <span>Tải về .docx</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex-none flex items-center justify-center px-4 py-4 bg-white text-slate-600 rounded-xl font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
              title="Tải bản text dự phòng"
            >
              <FileText size={24} />
            </button>
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center text-blue-600 text-sm font-medium hover:underline mt-2"
          >
            {showPreview ? (
              <>Thu gọn xem trước Markdown <ChevronUp size={16} className="ml-1" /></>
            ) : (
              <>Xem trước toàn văn Markdown <ChevronDown size={16} className="ml-1" /></>
            )}
          </button>

          {showPreview && (
            <div className="w-full text-left p-6 prose prose-blue max-w-none border-t border-slate-200 bg-white rounded-xl shadow-inner mt-4">
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
    </div>
  );
};

export default ResultDisplay;