import React, { useState, useEffect } from 'react';
import { Settings, Key, Zap, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { parseApiKeys, testApiKey, TestKeyResult } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (keys: string, selectedModel?: string, selectedMathModel?: string) => void;
  onClose: () => void;
  initialKey?: string;
  initialModel?: string;
  initialMathModel?: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onSave,
  onClose,
  initialKey = '',
  initialModel = 'gemini-3.5-flash',
  initialMathModel = 'gemini-3.5-flash'
}) => {
  const [keysInput, setKeysInput] = useState(initialKey);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [selectedMathModel, setSelectedMathModel] = useState(initialMathModel);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestKeyResult | null>(null);

  useEffect(() => {
    setKeysInput(initialKey);
    setSelectedModel(initialModel || 'gemini-3.5-flash');
    setSelectedMathModel(initialMathModel || 'gemini-3.5-flash');
    setTestResult(null);
  }, [initialKey, initialModel, initialMathModel, isOpen]);

  if (!isOpen) return null;

  const validKeys = parseApiKeys(keysInput);
  const keyCount = validKeys.length;

  const handleTestConnection = async () => {
    if (keyCount === 0) {
      setTestResult({
        ok: false,
        msg: 'Vui lòng nhập ít nhất 1 Gemini API Key.',
        testedCount: 0,
        validCount: 0
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testApiKey({
        apiKey: keysInput,
        model: selectedModel
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        ok: false,
        msg: e.message || 'Lỗi không xác định khi kết nối API.',
        testedCount: keyCount,
        validCount: 0
      });
    } finally {
      setTesting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keysInput.trim(), selectedModel, selectedMathModel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 transform transition-all">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Settings size={22} className="animate-spin-slow" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Cài đặt Gemini API & Models
            </h3>
          </div>
          <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs flex items-center space-x-1 shadow-sm">
            <Key size={12} className="mr-1" />
            {keyCount} Key
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">

          {/* Alert Box / Guideline */}
          <div className="bg-blue-50/90 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-2 text-slate-700">
            <div className="font-bold text-blue-900 flex items-center space-x-1.5 text-sm">
              <span className="text-base">💡</span>
              <span>Lưu ý về định dạng API Key Google Gemini:</span>
            </div>
            <p className="leading-relaxed">
              API Key chính thức từ <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline hover:text-blue-900">Google AI Studio (aistudio.google.com)</a> luôn bắt đầu bằng chữ <strong className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono">AIzaSy...</strong>
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              (Nếu bạn copy chuỗi bắt đầu <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">AQ...</code> từ trang quản lý dự án Cloud, hãy vào <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">Google AI Studio → Get API Key</a> để lấy key chuẩn AIzaSy nhé).
            </p>
          </div>

          {/* Textarea Multi-Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Danh sách Gemini API Keys (AIzaSy...):
              </label>
              <span className="text-xs text-slate-400 font-normal">
                (Mỗi API Key 1 dòng hoặc cách nhau bởi dấu phẩy)
              </span>
            </div>
            <textarea
              rows={4}
              value={keysInput}
              onChange={(e) => {
                setKeysInput(e.target.value);
                setTestResult(null);
              }}
              placeholder={`AQ.Ab8RN6JL_VW0fszk-V4xBfibntrqe0jfmhll0RyEjcnf26t4A...\nAQ.Ab8RN6KVwimFlzj_z3hetgCBegesvasissZXp418Q81UyO8QAW...`}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y shadow-inner"
            />
          </div>

          {/* Model Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            
            {/* Model OCR / Soạn thảo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Model OCR Nhận diện:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="gemini-3.5-flash">🌟 gemini-3.5-flash (Model Mới Nhất 2026)</option>
                <option value="gemini-3.0-flash">🚀 gemini-3.0-flash (Thế hệ 3.0 Siêu Nhanh)</option>
                <option value="gemini-3.1-flash-lite">⚡ gemini-3.1-flash-lite (Hạn ngạch Quota cao)</option>
                <option value="gemini-3.6-flash">✨ gemini-3.6-flash (Mới ra mắt)</option>
                <option value="gemini-2.0-flash">🔷 gemini-2.0-flash (Ổn định, Đọc toán cực tốt)</option>
                <option value="gemini-1.5-flash">🧠 gemini-1.5-flash (Chuẩn Google)</option>
                <option value="gemini-1.5-pro">🎯 gemini-1.5-pro (Đọc để chữ mờ / khó)</option>
                <option value="auto">🔄 Tự động xoay vòng Model (Auto Fallback)</option>
              </select>
            </div>

            {/* Model Giải toán / Tối ưu */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Model Giải toán / Tối ưu:
              </label>
              <select
                value={selectedMathModel}
                onChange={(e) => setSelectedMathModel(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gemini-3.0-flash">gemini-3.0-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>

          </div>

          {/* Test Status Banner */}
          {testing && (
            <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl p-3 text-xs flex items-center space-x-2 animate-pulse">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span>Đang kiểm tra kết nối tới Gemini API...</span>
            </div>
          )}

          {testResult && !testing && (
            <div className={`p-3.5 rounded-2xl text-xs border flex flex-col space-y-1 ${
              testResult.ok 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <div className="flex items-center space-x-2 font-semibold">
                {testResult.ok ? (
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{testResult.msg}</span>
              </div>
              {testResult.details && testResult.details.length > 1 && (
                <div className="mt-1 pl-6 space-y-0.5 text-[11px] opacity-90">
                  {testResult.details.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-mono">{d.key}:</span>
                      <span className={d.ok ? "text-green-700 font-medium" : "text-rose-700 font-medium"}>
                        {d.msg}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            
            {/* Test Button */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 border border-rose-300 text-rose-600 hover:bg-rose-50/80 font-medium rounded-2xl text-xs sm:text-sm transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Zap size={16} className="text-rose-500 fill-rose-500/20" />
              <span>{testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
            </button>

            {/* Right Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-2xl text-xs sm:text-sm transition-all"
              >
                Đóng
              </button>
              
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-rose-500/25 active:scale-95"
              >
                Xong & Lưu
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};

export default ApiKeyModal;
