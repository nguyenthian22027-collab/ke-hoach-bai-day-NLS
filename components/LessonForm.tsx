import React, { useRef } from 'react';
import { Subject, IntegrationMode, DisabilityType, AIFrameworkVersion, TeachingEnvironment } from '../types';
import { Bot, Cpu, Sparkles, HeartHandshake, BookOpen, GraduationCap, CheckCircle, Info, Home, School, Upload, X } from 'lucide-react';

// Khai báo thư viện ngoại mammoth
declare const mammoth: any;

interface LessonFormProps {
  subject: Subject;
  setSubject: (val: Subject) => void;
  grade: number;
  setGrade: (val: number) => void;
  includeNLSAndAI: boolean;
  setIncludeNLSAndAI: (val: boolean) => void;
  integrationMode: IntegrationMode;
  setIntegrationMode: (val: IntegrationMode) => void;
  aiFrameworkVersion: AIFrameworkVersion;
  setAiFrameworkVersion: (val: AIFrameworkVersion) => void;
  includeDisabilitySupport: boolean;
  setIncludeDisabilitySupport: (val: boolean) => void;
  disabilityType?: DisabilityType;
  setDisabilityType?: (val: DisabilityType) => void;
  disabilityTypes?: DisabilityType[];
  setDisabilityTypes?: (val: DisabilityType[]) => void;
  disabilityCustomTarget?: string;
  setDisabilityCustomTarget?: (val: string) => void;
  includeEnglishIntegration: boolean;
  setIncludeEnglishIntegration: (val: boolean) => void;
  englishIntegrationLevel: import('../types').EnglishIntegrationLevel;
  setEnglishIntegrationLevel: (val: import('../types').EnglishIntegrationLevel) => void;
  englishCustomTarget?: string;
  setEnglishCustomTarget?: (val: string) => void;
  // Chế độ bổ sung: phát hiện tự động + cho phép bật/tắt thủ công
  hasExistingNLS: boolean;       // Kết quả tự động phát hiện từ ContentInput
  isSupplementMode: boolean;     // Trạng thái người dùng bật/tắt thủ công
  setIsSupplementMode: (val: boolean) => void;
  autoDetectedMsg?: string | null; // Thông báo tự nhận diện môn & lớp
  // Tích hợp STEM vào Hoạt động Vận dụng
  enableStem: boolean;
  setEnableStem: (val: boolean) => void;
  stemCustomTarget?: string;
  setStemCustomTarget?: (val: string) => void;
  // Bảng Tổng hợp Hoạt động NLS & AI cuối giáo án
  enableSummaryTable: boolean;
  setEnableSummaryTable: (val: boolean) => void;
  // Lồng ghép Giáo dục Quốc phòng & An ninh (TT 08/2024)
  includeQPAN: boolean;
  setIncludeQPAN: (val: boolean) => void;
  qpanCustomTarget?: string;
  setQpanCustomTarget?: (val: string) => void;
  // Môi trường thiết bị dạy học (Flipped Classroom)
  teachingEnvironment: TeachingEnvironment;
  setTeachingEnvironment: (val: TeachingEnvironment) => void;
  nextLessonFileName?: string;
  onNextLessonFileLoaded?: (text: string, fileName: string) => void;
  onNextLessonFileCleared?: () => void;
  nextLessonTitle: string;
  setNextLessonTitle: (val: string) => void;
  nextLessonSummary: string;
  setNextLessonSummary: (val: string) => void;
  // Phạm vi tích hợp hoạt động NLS & AI
  activityScope?: 'ALL' | 'CUSTOM';
  setActivityScope?: (val: 'ALL' | 'CUSTOM') => void;
  selectedMainActivities?: number[];
  setSelectedMainActivities?: (val: number[]) => void;
  selectedSubActivitiesHD2?: string[];
  setSelectedSubActivitiesHD2?: (val: string[]) => void;
  customSubActivityNote?: string;
  setCustomSubActivityNote?: (val: string) => void;
  // Nhập mã NLS & AI dán tay (Ưu tiên số 1 - Khóa chặn tập đóng)
  nlsCustomTarget?: string;
  setNlsCustomTarget?: (val: string) => void;
  aiCustomTarget?: string;
  setAiCustomTarget?: (val: string) => void;
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
  aiFrameworkVersion,
  setAiFrameworkVersion,
  includeDisabilitySupport,
  setIncludeDisabilitySupport,
  disabilityType,
  setDisabilityType,
  disabilityTypes,
  setDisabilityTypes,
  disabilityCustomTarget,
  setDisabilityCustomTarget,
  includeEnglishIntegration,
  setIncludeEnglishIntegration,
  englishIntegrationLevel,
  setEnglishIntegrationLevel,
  englishCustomTarget,
  setEnglishCustomTarget,
  hasExistingNLS,
  isSupplementMode,
  setIsSupplementMode,
  autoDetectedMsg,
  enableStem,
  setEnableStem,
  stemCustomTarget,
  setStemCustomTarget,
  enableSummaryTable,
  setEnableSummaryTable,
  includeQPAN,
  setIncludeQPAN,
  qpanCustomTarget,
  setQpanCustomTarget,
  teachingEnvironment,
  setTeachingEnvironment,
  nextLessonFileName,
  onNextLessonFileLoaded,
  onNextLessonFileCleared,
  nextLessonTitle,
  setNextLessonTitle,
  nextLessonSummary,
  setNextLessonSummary,
  activityScope = 'ALL',
  setActivityScope,
  selectedMainActivities = [1, 2, 3, 4],
  setSelectedMainActivities,
  selectedSubActivitiesHD2 = ['2.1', '2.2'],
  setSelectedSubActivitiesHD2,
  customSubActivityNote = '',
  setCustomSubActivityNote,
  nlsCustomTarget,
  setNlsCustomTarget,
  aiCustomTarget,
  setAiCustomTarget,
}) => {
  const nextLessonFileRef = useRef<HTMLInputElement>(null);

  const DISABILITY_OPTIONS: { id: DisabilityType; label: string; icon: string; desc: string }[] = [
    {
      id: 'INTELLECTUAL',
      label: 'Khuyết tật Trí tuệ / Khó khăn học tập',
      icon: '🧠',
      desc: 'Tiếp thu chậm, khó tập trung, cần đơn giản hóa & chia nhỏ nhiệm vụ',
    },
    {
      id: 'HEARING',
      label: 'Khuyết tật Thính giác (Nghe/Nói)',
      icon: '👂',
      desc: 'Khiếm thính, cần kênh hình ảnh trực quan, chữ viết bảng, ký hiệu',
    },
    {
      id: 'VISUAL',
      label: 'Khuyết tật Thị giác (Nhìn)',
      icon: '👁️',
      desc: 'Nhìn kém, khiếm thị, cần tài liệu chữ lớn, hình ảnh phóng to, đọc to',
    },
    {
      id: 'MOTOR',
      label: 'Khuyết tật Vận động',
      icon: '🦽',
      desc: 'Khó khăn vận động, cầm bút, cần vị trí ngồi thuận tiện, bạn hỗ trợ đồ dùng',
    },
    {
      id: 'GENERAL',
      label: 'Hòa nhập chung / Dạng tật khác',
      icon: '🤝',
      desc: 'Động viên, giao nhiệm vụ vừa sức, phân công Đôi bạn cùng tiến',
    },
  ];

  const currentDisabilityTypes = disabilityTypes || (disabilityType ? [disabilityType] : ['GENERAL']);

  const handleToggleDisabilityType = (typeId: DisabilityType) => {
    if (!setDisabilityTypes) return;
    let updated: DisabilityType[];
    if (typeId === 'GENERAL') {
      if (currentDisabilityTypes.includes('GENERAL') && currentDisabilityTypes.length > 1) {
        updated = currentDisabilityTypes.filter(t => t !== 'GENERAL');
      } else if (currentDisabilityTypes.includes('GENERAL')) {
        updated = [];
      } else {
        updated = ['GENERAL'];
      }
    } else {
      const withoutGeneral = currentDisabilityTypes.filter(t => t !== 'GENERAL');
      if (withoutGeneral.includes(typeId)) {
        updated = withoutGeneral.filter(t => t !== typeId);
      } else {
        updated = [...withoutGeneral, typeId];
      }
    }

    if (updated.length === 0) {
      updated = ['GENERAL'];
    }

    setDisabilityTypes(updated);
    if (setDisabilityType) {
      setDisabilityType(updated[0] || 'GENERAL');
    }
  };

  const handleNextLessonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (typeof mammoth !== 'undefined' && (file.name.endsWith('.docx') || file.type.includes('word'))) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onNextLessonFileLoaded?.(result.value, file.name);
      } else {
        const text = await file.text();
        onNextLessonFileLoaded?.(text, file.name);
      }
    } catch (err) {
      console.error("Lỗi đọc file bài tiếp theo:", err);
      try {
        const text = await file.text();
        onNextLessonFileLoaded?.(text, file.name);
      } catch {
        alert("Không thể đọc được nội dung từ file này.");
      }
    }
    if (e.target) e.target.value = '';
  };

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

      {/* Vùng chọn Môn học & Khối lớp — Nổi bật & Tự động nhận diện */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50/80 border-2 border-indigo-200/90 shadow-sm space-y-3.5">
        {/* Banner thông báo tự động nhận diện nếu có */}
        {autoDetectedMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold animate-pulse">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{autoDetectedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Subject */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                <BookOpen size={15} className="text-indigo-600" />
                <span>Môn học</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 border border-indigo-200/60">
                BẮT BUỘC
              </span>
            </div>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="block w-full rounded-xl border-2 border-indigo-200 bg-white p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all cursor-pointer shadow-sm"
              >
                {Object.values(Subject).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                <GraduationCap size={16} className="text-indigo-600" />
                <span>Khối lớp</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 border border-indigo-200/60">
                BẮT BUỘC
              </span>
            </div>
            <div className="relative">
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="block w-full rounded-xl border-2 border-indigo-200 bg-white p-3 text-sm font-bold text-slate-800 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 transition-all cursor-pointer shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Lớp {g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hướng dẫn lưu ý */}
        <div className="flex items-start gap-1.5 pt-1 text-[11px] sm:text-xs text-indigo-900/80 font-medium">
          <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <span>
            <strong>Lưu ý quan trọng:</strong> Môn học và Khối lớp giúp AI định hướng đúng công cụ giảng dạy (GeoGebra, PhET...) và phân cấp mã Năng lực số / AI chính xác theo độ tuổi học sinh.
          </span>
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
          <div className="p-4 bg-slate-50/90 border border-indigo-100 rounded-2xl space-y-3.5 animate-fadeIn shadow-inner">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Chọn chế độ tích hợp chi tiết:</label>
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

            {/* Chọn phiên bản Khung Năng lực AI — chỉ hiện khi AI được bật */}
            {(integrationMode === 'AI' || integrationMode === 'BOTH') && (
              <div className="flex items-center gap-3 px-1 py-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Khung AI:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="aiFramework"
                    value="QD2422"
                    checked={aiFrameworkVersion === 'QD2422'}
                    onChange={() => setAiFrameworkVersion('QD2422')}
                    className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={`text-xs font-bold ${aiFrameworkVersion === 'QD2422' ? 'text-purple-700' : 'text-slate-500'}`}>
                    QĐ 2422 <span className="font-normal text-[10px]">(chính thức 2026–2027)</span>
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="aiFramework"
                    value="QD3439"
                    checked={aiFrameworkVersion === 'QD3439'}
                    onChange={() => setAiFrameworkVersion('QD3439')}
                    className="w-3.5 h-3.5 text-slate-400 focus:ring-slate-400"
                  />
                  <span className={`text-xs font-bold ${aiFrameworkVersion === 'QD3439' ? 'text-slate-700' : 'text-slate-400'}`}>
                    QĐ 3439 <span className="font-normal text-[10px]">(thí điểm)</span>
                  </span>
                </label>
              </div>
            )}

            {/* PHẠM VI TÍCH HỢP HOẠT ĐỘNG: Toàn bài vs Tùy chọn hoạt động trọng tâm */}
            <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <span className="text-base">🎯</span>
                  <span>Phạm vi tích hợp NLS & AI vào các hoạt động:</span>
                </label>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  activityScope === 'ALL'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {activityScope === 'ALL' ? 'Toàn bộ bài học' : 'Theo hoạt động chọn'}
                </span>
              </div>

              {/* 2 chế độ: Tất cả (Mặc định) vs Tùy chọn trọng tâm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActivityScope?.('ALL')}
                  className={`p-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    activityScope === 'ALL'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>🌐 Tất cả các hoạt động</span>
                  <span className="text-[10px] opacity-80 font-normal">(Trải đều HĐ 1 → 4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityScope?.('CUSTOM')}
                  className={`p-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    activityScope === 'CUSTOM'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-purple-300/40'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>🎯 Tùy chọn hoạt động trọng tâm</span>
                  <span className="text-[10px] opacity-80 font-normal">(Tránh quá tải)</span>
                </button>
              </div>

              {/* Khi chọn CUSTOM: hiển thị 4 checkbox cho 4 hoạt động */}
              {activityScope === 'CUSTOM' && (
                <div className="pt-2.5 border-t border-indigo-100/70 space-y-3 animate-fadeIn">
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    💡 <em>Chọn các hoạt động cần tích hợp NLS/AI. Các hoạt động không chọn sẽ được <strong>giữ nguyên 100% nguyên bản</strong> (không chèn NLS/AI):</em>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 1, label: 'Hoạt động 1: Mở đầu / Khởi động' },
                      { id: 2, label: 'Hoạt động 2: Hình thành kiến thức mới (Khám phá)' },
                      { id: 3, label: 'Hoạt động 3: Luyện tập' },
                      { id: 4, label: 'Hoạt động 4: Vận dụng' },
                    ].map((act) => {
                      const isChecked = selectedMainActivities.includes(act.id);
                      return (
                        <label
                          key={act.id}
                          className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 shadow-xs'
                              : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (!setSelectedMainActivities) return;
                              if (e.target.checked) {
                                setSelectedMainActivities([...selectedMainActivities, act.id].sort((a, b) => a - b));
                              } else {
                                const remaining = selectedMainActivities.filter(id => id !== act.id);
                                setSelectedMainActivities(remaining.length > 0 ? remaining : [act.id]);
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span>{act.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* ĐẶC BIỆT: Phân nhánh nhỏ cho Hoạt động 2 (Hình thành kiến thức) */}
                  {selectedMainActivities.includes(2) && (
                    <div className="p-3 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 rounded-xl border border-indigo-200 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📌</span> Chỉ định nhánh nhỏ trong Hoạt động 2 (Hình thành kiến thức):
                        </span>
                        <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                          Tích hợp có chọn lọc
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: '2.1', label: 'HĐ 2.1 (Mục 1)' },
                          { id: '2.2', label: 'HĐ 2.2 (Mục 2)' },
                          { id: '2.3', label: 'HĐ 2.3 (Mục 3)' },
                          { id: '2.4', label: 'HĐ 2.4 (Mục 4)' },
                        ].map((sub) => {
                          const isSubChecked = selectedSubActivitiesHD2.includes(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-center space-x-1.5 p-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                                isSubChecked
                                  ? 'bg-purple-100/90 border-purple-300 text-purple-950 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSubChecked}
                                onChange={(e) => {
                                  if (!setSelectedSubActivitiesHD2) return;
                                  if (e.target.checked) {
                                    setSelectedSubActivitiesHD2([...selectedSubActivitiesHD2, sub.id]);
                                  } else {
                                    const remaining = selectedSubActivitiesHD2.filter(id => id !== sub.id);
                                    setSelectedSubActivitiesHD2(remaining.length > 0 ? remaining : [sub.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                              />
                              <span>{sub.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Ô nhập tuỳ chọn tên mục cụ thể */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={customSubActivityNote}
                          onChange={(e) => setCustomSubActivityNote?.(e.target.value)}
                          placeholder="Hoặc nhập tên mục/nhiệm vụ cụ thể (VD: Mục 1. Khái niệm phân số, HĐ 2.1...)"
                          className="w-full text-xs p-2 rounded-lg border border-indigo-200 bg-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nhập mã & YCCĐ NLS / AI chỉ định (Tùy chọn - Khóa chặn danh mục mã & Tái sử dụng) */}
            <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Mã & YCCĐ NLS / AI chỉ định (Tùy chọn - Khóa chặn danh mục mã):</span>
                </label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-200">
                  Ưu tiên số 1 - Khóa cứng
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💡 <em>Dán mã NLS hoặc mã AI vào đây nếu Thầy/Cô chỉ muốn dùng đúng các mã này. AI sẽ <strong>khóa cứng 100%</strong> (không sinh mã lạ trong Mục tiêu), và sẽ <strong>tái sử dụng mã</strong> qua các hoạt động trong bài dạy nếu số hoạt động nhiều hơn số mã:</em>
              </p>

              {(integrationMode === 'BOTH' || integrationMode === 'NLS') && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                    <Cpu size={13} className="text-blue-600" />
                    <span>Mã / YCCĐ Năng lực số (NLS) chỉ định:</span>
                  </span>
                  <textarea
                    value={nlsCustomTarget || ''}
                    onChange={(e) => setNlsCustomTarget && setNlsCustomTarget(e.target.value)}
                    placeholder="VD: 1.1.TC1a, 3.1.TC1a, 5.3.TC1a hoặc 1.1b... (Nếu để trống, AI tự sinh theo Thông tư 02 hoặc lấy từ cột NLS trong PPCT)"
                    rows={2}
                    className="w-full rounded-xl border border-blue-200 bg-blue-50/20 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 resize-none shadow-2xs transition-all font-medium"
                  />
                </div>
              )}

              {(integrationMode === 'BOTH' || integrationMode === 'AI') && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <Bot size={13} className="text-purple-600" />
                    <span>Mã / YCCĐ Năng lực AI chỉ định:</span>
                  </span>
                  <textarea
                    value={aiCustomTarget || ''}
                    onChange={(e) => setAiCustomTarget && setAiCustomTarget(e.target.value)}
                    placeholder="VD: [AI: 6.C2.1] Phân biệt ứng dụng có AI... (Nếu để trống, AI tự sinh theo Khung AI hoặc lấy từ cột AI trong PPCT)"
                    rows={2}
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/20 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 resize-none shadow-2xs transition-all font-medium"
                  />
                </div>
              )}
            </div>

            {/* Nút thủ công & Tự động: Chế độ Bổ sung (File đã có NLS sẵn) - LUÔN LUÔN HIỂN THỊ */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isSupplementMode 
                ? 'bg-blue-50/95 border-blue-300 ring-2 ring-blue-400/20 shadow-sm' 
                : 'bg-white/80 border-slate-200 hover:border-slate-300'
            }`}>
              <label className="flex items-start space-x-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={isSupplementMode}
                  onChange={(e) => setIsSupplementMode(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 focus:ring-offset-0 transition-transform group-hover:scale-105 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                      <span>🔄</span>
                      Bài soạn ĐÃ CÓ sẵn NLS (Chế độ Bổ sung thêm AI / HSKT / Tiếng Anh)
                    </span>
                    {hasExistingNLS && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                        ⚡ Đã tự phát hiện NLS
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                    {isSupplementMode ? (
                      <span className="text-blue-800 font-medium">
                        ✔ <strong>Đang kích hoạt Chế độ Bổ sung:</strong> Giữ nguyên 100% NLS cũ trong bài soạn gốc, AI chỉ chèn thêm các năng lực được chọn (Năng lực AI, HSKT, Tiếng Anh) vào đúng các bước mà không tái tạo lại NLS.
                      </span>
                    ) : (
                      <span>
                        Tích chọn mục này nếu bài soạn của bạn đã có NLS từ trước và bạn chỉ muốn bổ sung thêm AI, HSKT, hoặc Tiếng Anh vào đúng vị trí.
                      </span>
                    )}
                  </p>
                </div>
              </label>
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
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3 text-left animate-fadeIn shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950">
                Đối tượng học sinh khuyết tật trong lớp (Tích chọn 1 hoặc nhiều):
              </label>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                Đã chọn: {currentDisabilityTypes.includes('GENERAL') && currentDisabilityTypes.length === 1 ? 'Hòa nhập chung' : `${currentDisabilityTypes.length} đối tượng`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DISABILITY_OPTIONS.map((opt) => {
                const isSelected = currentDisabilityTypes.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleDisabilityType(opt.id)}
                    className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-400/30'
                        : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="ml-2.5">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-emerald-800 italic pt-1 leading-relaxed">
              💡 <strong>Gợi ý:</strong> Thầy/Cô có thể tích chọn cùng lúc 2 hoặc 3 dạng tật (ví dụ: vừa có HS khiếm thính vừa có HS khó khăn học tập). AI sẽ tự động điều chỉnh mục tiêu và phối hợp biện pháp hỗ trợ đồng thời trong từng bước học.
            </p>

            {/* Nhập hoặc trích xuất YCCĐ đối với HSKT */}
            <div className="pt-3 border-t border-emerald-200/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Yêu cầu cần đạt đối với HSKT của bài học (Tùy chọn):</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ưu tiên số 1
                </span>
              </div>
              <textarea
                value={disabilityCustomTarget || ''}
                onChange={(e) => setDisabilityCustomTarget && setDisabilityCustomTarget(e.target.value)}
                placeholder="Dán YCCĐ đối với HSKT vào đây nếu có... (Nếu để trống và Thầy/Cô có tải file PPCT, AI sẽ tự động tìm trích xuất từ cột HSKT trong bảng PPCT)"
                rows={2}
                className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 resize-none shadow-2xs transition-all"
              />
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                📌 <em>Ghi chú:</em> Nếu Thầy/Cô nhập vào ô này hoặc có trong bảng PPCT tải lên, AI sẽ đưa nguyên văn vào phần Mục tiêu HSKT và thiết kế các hoạt động hỗ trợ bám sát chính xác yêu cầu này.
              </p>
            </div>
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
            className="w-5 h-5 text-amber-600 rounded-lg border-slate-300 focus:ring-amber-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-amber-700 transition-colors">
            <span className="text-xl mr-2">🇬🇧</span>
            Tích hợp Tiếng Anh (Ngôn ngữ thứ 2) <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">QĐ 2371/2025</span>
          </span>
        </label>

        {includeEnglishIntegration && (
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5 text-left animate-fadeIn shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
              Mức độ tích hợp Tiếng Anh (CLIL):
            </label>
            <select
              value={englishIntegrationLevel}
              onChange={(e) => setEnglishIntegrationLevel(e.target.value as import('../types').EnglishIntegrationLevel)}
              className="block w-full rounded-xl border-amber-300 bg-white p-3 text-xs sm:text-sm font-bold text-amber-950 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer shadow-sm"
            >
              <option value="BASIC">🔸 Cấp độ 1 (Cơ bản): Tích hợp từ vựng song ngữ (Key Vocabulary)</option>
              <option value="INTER">🔶 Cấp độ 2 (Trung cấp): Tích hợp Câu lệnh lớp học (Classroom Instructions)</option>
              <option value="CLIL">🌐 Cấp độ 3 (Nâng cao): Soạn bài theo chuẩn CLIL toàn diện</option>
            </select>

            {/* Nhập hoặc trích xuất Thuật ngữ/YCCĐ Tiếng Anh từ PPCT */}
            <div className="pt-3 border-t border-amber-200/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Yêu cầu cần đạt / Thuật ngữ Tiếng Anh của bài học (Tùy chọn):</span>
                </label>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  Ưu tiên số 1
                </span>
              </div>
              <textarea
                value={englishCustomTarget || ''}
                onChange={(e) => setEnglishCustomTarget && setEnglishCustomTarget(e.target.value)}
                placeholder="Dán YCCĐ hoặc danh sách thuật ngữ tiếng Anh vào đây... (Nếu để trống và có tải PPCT, AI sẽ tự trích từ cột Tiếng Anh trong bảng PPCT)"
                rows={2}
                className="w-full rounded-xl border border-amber-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 resize-none shadow-sm transition-all"
              />
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                📌 <em>Ghi chú:</em> Nếu Thầy/Cô nhập thuật ngữ/YCCĐ vào đây hoặc có trong cột Tiếng Anh của PPCT tải lên, AI sẽ dùng đúng nội dung đó. Nếu để trống, AI tự gợi ý theo cấp độ đã chọn.
              </p>
            </div>
          </div>
        )}
      </div>


      {/* STEM Integration Section */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={enableStem}
            onChange={(e) => setEnableStem(e.target.checked)}
            className="w-5 h-5 text-teal-600 rounded-lg border-slate-300 focus:ring-teal-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-teal-700 transition-colors">
            <span className="text-xl mr-2">🔬</span>
            Tích hợp Giáo dục STEM{' '}
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Mô hình A — CV 5512
            </span>
          </span>
        </label>

        {enableStem && (
          <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-2 text-left animate-fadeIn shadow-sm">
            <p className="text-xs font-bold text-teal-900">
              ✅ <strong>Đang BẬT Tích hợp STEM:</strong>
            </p>
            <p className="text-[11px] sm:text-xs text-teal-800 leading-relaxed">
              AI sẽ <strong>nâng cấp Hoạt động Vận dụng</strong> thành dự án STEM mini gắn thực tiễn:
              giao nhiệm vụ chế tạo/thiết kế/quan trắc thực tế, có sản phẩm cụ thể và rubric đánh giá 3 tiêu chí.
              Toàn bộ cấu trúc 4 hoạt động theo CV 5512 được giữ nguyên 100%.
            </p>

            {/* YCCĐ STEM nhập tay từ phụ lục đầu năm */}
            <div className="pt-3 border-t border-teal-200/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Yêu cầu cần đạt STEM của bài học (Tùy chọn):</span>
                </label>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/90 px-2 py-0.5 rounded-full border border-teal-200">
                  Ưu tiên số 1
                </span>
              </div>
              <textarea
                value={stemCustomTarget || ''}
                onChange={(e) => setStemCustomTarget && setStemCustomTarget(e.target.value)}
                placeholder="Dán YCCĐ STEM từ phụ lục đầu năm của Thầy/Cô vào đây... (Nếu để trống, AI tự sinh YCCĐ STEM phù hợp với bài)"
                rows={2}
                className="w-full rounded-xl border border-teal-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 resize-none shadow-sm transition-all"
              />
              <p className="text-[11px] text-teal-800/90 leading-relaxed">
                📌 <em>Ghi chú:</em> AI sẽ đưa nguyên văn YCCĐ này vào mục Mục tiêu STEM và bám sát khi thiết kế Hoạt động Vận dụng.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ====== LỒNG GHÉP GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (QPAN) ====== */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={includeQPAN}
            onChange={(e) => setIncludeQPAN(e.target.checked)}
            className="w-5 h-5 text-rose-600 rounded-lg border-slate-300 focus:ring-rose-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-rose-700 transition-colors">
            <span className="text-xl mr-2">🎖️</span>
            Lồng ghép Giáo dục Quốc phòng & An ninh{' '}
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              TT 08/2024
            </span>
          </span>
        </label>

        {includeQPAN && (
          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2 text-left animate-fadeIn shadow-sm">
            <p className="text-xs font-bold text-rose-900">
              ✅ <strong>Đang BẬT Lồng ghép QPAN (Thông tư 08/2024/TT-BGDĐT):</strong>
            </p>
            <p className="text-[11px] sm:text-xs text-rose-800 leading-relaxed">
              AI sẽ tự động lồng ghép nội dung bồi dưỡng lòng yêu nước, tự hào dân tộc, chủ quyền biển đảo,
              an ninh biên giới, bảo vệ thông tin cá nhân trên không gian mạng và trật tự ATXH theo đúng khối lớp ({grade >= 1 && grade <= 5 ? `Tiểu học - Lớp ${grade}` : `THCS - Lớp ${grade}`}) vào 1 dòng Mục tiêu và 1-2 điểm phù hợp trong hoạt động học.
            </p>
            <p className="text-[10px] text-rose-700 italic">
              📌 Nội dung lồng ghép ngắn gọn, truyền cảm, tô màu đỏ cờ chuẩn mực trong giáo án.
            </p>

            {/* Nội dung QPAN nhập tay từ phụ lục đầu năm */}
            <div className="pt-3 border-t border-rose-200/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Nội dung / YCCĐ lồng ghép QPAN của bài học (Tùy chọn):</span>
                </label>
                <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-200">
                  Ưu tiên số 1
                </span>
              </div>
              <textarea
                value={qpanCustomTarget || ''}
                onChange={(e) => setQpanCustomTarget && setQpanCustomTarget(e.target.value)}
                placeholder="Dán nội dung QPAN từ phụ lục đầu năm của Thầy/Cô vào đây... (Nếu để trống, AI tự sinh nội dung phù hợp theo TT 08/2024 và khối lớp)"
                rows={2}
                className="w-full rounded-xl border border-rose-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20 resize-none shadow-sm transition-all"
              />
              <p className="text-[11px] text-rose-800/90 leading-relaxed">
                📌 <em>Ghi chú:</em> AI sẽ đưa nguyên văn nội dung này vào phần Phẩm chất (Mục tiêu) và lồng ghép đúng vào hoạt động dạy học của giáo án.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ====== BẢNG TỔNG HỢP HOẠT ĐỘNG NLS & AI ====== */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <label className="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={enableSummaryTable}
            onChange={(e) => setEnableSummaryTable(e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 focus:ring-offset-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center group-hover:text-indigo-700 transition-colors">
            <span className="text-xl mr-2">📊</span>
            Bảng Tổng hợp Hoạt động NLS & AI{' '}
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
              Tuỳ chọn
            </span>
          </span>
        </label>

        {enableSummaryTable && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2 text-left animate-fadeIn shadow-sm">
            <p className="text-xs font-bold text-indigo-900">
              ✅ <strong>Đang BẬT Bảng Tổng hợp NLS & AI:</strong>
            </p>
            <p className="text-[11px] sm:text-xs text-indigo-800 leading-relaxed">
              AI sẽ tự <strong>tổng hợp lại chính xác</strong> tất cả mã NLS & AI đã tích hợp vào từng hoạt động
              thành <strong>bảng 4 cột</strong> (Hoạt động | NLS/AI tích hợp | Công cụ | Sản phẩm/minh chứng)
              đặt ở <strong>cuối giáo án</strong>. Bảng xuất ra file Word dạng kẻ ô chuẩn.
            </p>
            <p className="text-[10px] text-indigo-700 italic">
              📌 Lưu ý: Bảng chỉ tổng hợp đúng các mã đã có trong giáo án — không thêm mã mới.
            </p>
          </div>
        )}
      </div>

      {/* ====== PHẦN MÔI TRƯỜNG THIẾT BỊ DẠY HỌC (FLIPPED CLASSROOM) ====== */}
      <div className="space-y-3.5 text-left pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏫</span>
          <span className="text-sm sm:text-base font-bold text-slate-800">
            Môi trường thiết bị dạy học
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Lựa chọn 1: Phòng máy/Thiết bị cá nhân (Luồng cũ) */}
          <button
            type="button"
            onClick={() => setTeachingEnvironment('IN_CLASS_DEVICES')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              teachingEnvironment === 'IN_CLASS_DEVICES'
                ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-400 shadow-md ring-2 ring-indigo-300/40'
                : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <School size={16} className={teachingEnvironment === 'IN_CLASS_DEVICES' ? 'text-indigo-600' : 'text-slate-500'} />
              <span className={`text-xs font-bold ${teachingEnvironment === 'IN_CLASS_DEVICES' ? 'text-indigo-700' : 'text-slate-700'}`}>
                🏫 Phòng máy / Thiết bị cá nhân
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">HS thao tác trực tiếp trên lớp (Luồng mặc định — giữ 100% tính năng cũ)</p>
          </button>

          {/* Lựa chọn 2: Lớp học đảo ngược (Mới) */}
          <button
            type="button"
            onClick={() => setTeachingEnvironment('FLIPPED_CLASSROOM')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              teachingEnvironment === 'FLIPPED_CLASSROOM'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400 shadow-md ring-2 ring-amber-300/40'
                : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Home size={16} className={teachingEnvironment === 'FLIPPED_CLASSROOM' ? 'text-amber-600' : 'text-slate-500'} />
              <span className={`text-xs font-bold ${teachingEnvironment === 'FLIPPED_CLASSROOM' ? 'text-amber-700' : 'text-slate-700'}`}>
                🏡 Lớp học đảo ngược <span className="text-[9px] font-medium ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Khuyên dùng</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">HS chuẩn bị ở nhà, báo cáo trên lớp qua máy chiếu GV (Phù hợp 90% trường học VN)</p>
          </button>
        </div>

        {/* Khu vực Dặn dò thông minh — chỉ hiện khi chọn Lớp học đảo ngược */}
        {teachingEnvironment === 'FLIPPED_CLASSROOM' && (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3 animate-fadeIn shadow-sm">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📌</span> Dặn dò thông minh cho bài học tiếp theo
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Cung cấp thông tin bài sau để AI viết câu Dặn dò chính xác, kết nối năng lực số/AI sang tiết học tiếp theo.
            </p>

            {/* Cách 1: Tải file giáo án bài tiếp theo */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-amber-900">📎 Cách 1: Tải file giáo án bài tiếp theo (Chính xác nhất)</p>
              <input
                ref={nextLessonFileRef}
                type="file"
                accept=".docx,.doc,.txt"
                className="hidden"
                onChange={handleNextLessonFile}
              />
              {nextLessonFileName ? (
                <div className="flex items-center gap-2 p-2 bg-amber-100 border border-amber-300 rounded-xl">
                  <Upload size={14} className="text-amber-700 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-800 truncate flex-1">{nextLessonFileName}</span>
                  <button
                    type="button"
                    onClick={() => onNextLessonFileCleared?.()}
                    className="p-0.5 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    <X size={12} className="text-amber-700" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => nextLessonFileRef.current?.click()}
                  className="w-full p-2.5 border-2 border-dashed border-amber-300 rounded-xl text-[11px] font-bold text-amber-700 hover:bg-amber-100/60 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={14} />
                  Chọn file .docx / .txt giáo án bài tiếp theo
                </button>
              )}
            </div>

            {/* Cách 2: Nhập thủ công (hiện khi chưa có file) */}
            {!nextLessonFileName && (
              <div className="space-y-2 border-t border-amber-200 pt-2.5">
                <p className="text-[11px] font-bold text-amber-900">✍️ Cách 2: Nhập nhanh thông tin bài tiếp theo</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nextLessonTitle}
                    onChange={(e) => setNextLessonTitle(e.target.value)}
                    placeholder="Tên bài học tiếp theo (VD: Bài 8: Quang hợp ở thực vật)"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                  />
                  <textarea
                    value={nextLessonSummary}
                    onChange={(e) => setNextLessonSummary(e.target.value)}
                    placeholder="Tóm tắt nội dung chính bài sau (1–2 câu, VD: Cây xanh tổng hợp chất hữu cơ từ CO₂ và ánh sáng mặt trời...)"
                    rows={2}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 resize-none"
                  />
                </div>
              </div>
            )}

            <p className="text-[10px] text-amber-700 italic">
              💡 Nếu bỏ trống cả hai: App vẫn viết Dặn dò theo định hướng chung của môn học.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonForm;
