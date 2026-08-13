import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle, FileText, FileUp, AlertCircle } from 'lucide-react';
import { OriginalDocxFile } from '../types';

interface ContentInputProps {
  lessonContent: string;
  setLessonContent: (val: string) => void;
  distributionContent: string;
  setDistributionContent: (val: string) => void;
  // Callback để lưu file DOCX gốc cho XML Injection
  onOriginalDocxLoaded?: (file: OriginalDocxFile | null) => void;
}

// Khai báo thư viện ngoại
declare const mammoth: any;
declare const pdfjsLib: any;

const ContentInput: React.FC<ContentInputProps> = ({
  lessonContent,
  setLessonContent,
  distributionContent,
  setDistributionContent,
  onOriginalDocxLoaded
}) => {
  const lessonInputRef = useRef<HTMLInputElement>(null);
  const distInputRef = useRef<HTMLInputElement>(null);

  const [processingLesson, setProcessingLesson] = useState(false);
  const [processingDist, setProcessingDist] = useState(false);

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
      } else {
        setContent(text);
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
          {!lessonContent && (
            <p className="text-xs font-semibold text-rose-500 flex items-center mt-1">
              <AlertCircle size={13} className="mr-1" /> Vui lòng chọn file giáo án trước khi tiếp tục
            </p>
          )}
        </div>

        {/* Ô Upload PPCT */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>File Phân phối chương trình (PPCT)</span>
            <span className="text-[11px] font-medium text-slate-400">Tùy chọn</span>
          </label>
          <UploadBox
            title="Tải lên File PPCT"
            subTitle="Tài liệu tham khảo YCCĐ năng lực (nếu có)"
            inputRef={distInputRef}
            fileName={distFileName}
            isProcessing={processingDist}
            isLesson={false}
            hasContent={!!distributionContent}
          />
          <p className="text-xs font-medium text-slate-400 mt-1">Giúp AI trích xuất chính xác mã NLS từ chương trình nhà trường.</p>
        </div>
      </div>
    </div>
  );
};

export default ContentInput;