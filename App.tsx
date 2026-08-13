import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LessonForm from './components/LessonForm';
import ContentInput from './components/ContentInput';
import ResultDisplay from './components/ResultDisplay';
import { Subject, OriginalDocxFile, HistoryItem, IntegrationMode, LicenseInfo } from './types';
import { generateNLSLessonPlan } from './services/geminiService';
import { getLicenseInfo } from './services/licenseService';
import { Sparkles, Settings2, Key } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import HistoryModal from './components/HistoryModal';
import LicenseModal from './components/LicenseModal';

const App: React.FC = () => {
  // State for Form
  const [subject, setSubject] = useState<Subject>(Subject.TOAN);
  const [grade, setGrade] = useState<number>(7);
  const [includeNLSAndAI, setIncludeNLSAndAI] = useState<boolean>(true);
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>('BOTH');
  const [includeDisabilitySupport, setIncludeDisabilitySupport] = useState<boolean>(false);
  const [disabilityType, setDisabilityType] = useState<DisabilityType>('GENERAL');
  const [includeEnglishIntegration, setIncludeEnglishIntegration] = useState<boolean>(false);
  const [englishIntegrationLevel, setEnglishIntegrationLevel] = useState<import('./types').EnglishIntegrationLevel>('BASIC');

  // Content States
  const [lessonContent, setLessonContent] = useState<string>('');
  const [distributionContent, setDistributionContent] = useState<string>('');

  // State for Options
  const [analyzeOnly, setAnalyzeOnly] = useState(false);
  const [detailedReport, setDetailedReport] = useState(false);

  // App State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key & Model State
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [selectedMathModel, setSelectedMathModel] = useState<string>('gemini-3.5-flash');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // History State
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // License & Pro State
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => getLicenseInfo());
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);

  // State lưu trữ file DOCX gốc cho XML Injection
  const [originalDocx, setOriginalDocx] = useState<OriginalDocxFile | null>(null);

  useEffect(() => {
    // Tự động kiểm tra thông tin License & Dùng thử 5 ngày
    const lic = getLicenseInfo();
    setLicenseInfo(lic);

    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    const storedModel = localStorage.getItem('GEMINI_SELECTED_MODEL');
    const storedMathModel = localStorage.getItem('GEMINI_MATH_MODEL');
    const storedHistory = localStorage.getItem('NLS_HISTORY_LIST');

    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiKeyModal(true);
    }

    if (storedModel) setSelectedModel(storedModel);
    if (storedMathModel) setSelectedMathModel(storedMathModel);

    if (storedHistory) {
      try {
        setHistoryList(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Lỗi đọc lịch sử:", e);
      }
    }
  }, []);

  const handleSaveApiKey = (keys: string, model?: string, mathModel?: string) => {
    localStorage.setItem('GEMINI_API_KEY', keys);
    if (model) localStorage.setItem('GEMINI_SELECTED_MODEL', model);
    if (mathModel) localStorage.setItem('GEMINI_MATH_MODEL', mathModel);

    setApiKey(keys);
    if (model) setSelectedModel(model);
    if (mathModel) setSelectedMathModel(mathModel);

    setShowApiKeyModal(false);
  };

  const saveToHistory = (newItem: HistoryItem) => {
    setHistoryList(prev => {
      const filtered = prev.filter(i => i.id !== newItem.id);
      const updated = [newItem, ...filtered].slice(0, 30);
      localStorage.setItem('NLS_HISTORY_LIST', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryList(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem('NLS_HISTORY_LIST', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setHistoryList([]);
    localStorage.removeItem('NLS_HISTORY_LIST');
  };

  const handleProcess = async () => {
    // Kiểm tra bản quyền & dùng thử 5 ngày
    const currentLic = getLicenseInfo();
    setLicenseInfo(currentLic);

    if (!currentLic.isPro && currentLic.isTrialExpired) {
      setError("⚠️ Thời gian dùng thử 5 ngày đã hết. Vui lòng kích hoạt Bản Pro để tiếp tục sử dụng!");
      setShowLicenseModal(true);
      return;
    }

    if (!lessonContent || lessonContent.trim().length === 0) {
      setError("Vui lòng tải lên file giáo án (Giáo án trống hoặc chưa được tải).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pass both contents to service
      const generatedText = await generateNLSLessonPlan(
        {
          subject,
          grade,
          content: lessonContent,
          distributionContent: distributionContent
        },
        { 
          analyzeOnly, 
          detailedReport, 
          comparisonExport: false, 
          apiKey, 
          selectedModel, 
          selectedMathModel, 
          integrationMode: includeNLSAndAI ? integrationMode : 'NONE',
          includeDisabilitySupport,
          disabilityType,
          includeEnglishIntegration,
          englishIntegrationLevel
        }
      );

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại với file giáo án rõ ràng hơn.");
      }

      setResult(generatedText);

      // Tự động lưu vào Lịch sử
      const firstLine = lessonContent.split('\n').find(l => l.trim().length > 0) || 'Bài dạy tích hợp NLS';
      const lessonTitle = originalDocx?.fileName
        ? originalDocx.fileName.replace(/\.docx$/i, '')
        : (firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine);

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        subject,
        grade,
        lessonTitle,
        originalFileName: originalDocx?.fileName,
        result: generatedText,
        integrationMode: includeNLSAndAI ? integrationMode : 'NONE',
        includeDisabilitySupport,
        disabilityType,
        englishIntegrationLevel: includeEnglishIntegration ? englishIntegrationLevel : undefined,
      };

      saveToHistory(historyItem);
    } catch (err: any) {
      console.error("Process Error:", err);
      setError(err.message || "Đã xảy ra lỗi không xác định khi kết nối với AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-blue-50/50 font-sans pb-16">
      <Header
        onOpenSettings={() => setShowApiKeyModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenLicense={() => setShowLicenseModal(true)}
        historyCount={historyList.length}
        licenseInfo={licenseInfo}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <LessonForm
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
              includeNLSAndAI={includeNLSAndAI} setIncludeNLSAndAI={setIncludeNLSAndAI}
              integrationMode={integrationMode} setIntegrationMode={setIntegrationMode}
              includeDisabilitySupport={includeDisabilitySupport} setIncludeDisabilitySupport={setIncludeDisabilitySupport}
              disabilityType={disabilityType} setDisabilityType={setDisabilityType}
              includeEnglishIntegration={includeEnglishIntegration} setIncludeEnglishIntegration={setIncludeEnglishIntegration}
              englishIntegrationLevel={englishIntegrationLevel} setEnglishIntegrationLevel={setEnglishIntegrationLevel}
            />

            <ContentInput
              lessonContent={lessonContent}
              setLessonContent={setLessonContent}
              distributionContent={distributionContent}
              setDistributionContent={setDistributionContent}
              onOriginalDocxLoaded={setOriginalDocx}
            />

            {/* Options Panel */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-100/80">
              <div className="flex items-center mb-4">
                <Settings2 className="text-indigo-600 mr-2.5" size={20} />
                <h3 className="font-extrabold text-slate-900 tracking-tight">Tùy chọn nâng cao</h3>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8">
                <label className="flex items-center space-x-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={analyzeOnly}
                    onChange={(e) => setAnalyzeOnly(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Chỉ phân tích, không chỉnh sửa</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={detailedReport}
                    onChange={(e) => setDetailedReport(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Kèm báo cáo giải thích chi tiết</span>
                </label>
              </div>
            </div>

            {/* API Key Config Button */}
            <div className="flex justify-between sm:justify-end items-center space-x-3 px-1">
              {!apiKey && (
                <span className="text-xs sm:text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-bold animate-pulse">
                  ⚠️ Chưa cấu hình API Key Gemini
                </span>
              )}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1.5 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                <Key size={16} />
                <span>Cấu hình API Key & Model</span>
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl flex items-center shadow-sm">
                <span className="font-bold mr-2 text-rose-900">Lỗi:</span> {error}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-4 sm:py-5 rounded-2xl shadow-xl flex items-center justify-center space-x-3 text-white font-extrabold text-lg sm:text-xl transition-all duration-300 transform active:scale-[0.99] ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 shadow-indigo-500/30 hover:shadow-indigo-500/50'
              }`}
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>ĐANG XỬ LÝ VÀ SOẠN BÀI...</span>
                </span>
              ) : (
                <>
                  <Sparkles size={26} className="text-amber-300 animate-pulse" />
                  <span className="tracking-wide">BẮT ĐẦU SOẠN GIÁO ÁN</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Info */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-900/20 border border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <h3 className="font-extrabold text-lg mb-4 flex items-center text-indigo-200">
                <Sparkles size={18} className="mr-2 text-amber-300" />
                Hướng dẫn nhanh
              </h3>
              <ul className="space-y-3.5 text-indigo-100/90 text-sm">
                <li className="flex items-start">
                  <span className="bg-gradient-to-br from-blue-500 to-indigo-600 font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs text-white mr-2.5 mt-0.5 shadow-sm shrink-0">1</span>
                  <span>Chọn <b>Môn học</b> và <b>Khối lớp</b> cần soạn bài.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-gradient-to-br from-blue-500 to-indigo-600 font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs text-white mr-2.5 mt-0.5 shadow-sm shrink-0">2</span>
                  <span><b className="text-white">Bắt buộc:</b> Tải lên file giáo án gốc của giáo viên (định dạng <b>.docx</b> hoặc .pdf).</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-700/60 font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs text-white mr-2.5 mt-0.5 shrink-0">3</span>
                  <span><i>Tùy chọn:</i> Tải file PPCT để AI trích xuất chính xác năng lực số từ chương trình nhà trường.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-100/80">
              <h3 className="font-extrabold text-slate-900 mb-3 text-base">Miền Năng Lực Số (TT 02)</h3>
              <div className="space-y-2.5">
                {[
                  "Khai thác dữ liệu và thông tin",
                  "Giao tiếp và Hợp tác",
                  "Sáng tạo nội dung số",
                  "An toàn số",
                  "Giải quyết vấn đề",
                  "Ứng dụng Trí tuệ Nhân tạo (AI)"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm font-semibold text-slate-700 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-2.5"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-10">
          <ResultDisplay result={result} loading={loading} originalDocx={originalDocx} />
        </div>
      </main>

      <footer className="mt-16 text-center text-slate-500 text-sm py-6 space-y-1.5 border-t border-slate-200/60">
        <p>© 2026 NLS & AI Assistant. Built with Gemini API & React.</p>
        <p className="font-bold text-slate-700">Tác giả: GV. NGUYỄN BỈNH KHÔI - ZALO: 0909 461 641</p>
      </footer>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSave={handleSaveApiKey}
        onClose={() => setShowApiKeyModal(false)}
        initialKey={apiKey}
        initialModel={selectedModel}
        initialMathModel={selectedMathModel}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyList={historyList}
        onSelectHistory={(item) => {
          setResult(item.result);
          setSubject(item.subject);
          setGrade(item.grade);
        }}
        onDeleteHistory={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
      />

      <LicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        licenseInfo={licenseInfo}
        onLicenseUpdated={() => setLicenseInfo(getLicenseInfo())}
      />
    </div>
  );
};

export default App;

