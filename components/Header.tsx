import React from 'react';
import { BookOpen, GraduationCap, Settings, Clock, Crown, ShieldAlert } from 'lucide-react';
import { LicenseInfo } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  onOpenLicense?: () => void;
  historyCount?: number;
  licenseInfo?: LicenseInfo;
}

const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenHistory,
  onOpenLicense,
  historyCount = 0,
  licenseInfo,
}) => {
  const getLicenseBadge = () => {
    if (!licenseInfo) return null;

    if (licenseInfo.isPro) {
      return (
        <button
          onClick={onOpenLicense}
          className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-md border border-amber-300 transition-all transform hover:scale-105"
          title="Bản Pro đã được kích hoạt"
        >
          <Crown size={16} className="text-slate-900" />
          <span>
            {licenseInfo.packageType === 'LIFETIME' && 'Pro Vĩnh Viễn'}
            {licenseInfo.packageType === '1_YEAR' && 'Pro 1 Năm'}
            {licenseInfo.packageType === '2_YEARS' && 'Pro 2 Năm'}
          </span>
        </button>
      );
    }

    if (licenseInfo.isTrialExpired) {
      return (
        <button
          onClick={onOpenLicense}
          className="flex items-center space-x-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md border border-red-400 transition-all animate-pulse"
          title="Hết hạn dùng thử - Bấm để kích hoạt Pro"
        >
          <ShieldAlert size={16} />
          <span>Hết Hạn 5 Ngày (Kích Hoạt Pro)</span>
        </button>
      );
    }

    return (
      <button
        onClick={onOpenLicense}
        className="flex items-center space-x-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm border border-blue-500/50"
        title="Bấm để nâng cấp Bản Pro"
      >
        <Crown size={16} className="text-yellow-300" />
        <span>Dùng thử: Còn {licenseInfo.trialDaysRemaining.toFixed(1)} ngày</span>
      </button>
    );
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-800 rounded-lg">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SOẠN GIÁO ÁN NĂNG LỰC SỐ & AI</h1>
            <p className="text-blue-100 text-sm">Tác giả: GV. NGUYỄN BỈNH KHÔI - ZALO: 0909 461 641 (TT 02 & QĐ 3439)</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {getLicenseBadge()}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm border border-blue-500/50"
              title="Xem lịch sử các bài dạy đã làm"
            >
              <Clock size={18} />
              <span>Lịch sử ({historyCount})</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors text-blue-100 hover:text-white"
            title="Cài đặt API Key"
          >
            <Settings size={20} />
          </button>
          <div className="hidden md:flex items-center space-x-2 text-blue-100 bg-blue-700 px-4 py-2 rounded-full text-sm">
            <BookOpen size={16} />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
