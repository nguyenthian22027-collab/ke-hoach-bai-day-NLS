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
          className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/20 border border-amber-300/60 transition-all transform hover:scale-[1.03] active:scale-95"
          title="Bản Pro đã được kích hoạt"
        >
          <Crown size={17} className="text-slate-950 fill-amber-300" />
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
          className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-red-500/30 border border-red-400/50 transition-all transform hover:scale-[1.03] active:scale-95 animate-pulse"
          title="Hết hạn dùng thử - Bấm để kích hoạt Pro"
        >
          <ShieldAlert size={17} />
          <span>Hết Hạn 5 Ngày (Kích Hoạt Pro)</span>
        </button>
      );
    }

    return (
      <button
        onClick={onOpenLicense}
        className="flex items-center space-x-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-sm transform hover:scale-[1.02] active:scale-95"
        title="Bấm để nâng cấp Bản Pro"
      >
        <Crown size={17} className="text-yellow-300 fill-yellow-300/30" />
        <span>Dùng thử: Còn <span className="font-bold text-yellow-300">{licenseInfo.trialDaysRemaining.toFixed(1)}</span> ngày</span>
      </button>
    );
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border-b border-indigo-500/20 relative overflow-hidden">
      {/* Background ambient glow effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 border border-blue-400/30 transform hover:rotate-3 transition-transform">
            <GraduationCap size={30} className="text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                SOẠN GIÁO ÁN NĂNG LỰC SỐ & AI
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wider">
                v2026 Pro
              </span>
            </div>
            <p className="text-indigo-200/80 text-xs sm:text-sm font-medium mt-0.5">
              Tác giả: <span className="text-indigo-100 font-semibold">GV. NGUYỄN BỈNH KHÔI</span> • ZALO: <span className="text-amber-300 font-bold">0909 461 641</span> (TT 02 & QĐ 3439)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {getLicenseBadge()}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-sm active:scale-95"
              title="Xem lịch sử các bài dạy đã làm"
            >
              <Clock size={16} className="text-indigo-300" />
              <span>Lịch sử ({historyCount})</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all text-indigo-200 hover:text-white border border-white/15 active:scale-95 shadow-sm"
            title="Cài đặt API Key & Model"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
