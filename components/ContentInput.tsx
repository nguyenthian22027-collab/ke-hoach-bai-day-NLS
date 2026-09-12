import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle, FileText, FileUp, AlertCircle, FolderUp, ClipboardPaste, Globe } from 'lucide-react';
import { OriginalDocxFile, Subject } from '../types';
import { TranslationModal } from './TranslationModal';

// Tự động nhận diện Môn học & Khối lớp từ tên file và nội dung giáo án
export function detectSubjectAndGrade(text: string, fileName: string): { subject?: Subject; grade?: number } {
  const sample = (fileName + "\n" + text.slice(0, 3000)).toLowerCase();
  
  let detectedSubject: Subject | undefined;
  let detectedGrade: number | undefined;

  // 1. Nhận diện Khối lớp (Lớp 1 -> 12)
  const gradePatterns = [
    /(?:lớp|lop|khối|khoi|khtn|toán|toan|văn|van|sinh|hóa|hoa|lí|ly|vật lí|vat ly|tin|tin học|anh|tiếng anh|gdcd|gdqp|gddp)\s*([1-9]|1[0-2])\b/i,
    /\b(?:lớp|lop|khối|khoi)\s*:?\s*([1-9]|1[0-2])\b/i,
    /\bkhbh\s+(?:môn\s+)?(?:[a-zà-ỹ\s]+)\s+([1-9]|1[0-2])\b/i,
    /\bgiao\s*an\s+(?:[a-zà-ỹ\s]+)\s+([1-9]|1[0-2])\b/i,
    /\b_([1-9]|1[0-2])(?:\.docx|\.pdf|_|\s)/i,
    /\b([1-9]|1[0-2])\s*(?:a|b|c|d|e|g|h|k)\b/i
  ];

  for (const regex of gradePatterns) {
    const match = sample.match(regex);
    if (match && match[1]) {
      const g = parseInt(match[1], 10);
      if (g >= 1 && g <= 12) {
        detectedGrade = g;
        break;
      }
    }
  }

  // 2. Nhận diện Môn học
  // Ưu tiên nhận diện các môn khoa học tự nhiên TRƯỚC khi kiểm tra Tiếng Anh
  // để tránh nhầm lẫn khi giáo án KHTN/Sinh có dòng "Năng lực Tiếng Anh" hay thuật ngữ khoa học tiếng Anh

  // Nhận diện nhanh: Nếu có các dấu hiệu môn khoa học tự nhiên rõ ràng → KHÔNG phải Tiếng Anh
  const isScienceSubject =
    sample.includes('nucleic acid') || sample.includes('dna') || sample.includes('rna') ||
    sample.includes('atp') || sample.includes('glucose') || sample.includes('nguyên tử') ||
    sample.includes('phân tử') || sample.includes('tế bào') || sample.includes('gen ') ||
    sample.includes('gene ') || sample.includes('nhiễm sắc thể') || sample.includes('quang hợp') ||
    sample.includes('hô hấp tế bào') || sample.includes('điện trở') || sample.includes('lực hút') ||
    sample.includes('phương trình hóa') || sample.includes('nguyên tố hóa') || sample.includes('phản ứng hóa');

  if (sample.includes('khoa học tự nhiên') || sample.includes('khtn')) {
    detectedSubject = Subject.KHTN;
  } else if (sample.includes('lịch sử và địa lí') || sample.includes('lịch sử & địa lí') || sample.includes('ls&đl') || sample.includes('ls và đl') || sample.includes('ls&dl') || sample.includes('ls-dl')) {
    detectedSubject = Subject.LSDIA;
  } else if (sample.includes('toán') || sample.includes('toan hoc') || sample.includes('hinh hoc') || sample.includes('dai so')) {
    detectedSubject = Subject.TOAN;
  } else if (sample.includes('ngữ văn') || sample.includes('ngu van') || sample.includes('tiếng việt') || sample.includes('tieng viet') || sample.includes('môn văn') || sample.includes('bài thơ') || sample.includes('văn bản')) {
    detectedSubject = Subject.VAN;
  } else if (sample.includes('tin học') || sample.includes('tin hoc') || sample.includes('scratch') || sample.includes('python') || sample.includes('lập trình')) {
    detectedSubject = Subject.TIN;
  } else if (sample.includes('vật lí') || sample.includes('vật lý') || sample.includes('vat li') || sample.includes('vat ly')) {
    detectedSubject = Subject.LY;
  } else if (sample.includes('hóa học') || sample.includes('hoa hoc')) {
    detectedSubject = Subject.HOA;
  } else if (sample.includes('sinh học') || sample.includes('sinh hoc')) {
    detectedSubject = Subject.SINH;
  } else if (sample.includes('lịch sử') || sample.includes('lich su')) {
    detectedSubject = Subject.SU;
  } else if (sample.includes('địa lí') || sample.includes('địa lý') || sample.includes('dia li') || sample.includes('dia ly')) {
    detectedSubject = Subject.DIA;
  } else if (sample.includes('gdcd') || sample.includes('giáo dục công dân') || sample.includes('gdkt&pl') || sample.includes('kinh tế và pháp luật')) {
    detectedSubject = Subject.GDCD;
  } else if (sample.includes('công nghệ') || sample.includes('cong nghe')) {
    detectedSubject = Subject.CONG_NGHE;
  } else if (sample.includes('giáo dục quốc phòng') || sample.includes('gdqp')) {
    detectedSubject = Subject.GDQPAN;
  } else if (sample.includes('giáo dục địa phương') || sample.includes('gddp')) {
    detectedSubject = Subject.GDDP;
  } else if (sample.includes('hoạt động trải nghiệm') || sample.includes('hđtn') || sample.includes('hdtn')) {
    detectedSubject = Subject.HDKH;
  } else if (sample.includes('tự nhiên và xã hội') || sample.includes('tnxh')) {
    detectedSubject = Subject.TNXH;
  } else if (sample.includes('khoa học') && !sample.includes('khoa học tự nhiên') && !sample.includes('khoa học xã hội')) {
    detectedSubject = Subject.KHOA_HOC;
  } else if (!isScienceSubject && (sample.includes('tiếng anh') || sample.includes('tieng anh') || sample.includes('english') || sample.includes('unit '))) {
    // CHỈ nhận diện Tiếng Anh khi KHÔNG có dấu hiệu môn khoa học tự nhiên nào
    // Điều kiện: "năng lực tiếng anh" hoặc "tích hợp tiếng anh" trong giáo án KHTN không được xét ở đây
    // vì các môn KHTN/Sinh đã được xử lý ở trên rồi → chỉ còn lại giáo án Tiếng Anh thực sự
    detectedSubject = Subject.ANH;
  }

  return { subject: detectedSubject, grade: detectedGrade };
}

