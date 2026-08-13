import React from 'react';
import { Subject, IntegrationMode, DisabilityType } from '../types';
import { Bot, Cpu, Sparkles, HeartHandshake } from 'lucide-react';

interface LessonFormProps {
  subject: Subject;
  setSubject: (val: Subject) => void;
  grade: number;
  setGrade: (val: number) => void;
  includeNLSAndAI: boolean;
  setIncludeNLSAndAI: (val: boolean) => void;
  integrationMode: IntegrationMode;
  setIntegrationMode: (val: IntegrationMode) => void;
  includeDisabilitySupport: boolean;
  setIncludeDisabilitySupport: (val: boolean) => void;
  disabilityType: DisabilityType;
  setDisabilityType: (val: DisabilityType) => void;
  includeEnglishIntegration: boolean;
  setIncludeEnglishIntegration: (val: boolean) => void;
  englishIntegrationLevel: import('../types').EnglishIntegrationLevel;
  setEnglishIntegrationLevel: (val: import('../types').EnglishIntegrationLevel) => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  subject,
  setSubject,
  grade,
  setGrade,
  includeNLSAndAI,
  setIncludeNLSAndAI,
  integrationMode,
  setIntegrationMode,
  includeDisabilitySupport,
  setIncludeDisabilitySupport,
  disabilityType,
  setDisabilityType,
  includeEnglishIntegration,
  setIncludeEnglishIntegration,
  englishIntegrationLevel,
  setEnglishIntegrationLevel,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md p-6 sm:p-7 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-100/80 mb-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-7 w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Thông tin Kế hoạch bài dạy
          </h2>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200/60">
          Bước 1 / 2
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Subject */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Môn học</label>
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="block w-full rounded-2xl border-slate-200 bg-slate-50/80 p-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm"
            >
              {Object.values(Subject).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Khối lớp</label>
          <div className="relative">
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="block w-full rounded-2xl border-slate-200 bg-slate-50/80 p-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Lớp {g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Integration Mode Selector */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={includeNLSAndAI}
            onChange={(e) => setIncludeNLSAndAI(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-blue-600 transition-colors">
            <Bot className="text-blue-600 mr-2" size={20} />
            Tích hợp Năng lực số & Năng lực AI <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">TT 02/2025 & QĐ 3439</span>
          </span>
        </label>

        {includeNLSAndAI && (
          <div className="p-4 bg-slate-50/90 border border-indigo-100 rounded-2xl space-y-3 animate-fadeIn shadow-inner">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Chọn chế độ tích hợp chi tiết:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setIntegrationMode('BOTH')}
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all transform active:scale-95 ${
                  integrationMode === 'BOTH'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-sm'
                }`}
              >
                <Sparkles size={17} />
                <span>Tích hợp NLS & AI (Khuyên dùng)</span>
              </button>

              <button
                type="button"
                onClick={() => setIntegrationMode('NLS')}
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all transform active:scale-95 ${
                  integrationMode === 'NLS'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-sm'
                }`}
              >
                <Cpu size={17} />
                <span>Chỉ Năng lực số</span>
              </button>

              <button
                type="button"
                onClick={() => setIntegrationMode('AI')}
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all transform active:scale-95 ${
                  integrationMode === 'AI'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-sm'
                }`}
              >
                <Bot size={17} />
                <span>Chỉ Năng lực AI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inclusive Education Section */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={includeDisabilitySupport}
            onChange={(e) => setIncludeDisabilitySupport(e.target.checked)}
            className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-emerald-700 transition-colors">
            <HeartHandshake className="text-emerald-600 mr-2" size={20} />
            Tích hợp Giáo dục Hòa nhập (Học sinh Khuyết tật) <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">TT 03/2018</span>
          </span>
        </label>

        {includeDisabilitySupport && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5 text-left animate-fadeIn shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950">
              Dạng khuyết tật / Đối tượng học sinh cần hỗ trợ:
            </label>
            <select
              value={disabilityType}
              onChange={(e) => setDisabilityType(e.target.value as DisabilityType)}
              className="block w-full rounded-xl border-emerald-300 bg-white p-3 text-xs sm:text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-sm"
            >
              <option value="GENERAL">🤝 Hòa nhập tổng hợp (Tất cả học sinh khuyết tật)</option>
              <option value="INTELLECTUAL">🧠 Khuyết tật Trí tuệ / Khó khăn học tập</option>
              <option value="VISUAL">👁️ Khuyết tật Thị giác (Nhìn)</option>
              <option value="HEARING">👂 Khuyết tật Thính giác (Nghe/Nói)</option>
              <option value="MOTOR">🦽 Khuyết tật Vận động</option>
            </select>
          </div>
        )}
      </div>

      {/* English Integration Section */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={includeEnglishIntegration}
            onChange={(e) => setIncludeEnglishIntegration(e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-indigo-700 transition-colors">
            <span className="text-xl mr-2">🇬🇧</span>
            Tích hợp Tiếng Anh (Ngôn ngữ thứ 2) <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">QĐ 2371/2025</span>
          </span>
        </label>

        {includeEnglishIntegration && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2.5 text-left animate-fadeIn shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950">
              Mức độ tích hợp Tiếng Anh (CLIL):
            </label>
            <select
              value={englishIntegrationLevel}
              onChange={(e) => setEnglishIntegrationLevel(e.target.value as import('../types').EnglishIntegrationLevel)}
              className="block w-full rounded-xl border-indigo-300 bg-white p-3 text-xs sm:text-sm font-bold text-indigo-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
            >
              <option value="BASIC">🟢 Cấp độ 1 (Cơ bản): Tích hợp từ vựng song ngữ (Key Vocabulary)</option>
              <option value="INTER">🔵 Cấp độ 2 (Trung cấp): Tích hợp Câu lệnh lớp học (Classroom Instructions)</option>
              <option value="CLIL">🟣 Cấp độ 3 (Nâng cao): Soạn bài theo chuẩn CLIL toàn diện</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonForm;
