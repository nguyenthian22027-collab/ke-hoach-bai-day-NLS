@echo off
chcp 65001 > nul
title Khởi động Ứng dụng Soạn Kế Hoạch Bài Dạy NLS

echo =================================================================
echo        HỆ THỐNG SOẠN BÀI DẠY TÍCH HỢP NĂNG LỰC SỐ (NLS)
echo =================================================================
echo.

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa tìm thấy Node.js trên máy tính của bạn!
    echo Vui lòng tải và cài đặt Node.js tại: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Kiểm tra và cài đặt node_modules nếu chưa có
if not exist "node_modules\" (
    echo [THÔNG BÁO] Đang tiến hành cài đặt các thư viện cần thiết...
    echo (Lần đầu khởi động có thể mất 1-2 phút, vui lòng chờ trong giây lát)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [LỖI] Cài đặt thư viện không thành công! Vui lòng kiểm tra lại kết nối mạng.
        pause
        exit /b
    )
    echo.
    echo [THÀNH CÔNG] Đã cài đặt xong thư viện!
    echo.
)

echo [THÔNG BÁO] Đang khởi chạy máy chủ ứng dụng...
echo Trình duyệt web sẽ tự động mở tại địa chỉ: http://localhost:5173
echo (Nhấn Ctrl + C trong cửa sổ này nếu muốn dừng ứng dụng)
echo.

:: Mở tự động trình duyệt web sau 2 giây
timeout /t 2 /nobreak > nul
start http://localhost:5173

:: Khởi chạy Vite dev server
call npm run dev

pause