// Nhận diện giáo án đã có NLS được chèn sẵn
function detectExistingNLS(text: string): boolean {
  // Dạng bracket gốc của GV: [1.1.TC1a: ...], [5.2.TC2b: ...], [6.2.CB1a: ...]
  const nlsBracket = /\[\d+\.\d+\.(TC|CB|NC)\d+[a-z]?:/i;
  // Dạng thẻ màu của ứng dụng: <blue>
  const nlsTag = /<blue>/i;
  return nlsBracket.test(text) || nlsTag.test(text);
}

interface ContentInputProps {
  lessonContent: string;
  setLessonContent: (val: string) => void;
  distributionContent: string;
  setDistributionContent: (val: string) => void;
  // Callback để lưu file DOCX gốc cho XML Injection
  onOriginalDocxLoaded?: (file: OriginalDocxFile | null) => void;
  // Callback thông báo khi phát hiện NLS trong file giáo án
  onNLSDetected?: (hasNLS: boolean) => void;
  // Callback tự động nhận diện Môn học & Khối lớp từ file
  onMetaDetected?: (meta: { subject?: Subject; grade?: number }) => void;
  // Dành cho tính năng Dịch sang Tiếng Anh
  originalDocx?: OriginalDocxFile | null;
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  subject?: Subject;
  grade?: number;
}

// Khai báo thư viện ngoại
declare const mammoth: any;
declare const pdfjsLib: any;

type PpctTab = 'file' | 'paste';

const ContentInput: React.FC<ContentInputProps> = ({
  lessonContent,
  setLessonContent,
  distributionContent,
  setDistributionContent,
  onOriginalDocxLoaded,
  onNLSDetected,
  onMetaDetected,
  originalDocx,
  apiKey,
  apiKeys,
  selectedModel,
  subject,
  grade,
}) => {

  const lessonInputRef = useRef<HTMLInputElement>(null);
  const distInputRef = useRef<HTMLInputElement>(null);

  const [processingLesson, setProcessingLesson] = useState(false);
  const [processingDist, setProcessingDist] = useState(false);
  const [ppctTab, setPpctTab] = useState<PpctTab>('file');
  const [showTranslateModal, setShowTranslateModal] = useState(false);


  const [lessonFileName, setLessonFileName] = useState<string | null>(null);
  const [distFileName, setDistFileName] = useState<string | null>(null);

  const processFile = async (file: File, isLesson: boolean) => {
    const setProcessing = isLesson ? setProcessingLesson : setProcessingDist;
    const setContent = isLesson ? setLessonContent : setDistributionContent;
    const setFileName = isLesson ? setLessonFileName : setDistFileName;

    setProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        text = await extractTextFromPDF(arrayBuffer);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        text = await extractTextFromDOCX(arrayBuffer);
        // Lưu file DOCX gốc cho XML Injection (chỉ với file giáo án)
        if (isLesson) {
          onOriginalDocxLoaded?.({ arrayBuffer, fileName: file.name });
        }
      } else {
        alert("Định dạng file không được hỗ trợ. Vui lòng chọn PDF hoặc DOCX.");
        setFileName(null);
        setProcessing(false);
        return;
      }

      if (!text.trim()) {
        alert("Không thể đọc được nội dung văn bản từ file này. Có thể file chứa ảnh scan?");
        setFileName(null);
        if (isLesson) onNLSDetected?.(false);
      } else {
        setContent(text);
        // Chỉ nhận diện NLS & Môn/Khối lớp cho file giáo án (không phải PPCT)
        if (isLesson) {
          onNLSDetected?.(detectExistingNLS(text));
          const meta = detectSubjectAndGrade(text, file.name);
          onMetaDetected?.(meta);
        }

      }

    } catch (error) {
      console.error("Error processing file:", error);
      alert("Có lỗi xảy ra khi đọc file.");
      setFileName(null);
    } finally {
      setProcessing(false);
    }
  };

  const extractTextFromDOCX = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (typeof mammoth === 'undefined') return "";
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') return "";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    return fullText;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isLesson: boolean) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, isLesson);
    e.target.value = '';
  };

  // Component hiển thị ô upload
  const UploadBox = ({
    title,
    subTitle,
    inputRef,
    fileName,
    isProcessing,
    isLesson,
    hasContent
  }: {
    title: string,
    subTitle: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    fileName: string | null,
    isProcessing: boolean,
    isLesson: boolean,
    hasContent: boolean
  }) => (
    <div
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group transform hover:-translate-y-0.5 active:scale-[0.99]
        ${hasContent 
          ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-teal-50/60 shadow-md shadow-emerald-500/5' 
          : 'border-indigo-200/90 bg-gradient-to-b from-indigo-50/50 via-slate-50/60 to-blue-50/30 hover:border-indigo-400 hover:bg-indigo-50/80 shadow-sm'}
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => handleFileChange(e, isLesson)}
        accept=".pdf,.docx"
        className="hidden"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center animate-pulse py-3">
          <Loader2 className="text-indigo-600 animate-spin mb-3" size={36} />
          <p className="text-sm font-bold text-indigo-950">Đang đọc & xử lý file...</p>
        </div>
      ) : hasContent ? (
        <div className="flex flex-col items-center py-2">
          <div className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 mb-3 group-hover:scale-105 transition-transform">
            <CheckCircle size={30} />
          </div>
          <p className="text-sm font-bold text-emerald-950 break-all px-4">{fileName}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-ping"></span>
            Đã tải lên thành công. Nhấn để thay đổi file.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-2">
          <div className="p-3.5 bg-white rounded-2xl shadow-md border border-slate-100 mb-3.5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
            {isLesson ? <FileText className="text-blue-600" size={30} /> : <FileUp className="text-indigo-600" size={30} />}
          </div>
          <p className="text-base font-extrabold text-slate-800 tracking-tight">{title}</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">{subTitle}</p>
          <div className="mt-3.5 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/80 text-indigo-600 border border-indigo-100 shadow-2xs">
            Hỗ trợ file .docx, .pdf
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white/90 backdrop-blur-md p-6 sm:p-7 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-100/80 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-7 w-1.5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Tài liệu đầu vào</h2>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/60">
          Bước 2 / 2
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Ô Upload Giáo án */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span><span className="text-red-500 mr-1">*</span> File Giáo án bài dạy</span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Bắt buộc</span>
          </label>
          <UploadBox
            title="Tải lên File Giáo án"
            subTitle="Kéo thả hoặc bấm để chọn file .docx / .pdf"
            inputRef={lessonInputRef}
            fileName={lessonFileName}
            isProcessing={processingLesson}
            isLesson={true}
            hasContent={!!lessonContent}
          />
          {originalDocx && (
            <button
              type="button"
              onClick={() => setShowTranslateModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/15 hover:shadow-lg transition-all active:scale-[0.99]"
            >
              <Globe size={15} />
              <span>🌐 Chuyển toàn bộ Giáo án gốc sang Tiếng Anh (Giữ nguyên Word)</span>
            </button>
          )}
          {/* Cảnh báo khuyến nghị dùng .docx */}
          <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mt-1">
            <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
              <span className="font-bold">Khuyến nghị dùng file .docx</span> — Giúp tải về giữ nguyên định dạng bảng biểu gốc. File PDF vẫn hoạt động nhưng kết quả xuất Word có thể mất định dạng.
            </p>
          </div>
          {!lessonContent && (
            <p className="text-xs font-semibold text-rose-500 flex items-center mt-1">
              <AlertCircle size={13} className="mr-1" /> Vui lòng chọn file giáo án trước khi tiếp tục
            </p>
          )}
        </div>

        {/* Ô PPCT — 2 Tab */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Phân phối chương trình (PPCT)</span>
            <span className="text-[11px] font-medium text-slate-400">Tùy chọn</span>
          </label>

          {/* Tab switcher */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setPpctTab('file')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all ${
                ppctTab === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FolderUp size={13} />
              Tải file
            </button>
            <button
              type="button"
              onClick={() => setPpctTab('paste')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all border-l border-slate-200 ${
                ppctTab === 'paste'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <ClipboardPaste size={13} />
              Dán / Nhập tay
            </button>
          </div>

          {/* Tab: Tải file */}
          {ppctTab === 'file' && (
            <UploadBox
              title="Tải lên File PPCT"
              subTitle="Tài liệu tham khảo YCCĐ năng lực (nếu có)"
              inputRef={distInputRef}
              fileName={distFileName}
              isProcessing={processingDist}
              isLesson={false}
              hasContent={!!distributionContent && ppctTab === 'file'}
            />
          )}

          {/* Tab: Dán / Nhập tay */}
          {ppctTab === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={distributionContent}
                onChange={(e) => setDistributionContent(e.target.value)}
                placeholder={`Dán (Ctrl+V) hoặc nhập nội dung PPCT vào đây...\n\nVí dụ: copy cột "Năng lực số" và "Năng lực AI" từ bảng Excel/Word của nhà trường rồi dán vào đây.`}
                rows={7}
                className={`w-full rounded-2xl border text-xs sm:text-sm font-medium text-slate-700 p-3.5 resize-none focus:outline-none focus:ring-4 transition-all shadow-sm
                  ${distributionContent
                    ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-500/10 focus:border-emerald-500'
                    : 'border-indigo-200 bg-slate-50/80 focus:ring-indigo-500/10 focus:border-indigo-400'
                  }`}
              />
              {distributionContent && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Đã có nội dung ({distributionContent.length} ký tự)
                  </p>
                  <button
                    type="button"
                    onClick={() => setDistributionContent('')}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    Xoá
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-xs font-medium text-slate-400 mt-1">Giúp AI trích xuất chính xác mã NLS từ chương trình nhà trường.</p>
        </div>
      </div>

      <TranslationModal
        isOpen={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        originalDocx={originalDocx}
        apiKey={apiKey}
        apiKeys={apiKeys}
        selectedModel={selectedModel}
        subject={subject}
        grade={grade}
        initialMode="ORIGINAL"
      />
    </div>
  );
};

export default ContentInput;