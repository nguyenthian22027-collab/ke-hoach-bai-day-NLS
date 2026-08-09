import React, { useState } from 'react';
import { X, Clock, Trash2, ChevronRight, Search, FileText } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onClearAllHistory: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyList,
  onSelectHistory,
  onDeleteHistory,
  onClearAllHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredList = historyList.filter(item =>
    item.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.originalFileName && item.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-blue-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2 bg-blue-800 rounded-lg">
              <Clock className="text-blue-300" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Lịch sử giáo án đã xử lý</h2>
              <p className="text-blue-200 text-xs mt-0.5">
                Đã lưu {historyList.length} bài dạy gần nhất trong trình duyệt của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Actions Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên bài, môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {historyList.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử giáo án đã lưu?")) {
                  onClearAllHistory();
                }
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors self-end sm:self-auto"
            >
              <Trash2 size={14} />
              <span>Xóa tất cả lịch sử</span>
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-grow text-left">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-slate-400">
                <FileText size={32} />
              </div>
              <p className="font-medium text-sm">
                {searchTerm ? "Không tìm thấy giáo án nào phù hợp." : "Chưa có giáo án nào được lưu trong lịch sử."}
              </p>
              <p className="text-xs text-slate-400">
                Khi bạn phân tích giáo án mới, hệ thống sẽ tự động lưu lại tại đây.
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 text-left flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-full">
                      {item.subject}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-full">
                      Lớp {item.grade}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center ml-auto sm:ml-0">
                      <Clock size={12} className="mr-1" />
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors leading-snug">
                    {item.lessonTitle}
                  </h4>

                  {item.originalFileName && (
                    <p className="text-xs text-slate-500 font-mono">
                      File gốc: {item.originalFileName}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
                  >
                    <span>Xem lại</span>
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => onDeleteHistory(item.id)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Xóa bài này"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
