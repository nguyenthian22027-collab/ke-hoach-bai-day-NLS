import { LicenseInfo, ProPackage } from "../types";

const SECRET_SALT = "NLS_SECRET_PRO_SALT_2026_THIEN";
const DEVICE_ID_KEY = "NLS_DEVICE_ID_V1";
const TRIAL_START_KEY = "NLS_TRIAL_START_TIME_V1";
const PRO_LICENSE_KEY = "NLS_PRO_LICENSE_KEY_V1";
const PRO_PACKAGE_KEY = "NLS_PRO_PACKAGE_KEY_V1";
const PRO_EXPIRY_KEY = "NLS_PRO_EXPIRY_KEY_V1";

// 5 Ngày dùng thử tính bằng milliseconds
const TRIAL_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

// Simple FNV-1a 32-bit Hash converted to 8-char uppercase hex/alphanumeric
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positiveHash = (hash >>> 0).toString(16).toUpperCase();
  return (positiveHash + "8899AABB").slice(0, 8);
}

// Làm sạch Device ID (loại bỏ dấu gạch ngang, chữ thường -> chữ hoa)
function cleanString(str: string): string {
  return str.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

// 1. Hàm khởi tạo hoặc lấy Mã Thiết Bị độc nhất (Cố định theo Phần cứng Máy tính)
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Tạo fingerprint cố định từ cấu hình phần cứng thiết bị (Màn hình + Số nhân CPU + Múi giờ + Hệ điều hành)
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const cores = navigator.hardwareConcurrency || 4;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || "Win32";
    
    const hwFingerprint = `HW-DEVICE-V1:${screenInfo}:${cores}:${tz}:${platform}`;
    const hashHex1 = hashString(hwFingerprint);
    const hashHex2 = hashString(`${hashHex1}:${SECRET_SALT}`);
    
    deviceId = `DEV-${hashHex1.slice(0, 4)}-${hashHex2.slice(0, 4)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// 2. Hàm Admin: Sinh mã Kích hoạt Pro dựa trên Device ID và Gói thời hạn
export function generateProKey(deviceId: string, packageType: ProPackage): string {
  const cleanDev = cleanString(deviceId);
  if (!cleanDev) return "";

  let prefix = "PRO-LIFE";
  if (packageType === '1_YEAR') prefix = "PRO-1Y";
  if (packageType === '2_YEARS') prefix = "PRO-2Y";

  const rawPayload = `${prefix}:${cleanDev}:${SECRET_SALT}`;
  const checksum = hashString(rawPayload);

  return `${prefix}-${cleanDev.slice(-6)}-${checksum}`;
}

// 3. Hàm Người dùng: Kiểm tra & Kích hoạt Mã Pro
export function activateProKey(inputKey: string, currentDeviceId: string): { success: boolean; message: string; packageType?: ProPackage; expiryDate?: number } {
  const trimmedKey = inputKey.trim().toUpperCase();
  if (!trimmedKey) {
    return { success: false, message: "Vui lòng nhập Mã Kích Hoạt Pro!" };
  }

  const cleanDev = cleanString(currentDeviceId);

  // Thử kiểm tra khớp với từng gói 1 Năm, 2 Năm, Vĩnh Viễn
  const packages: ProPackage[] = ['LIFETIME', '1_YEAR', '2_YEARS'];
  let matchedPackage: ProPackage | null = null;

  for (const pkg of packages) {
    const expectedKey = generateProKey(currentDeviceId, pkg);
    if (trimmedKey === expectedKey || trimmedKey.replace(/[\s-]/g, "") === expectedKey.replace(/[\s-]/g, "")) {
      matchedPackage = pkg;
      break;
    }
  }

  if (!matchedPackage) {
    return {
      success: false,
      message: "Mã kích hoạt không hợp lệ hoặc không đúng với Mã Thiết Bị này!"
    };
  }

  let expiryTimestamp: number | undefined = undefined;
  const now = Date.now();

  if (matchedPackage === '1_YEAR') {
    expiryTimestamp = now + 365 * 24 * 60 * 60 * 1000;
  } else if (matchedPackage === '2_YEARS') {
    expiryTimestamp = now + 730 * 24 * 60 * 60 * 1000;
  }

  // Lưu vào localStorage
  localStorage.setItem(PRO_LICENSE_KEY, trimmedKey);
  localStorage.setItem(PRO_PACKAGE_KEY, matchedPackage);
  if (expiryTimestamp) {
    localStorage.setItem(PRO_EXPIRY_KEY, expiryTimestamp.toString());
  } else {
    localStorage.removeItem(PRO_EXPIRY_KEY);
  }

  return {
    success: true,
    message: matchedPackage === 'LIFETIME' 
      ? "Kích hoạt thành công Bản Pro Vĩnh Viễn!" 
      : matchedPackage === '1_YEAR'
      ? "Kích hoạt thành công Bản Pro 1 Năm!"
      : "Kích hoạt thành công Bản Pro 2 Năm!",
    packageType: matchedPackage,
    expiryDate: expiryTimestamp
  };
}

// 4. Hàm lấy toàn bộ thông tin Bản quyền & Dùng thử hiện tại
export function getLicenseInfo(): LicenseInfo {
  const deviceId = getOrCreateDeviceId();
  const proKey = localStorage.getItem(PRO_LICENSE_KEY);
  const proPackageStr = localStorage.getItem(PRO_PACKAGE_KEY) as ProPackage | null;
  const expiryStr = localStorage.getItem(PRO_EXPIRY_KEY);

  const now = Date.now();

  // Đã kích hoạt bản Pro
  if (proKey && proPackageStr) {
    let proExpiryDate: number | undefined = undefined;
    if (expiryStr) {
      proExpiryDate = parseInt(expiryStr, 10);
    }

    // Kiểm tra xem gói có thời hạn (1 năm/2 năm) đã hết hạn chưa
    if (proExpiryDate && now > proExpiryDate) {
      // Đã hết hạn Pro
      // Quay về tính hết hạn dùng thử
    } else {
      return {
        deviceId,
        isPro: true,
        packageType: proPackageStr,
        trialStartDate: 0,
        trialDaysRemaining: 0,
        isTrialExpired: false,
        proExpiryDate,
        licenseKey: proKey
      };
    }
  }

  // Chế độ Dùng thử 5 Ngày
  let trialStartStr = localStorage.getItem(TRIAL_START_KEY);
  let trialStartDate = trialStartStr ? parseInt(trialStartStr, 10) : 0;

  if (!trialStartDate || isNaN(trialStartDate)) {
    trialStartDate = now;
    localStorage.setItem(TRIAL_START_KEY, trialStartDate.toString());
  }

  const elapsedTime = now - trialStartDate;
  const isTrialExpired = elapsedTime >= TRIAL_DURATION_MS;
  const trialDaysRemaining = isTrialExpired 
    ? 0 
    : Math.max(0, (TRIAL_DURATION_MS - elapsedTime) / (24 * 60 * 60 * 1000));

  return {
    deviceId,
    isPro: false,
    packageType: 'TRIAL',
    trialStartDate,
    trialDaysRemaining,
    isTrialExpired,
    licenseKey: undefined
  };
}
