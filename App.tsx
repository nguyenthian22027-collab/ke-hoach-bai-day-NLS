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
    <div className="min-h-screen bg-[#E3F2FD] font-sans pb-12">
      <Header
        onOpenSettings={() => setShowApiKeyModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenLicense={() => setShowLicenseModal(true)}
        historyCount={historyList.length}
        licenseInfo={licenseInfo}
      />

      <main className="max-w-5xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="flex items-center mb-4">
                <Settings2 className="text-blue-600 mr-2" size={20} />
                <h3 className="font-semibold text-blue-900">Tùy chọn nâng cao</h3>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyzeOnly}
                    onChange={(e) => setAnalyzeOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Chỉ phân tích, không chỉnh sửa</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailedReport}
                    onChange={(e) => setDetailedReport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Kèm báo cáo chi tiết</span>
                </label>
              </div>
            </div>

            {/* API Key Config Button */}
            <div className="flex justify-end items-center space-x-3">
              {!apiKey && (
                <span className="text-sm text-orange-600 font-medium animate-pulse">
                  ⚠️ Vui lòng lấy API KEY trước khi sử dụng app
                </span>
              )}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Key size={16} />
                <span>Cấu hình API Key</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <span className="font-medium mr-2">Lỗi:</span> {error}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-white font-bold text-lg transition-all transform hover:-translate-y-1 ${loading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:shadow-blue-500/30'
                }`}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>BẮT ĐẦU SOẠN GIÁO ÁN</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Info */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-blue-800 text-white p-6 rounded-xl shadow-md">
              <h3 className="font-bold text-lg mb-4">Hướng dẫn nhanh</h3>
              <ul className="space-y-3 text-blue-100 text-sm">
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                  Chọn môn học và khối lớp.
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                  <b>Bắt buộc:</b> Tải lên file giáo án (.docx hoặc .pdf).
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500/50 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                  <i>Tùy chọn:</i> Tải file PPCT nếu muốn AI tham khảo năng lực cụ thể của trường.
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-2">Miền năng lực số</h3>
              <div className="space-y-2">
                {[
                  "Khai thác dữ liệu và thông tin",
                  "Giao tiếp và Hợp tác",
                  "Sáng tạo nội dung số",
                  "An toàn số",
                  "Giải quyết vấn đề",
                  "Ứng dụng AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-8">
          <ResultDisplay result={result} loading={loading} originalDocx={originalDocx} />
        </div>
      </main>

      <footer className="mt-12 text-center text-blue-800/80 text-sm py-6 space-y-1">
        <p>© NLS & AI Assistant. Built with Gemini API & React.</p>
        <p className="font-semibold text-blue-900">Tác giả: GV. NGUYỄN BỈNH KHÔI - ZALO: 0909 461 641</p>
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

