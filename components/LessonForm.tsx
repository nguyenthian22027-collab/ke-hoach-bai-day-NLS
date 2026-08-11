import React from 'react';
import { Subject, IntegrationMode, DisabilityType } from '../types';
import { Bot, Cpu, Sparkles, HeartHandshake } from 'lucide-react';

interface LessonFormProps {
  subject: Subject;
  setSubject: (val: Subject) => void;
  grade: number;
  setGrade: (val: number) => void;
  integrationMode: IntegrationMode;
  setIntegrationMode: (val: IntegrationMode) => void;
  includeDisabilitySupport: boolean;
  setIncludeDisabilitySupport: (val: boolean) => void;
  disabilityType: DisabilityType;
  setDisabilityType: (val: DisabilityType) => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  subject,
  setSubject,
  grade,
  setGrade,
  integrationMode,
  setIntegrationMode,
  includeDisabilitySupport,
  setIncludeDisabilitySupport,
  disabilityType,
  setDisabilityType,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-1 bg-blue-600 rounded-full mr-3"></div>
          <h2 className="text-lg font-semibold text-blue-900">Thông tin Kế hoạch bài dạy</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject */}
        <div className="space-y-2 text-left">
          <label className="block text-sm font-medium text-slate-700">Môn học</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
            className="block w-full rounded-lg border-slate-200 bg-slate-50 border p-2.5 text-slate-700 focus:border-blue-500 focus:ring-blue-500 transition-colors"
          >
            {Object.values(Subject).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Grade */}
        <div className="space-y-2 text-left">
          <label className="block text-sm font-medium text-slate-700">Khối lớp</label>
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="block w-full rounded-lg border-slate-200 bg-slate-50 border p-2.5 text-slate-700 focus:border-blue-500 focus:ring-blue-500 transition-colors"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Lớp {g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Integration Mode Selector */}
      <div className="space-y-2 text-left pt-2 border-t border-slate-100">
        <label className="block text-sm font-semibold text-slate-800 flex items-center">
          <Bot className="text-blue-600 mr-2" size={18} />
          Chế độ tích hợp năng lực:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIntegrationMode('BOTH')}
            className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
              integrationMode === 'BOTH'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={16} />
            <span>Tích hợp NLS & AI (Khuyên dùng)</span>
          </button>

          <button
            type="button"
            onClick={() => setIntegrationMode('NLS')}
            className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
              integrationMode === 'NLS'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Cpu size={16} />
            <span>Chỉ Năng lực số (TT 02/2025)</span>
          </button>

          <button
            type="button"
            onClick={() => setIntegrationMode('AI')}
            className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
              integrationMode === 'AI'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bot size={16} />
            <span>Chỉ Năng lực AI (QĐ 3439)</span>
          </button>
        </div>
      </div>

      {/* Inclusive Education Section */}
      <div className="space-y-3 text-left pt-3 border-t border-slate-100">
        <label className="flex items-center space-x-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDisabilitySupport}
            onChange={(e) => setIncludeDisabilitySupport(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <span className="text-sm font-semibold text-slate-800 flex items-center">
            <HeartHandshake className="text-emerald-600 mr-1.5" size={18} />
            Tích hợp Giáo dục Hòa nhập (Học sinh Khuyết tật - TT 03/2018/TT-BGDĐT)
          </span>
        </label>

        {includeDisabilitySupport && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-left animate-fadeIn">
            <label className="block text-xs font-semibold text-emerald-900">
              Dạng khuyết tật / Đối tượng học sinh cần hỗ trợ:
            </label>
            <select
              value={disabilityType}
              onChange={(e) => setDisabilityType(e.target.value as DisabilityType)}
              className="block w-full rounded-lg border-emerald-300 bg-white p-2 text-xs font-semibold text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500"
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
    </div>
  );
};

export default LessonForm;
