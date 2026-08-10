import React from 'react';
import { BookOpen, GraduationCap, Settings, Clock } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenHistory, historyCount = 0 }) => {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-800 rounded-lg">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SOẠN GIÁO ÁN NĂNG LỰC SỐ</h1>
            <p className="text-blue-100 text-sm">Hỗ trợ tích hợp Năng lực số toàn cấp theo Thông tư 02 & QĐ 3439</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
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
