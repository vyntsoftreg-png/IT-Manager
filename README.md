# IT Manager - Hệ thống Quản lý IT

Hệ thống quản lý thiết bị, IP, tài khoản admin cho doanh nghiệp.

## 🚀 Triển khai nhanh với Docker

### Yêu cầu
- [Docker](https://docker.com) đã cài đặt
- [Docker Compose](https://docs.docker.com/compose/) (thường đi kèm Docker Desktop)

### Chạy ngay
```bash
# Clone repository
git clone https://github.com/vyntsoftreg-png/IT-Manager.git
cd IT-Manager

# Chạy với Docker Compose
docker-compose up -d

# Truy cập: http://localhost:3001
```

### Đăng nhập mặc định
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |

---

## 📦 Triển khai thủ công (không Docker)

### Yêu cầu
- Node.js 20+
- NPM 10+

### Cài đặt
```bash
# Backend
cd backend
npm install
npm run dev    # Development
# hoặc
npm start      # Production

# Frontend (terminal mới)
cd frontend
npm install
npm run dev    # Development
npm run build  # Production build
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Chạy backend (serve cả frontend)
cd backend && NODE_ENV=production node src/index.js
```

---

## 🔧 Cấu hình

### Biến môi trường (backend/.env)
```env
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=production
```

---

## 📱 Tính năng chính
- ✅ Quản lý thiết bị (PC, Server, Network devices...)
- ✅ IP Map - Quản lý dải mạng và địa chỉ IP
- ✅ Tài khoản Admin - Lưu trữ credentials an toàn
- ✅ Dashboard tổng quan
- ✅ Audit Log - Theo dõi hoạt động
- ✅ Multi-user với phân quyền

---

## 📞 Liên hệ
Phát triển bởi: IT Department
