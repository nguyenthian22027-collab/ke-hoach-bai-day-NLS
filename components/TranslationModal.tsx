import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  FileText, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Check
} from 'lucide-react';
import { OriginalDocxFile, Subject } from '../types';
import { translateDocxInPlace, TranslationProgress } from '../services/docxTranslationService';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalDocx?: OriginalDocxFile | null;
  result?: string | null;
  injectContentToDocx?: (originalArrayBuffer: ArrayBuffer, aiResult: string) => Promise<Blob>;
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  subject?: Subject;
  grade?: number;
  initialMode?: 'ORIGINAL' | 'INTEGRATED';
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  originalDocx,
  result,
  injectContentToDocx,
  apiKey,
  apiKeys,
  selectedModel,
  subject,
  grade,
  initialMode = 'ORIGINAL'
}) => {
  const [mode, setMode] = useState<'ORIGINAL' | 'INTEGRATED'>(initialMode);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedDocxBlob, setCompletedDocxBlob] = useState<Blob | null>(null);
  const [completedFileName, setCompletedFileName] = useState<string>('');
  const [translatedMarkdown, setTranslatedMarkdown] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Nếu có kết quả đã tích hợp và initialMode là INTEGRATED thì chọn INTEGRATED, ngược lại ORIGINAL
      if (initialMode === 'INTEGRATED' && result) {
        setMode('INTEGRATED');
      } else {
        setMode('ORIGINAL');
      }
      setError(null);
      setCompletedDocxBlob(null);
      setCompletedFileName('');
      setTranslatedMarkdown('');
      setProgress(null);
      setIsTranslating(false);
    }
  }, [isOpen, initialMode, result]);

  if (!isOpen) return null;

  const handleStartTranslate = async () => {
    if (!originalDocx?.arrayBuffer) {
      setError('Không tìm thấy dữ liệu file Word gốc. Vui lòng tải lại file giáo án.');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setCompletedDocxBlob(null);
    setTranslatedMarkdown('');
    setProgress({
      stage: 'Đang chuẩn bị tài liệu...',
      current: 0,
      total: 100,
      percent: 2
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let bufferToTranslate: ArrayBuffer;
      let targetFileName: string;

      const baseName = originalDocx.fileName.replace(/\.docx$/i, '');

      if (mode === 'INTEGRATED' && result && injectContentToDocx) {
        setProgress({
          stage: 'Đang chèn các nội dung NLS/AI/STEM vào file Word gốc trước khi dịch...',
          current: 0,
          total: 100,
          percent: 5
        });

        // 1. Chèn nội dung tích hợp vào DOCX trước
        const injectedBlob = await injectContentToDocx(originalDocx.arrayBuffer, result);
        bufferToTranslate = await injectedBlob.arrayBuffer();
        targetFileName = `${baseName}_NLS_English.docx`;
      } else {
        // Dịch trực tiếp từ file giáo án gốc
        bufferToTranslate = originalDocx.arrayBuffer;
        targetFileName = `${baseName}_English.docx`;
      }

      // 2. Chạy In-place XML Translation
      const { docxBlob, translatedMarkdown: md } = await translateDocxInPlace(
        bufferToTranslate,
        {
          apiKey,
          apiKeys,
          selectedModel,
          subject,
          grade,
          signal: abortController.signal,
          onProgress: (p) => setProgress(p)
        }
      );

      setCompletedDocxBlob(docxBlob);
      setCompletedFileName(targetFileName);
      setTranslatedMarkdown(md);

      // Tự động tải file Word về máy
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      if (err.message && err.message.includes('hủy')) {
        setError('Đã hủy quá trình dịch theo yêu cầu.');
      } else {
        console.error('Translation error:', err);
        setError(err.message || 'Đã xảy ra lỗi trong quá trình dịch thuật sang tiếng Anh.');
      }
    } finally {
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDownloadAgain = () => {
    if (completedDocxBlob && completedFileName) {
      const url = URL.createObjectURL(completedDocxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = completedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
              <Globe size={26} className="text-cyan-200" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
                Chuyển Giáo án sang Tiếng Anh
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30">
                  Chuẩn Quốc tế 100%
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100/80 mt-0.5">
                Bảo toàn 100% cấu trúc, bảng biểu 2 cột, ảnh và công thức của file Word gốc
              </p>
            </div>
          </div>
          {!isTranslating && (
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 space-y-5 overflow-y-auto text-left">
          {/* Thông tin file Word gốc */}
          {originalDocx ? (
            <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">File Word gốc được dùng làm khuôn mẫu:</p>
                  <p className="text-xs sm:text-sm font-bold text-indigo-950 truncate">{originalDocx.fileName}</p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                <Check size={13} /> Sẵn sàng
              </span>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-900">
                Chưa nhận diện file Word (.docx). Vui lòng tải file giáo án .docx để giữ được bảng biểu.
              </p>
            </div>
          )}

          {/* Lựa chọn phạm vi dịch (Phương án C) */}
          {!completedDocxBlob && !isTranslating && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Chọn phạm vi giáo án muốn dịch:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lựa chọn 1: Giáo án gốc */}
                <button
                  type="button"
                  onClick={() => setMode('ORIGINAL')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    mode === 'ORIGINAL'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md ring-2 ring-blue-400/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">📄</span>
                    {mode === 'ORIGINAL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">Đang chọn</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">1. Giáo án GỐC nguyên bản</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Dịch trực tiếp file của Thầy/Cô sang Tiếng Anh, <strong>không thêm NLS/AI</strong>. Rất tiện khi chỉ cần dịch giáo án môn học thông thường.
                  </p>
                </button>

                {/* Lựa chọn 2: Giáo án đã tích hợp */}
                <button
                  type="button"
                  onClick={() => {
                    if (result) setMode('INTEGRATED');
                  }}
                  disabled={!result}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    !result 
                      ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' 
                      : mode === 'INTEGRATED'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md ring-2 ring-purple-400/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">✨</span>
                    {mode === 'INTEGRATED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">Đang chọn</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">2. Giáo án ĐÃ TÍCH HỢP NLS & AI</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {result ? (
                      <>Dịch toàn bộ bài học <strong>đã chèn đầy đủ NLS, AI, STEM, QPAN</strong> sang Tiếng Anh chuẩn quốc tế.</>
                    ) : (
                      <>Cần tạo giáo án tích hợp NLS trước khi chọn mục này.</>
                    )}
                  </p>
                </button>
              </div>

              {/* Cam kết kỹ thuật */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🛡️</span> <strong>Cam kết bảo toàn hình thức 100%:</strong>
                </p>
                <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                  <li>Giữ nguyên bảng 2 cột (Hoạt động GV - Hoạt động HS), độ rộng cột và viền kẻ ô.</li>
                  <li>Giữ nguyên hình ảnh minh họa, logo trường và công thức Toán học (MathType/OLE).</li>
                  <li>Dịch chuẩn thuật ngữ sư phạm Công văn 5512 (Objectives, Warm-up, Knowledge Formation...).</li>
                </ul>
              </div>
            </div>
          )}

          {/* Đang dịch - Tiến trình */}
          {isTranslating && progress && (
            <div className="p-6 bg-gradient-to-b from-indigo-50/80 to-blue-50/50 border border-indigo-200 rounded-2xl space-y-4 text-center">
              <div className="inline-flex p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 animate-spin">
                <Loader2 size={32} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-indigo-950">{progress.stage}</h4>
                <p className="text-xs text-indigo-700 font-medium">
                  Hệ thống đang dịch từng khối văn bản và giữ nguyên liên kết cấu trúc Word...
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(progress.percent, 5)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>Tiến trình hoàn thành:</span>
                <span className="text-indigo-700 text-sm">{progress.percent}%</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                >
                  Hủy quá trình dịch
                </button>
              </div>
            </div>
          )}

          {/* Dịch hoàn tất thành công */}
          {completedDocxBlob && (
            <div className="p-6 bg-gradient-to-b from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl space-y-4 text-center animate-fadeIn">
              <div className="inline-flex p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={34} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-extrabold text-emerald-950">
                  Chuyển sang Tiếng Anh Thành công!
                </h4>
                <p className="text-xs text-emerald-800 font-medium">
                  File Word tiếng Anh giữ nguyên 100% định dạng đã tự động được tải về máy của bạn:
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-900 bg-white/80 py-1.5 px-3 rounded-xl border border-emerald-200 inline-block mt-1">
                  {completedFileName}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadAgain}
                  className="flex items-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <Download size={16} />
                  <span>Tải lại file Word (.docx)</span>
                </button>

                {translatedMarkdown && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
                  >
                    {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{showPreview ? 'Ẩn bản dịch' : 'Xem trước bản dịch'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCompletedDocxBlob(null);
                    setCompletedFileName('');
                    setTranslatedMarkdown('');
                  }}
                  className="flex items-center gap-1 py-2.5 px-3 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  <RotateCcw size={14} />
                  <span>Dịch lại</span>
                </button>
              </div>

              {showPreview && translatedMarkdown && (
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl max-h-60 overflow-y-auto text-left text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {translatedMarkdown}
                </div>
              )}
            </div>
          )}

          {/* Báo lỗi nếu có */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <strong className="block font-bold mb-0.5">Lỗi dịch thuật:</strong>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isTranslating}
            className="py-2.5 px-5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {completedDocxBlob ? 'Đóng' : 'Hủy bỏ'}
          </button>

          {!completedDocxBlob && (
            <button
              type="button"
              onClick={handleStartTranslate}
              disabled={isTranslating || !originalDocx}
              className="flex items-center gap-2 py-2.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 active:scale-95"
            >
              {isTranslating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý dịch...</span>
                </>
              ) : (
                <>
                  <Globe size={16} />
                  <span>Bắt đầu Chuyển sang Tiếng Anh</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
