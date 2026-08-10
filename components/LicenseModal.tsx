import React, { useState } from 'react';
import { LicenseInfo, ProPackage } from '../types';
import { activateProKey, generateProKey } from '../services/licenseService';
import { Key, Shield, Copy, Check, Crown, Lock, Clock, Sparkles, AlertTriangle } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseInfo: LicenseInfo;
  onLicenseUpdated: () => void;
}

const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  licenseInfo,
  onLicenseUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN'>('USER');
  
  // User activation state
  const [inputKey, setInputKey] = useState('');
  const [activationMsg, setActivationMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedDevId, setCopiedDevId] = useState(false);

  // Admin generator state
  const [adminPin, setAdminPin] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminTargetDevId, setAdminTargetDevId] = useState('');
  const [adminSelectedPackage, setAdminSelectedPackage] = useState<ProPackage>('1_YEAR');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedGenKey, setCopiedGenKey] = useState(false);

  if (!isOpen) return null;

  // Xử lý sao chép Mã Thiết Bị
  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(licenseInfo.deviceId);
    setCopiedDevId(true);
    setTimeout(() => setCopiedDevId(false), 2000);
  };

  // Xử lý Kích hoạt Pro
  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationMsg(null);

    const res = activateProKey(inputKey, licenseInfo.deviceId);
    if (res.success) {
      setActivationMsg({ text: res.message, isError: false });
      onLicenseUpdated();
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setActivationMsg({ text: res.message, isError: true });
    }
  };

  // Xử lý đăng nhập Admin Password
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === 'Thien12345@') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Mã PIN Admin không đúng!');
    }
  };

  // Xử lý Admin tạo Mã Pro
  const handleAdminGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTargetDevId.trim()) {
      alert('Vui lòng nhập Mã Thiết Bị của người dùng!');
      return;
    }

    const key = generateProKey(adminTargetDevId, adminSelectedPackage);
    setGeneratedKey(key);
  };

  const handleCopyGeneratedKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopiedGenKey(true);
    setTimeout(() => setCopiedGenKey(false), 2000);
  };

  // Format ngày hết hạn
  const formatExpiryDate = (ts?: number) => {
    if (!ts) return 'Vĩnh viễn';
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 text-left relative">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Crown className="text-yellow-300" size={26} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Bản Quyền & Kích Hoạt Pro</h3>
              <p className="text-blue-100 text-xs mt-0.5">Soạn Giáo Án Năng Lực Số & AI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            ✕
          </button>

          {/* Navigation Tabs */}
          <div className="flex mt-5 bg-black/20 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('USER')}
              className={`flex-1 py-2 rounded-lg text-center transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'USER' ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:text-white'
              }`}
            >
              <Key size={14} />
              <span>Người Dùng Kích Hoạt</span>
            </button>

            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`flex-1 py-2 rounded-lg text-center transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'ADMIN' ? 'bg-white text-purple-900 shadow-md font-bold' : 'text-purple-200 hover:text-white'
              }`}
            >
              <Shield size={14} />
              <span>Bộ Sinh Mã Admin</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-left space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: NGƯỜI DÙNG KÍCH HOẠT */}
          {activeTab === 'USER' && (
            <div className="space-y-5">
              
              {/* Trang thái bản quyền hiện tại */}
              <div className="p-4 rounded-xl border bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Trạng thái hiện tại:</span>
                  <span className="font-semibold text-slate-700">Mã máy: {licenseInfo.deviceId}</span>
                </div>

                {licenseInfo.isPro ? (
                  <div className="flex items-center space-x-2 text-amber-700 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <Crown className="text-amber-500" size={20} />
                    <span>
                      {licenseInfo.packageType === 'LIFETIME' && '👑 Đã kích hoạt Bản Pro Vĩnh Viễn!'}
                      {licenseInfo.packageType === '1_YEAR' && `🥇 Đã kích hoạt Bản Pro 1 Năm (Đến ${formatExpiryDate(licenseInfo.proExpiryDate)})`}
                      {licenseInfo.packageType === '2_YEARS' && `🥈 Đã kích hoạt Bản Pro 2 Năm (Đến ${formatExpiryDate(licenseInfo.proExpiryDate)})`}
                    </span>
                  </div>
                ) : licenseInfo.isTrialExpired ? (
                  <div className="flex items-center space-x-2 text-red-700 font-bold bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertTriangle className="text-red-500" size={20} />
                    <span>⚠️ Thời gian dùng thử 5 ngày đã hết. Vui lòng kích hoạt Pro!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-blue-700 font-semibold bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Clock className="text-blue-500" size={20} />
                    <span>⏳ Dùng thử 5 Ngày: Còn {licenseInfo.trialDaysRemaining.toFixed(1)} ngày nữa.</span>
                  </div>
                )}
              </div>

              {/* Bước 1: Sao chép Mã Thiết Bị */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  BƯỚC 1: Sao chép Mã Thiết Bị gửi cho Admin
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={licenseInfo.deviceId}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-800 text-center tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    {copiedDevId ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedDevId ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Nhấn nút Sao chép và gửi chuỗi mã trên cho Admin để nhận Mã kích hoạt Pro tương ứng.
                </p>
              </div>

              {/* Bước 2: Nhập Mã Kích Hoạt */}
              <form onSubmit={handleActivate} className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  BƯỚC 2: Nhập Mã Kích Hoạt Pro nhận được từ Admin
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: PRO-1Y-XXXXYYYY-ZZZZ"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all tracking-wider text-center"
                />

                {activationMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      activationMsg.isError
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {activationMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles size={18} />
                  <span>KÍCH HOẠT BẢN PRO NGAY</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: BỘ SINH MÃ ADMIN */}
          {activeTab === 'ADMIN' && (
            <div className="space-y-4">
              {!isAdminAuthenticated ? (
                <form onSubmit={handleAdminLogin} className="space-y-4 py-4 text-center">
                  <div className="inline-p-3 bg-purple-100 text-purple-700 rounded-full mb-2">
                    <Lock size={32} className="mx-auto" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Xác thực Quyền Admin Sinh Mã Pro</h4>
                  <p className="text-xs text-slate-500">Vui lòng nhập Mật khẩu Admin để truy cập công cụ sinh mã.</p>
                  
                  <input
                    type="password"
                    placeholder="Nhập Mật khẩu Admin..."
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3 text-center text-sm font-bold focus:ring-2 focus:ring-purple-200 outline-none"
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    XÁC NHẬN ADMIN
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAdminGenerateKey} className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-800 flex items-center justify-between">
                    <span className="font-bold flex items-center">
                      <Shield size={16} className="mr-1 text-purple-600" />
                      Công cụ Sinh Mã Kích Hoạt (Admin Mode)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAdminAuthenticated(false)}
                      className="text-purple-600 underline font-semibold hover:text-purple-900"
                    >
                      Thoát Admin
                    </button>
                  </div>

                  {/* Nhập Mã Thiết Bị khách hàng */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">1. Nhập Mã Thiết Bị của Khách hàng:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: DEV-88A4-99B2"
                      value={adminTargetDevId}
                      onChange={(e) => setAdminTargetDevId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-center uppercase"
                    />
                  </div>

                  {/* Chọn Gói Thời Hạn */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">2. Chọn Gói Bản Quyền Pro:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminSelectedPackage('1_YEAR')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          adminSelectedPackage === '1_YEAR'
                            ? 'bg-purple-600 text-white border-purple-600 shadow'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        🥇 Gói 1 Năm
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminSelectedPackage('2_YEARS')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          adminSelectedPackage === '2_YEARS'
                            ? 'bg-purple-600 text-white border-purple-600 shadow'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        🥈 Gói 2 Năm
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminSelectedPackage('LIFETIME')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          adminSelectedPackage === 'LIFETIME'
                            ? 'bg-amber-600 text-white border-amber-600 shadow'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        💎 Vĩnh Viễn
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition-all"
                  >
                    ⚡ TẠO MÃ KÍCH HOẠT PRO
                  </button>

                  {/* Kết quả Mã được tạo */}
                  {generatedKey && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-center">
                      <p className="text-xs text-emerald-800 font-semibold">MÃ PRO ĐÃ ĐƯỢC TẠO THÀNH CÔNG:</p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedKey}
                          className="flex-1 bg-white border border-emerald-300 rounded-lg p-2 text-sm font-mono font-bold text-emerald-900 text-center tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={handleCopyGeneratedKey}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          {copiedGenKey ? 'Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        * Thầy/Cô sao chép mã này gửi cho Khách hàng dán vào bước kích hoạt.
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default LicenseModal;
