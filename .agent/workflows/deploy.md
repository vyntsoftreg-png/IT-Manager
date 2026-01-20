---
description: Hướng dẫn đẩy code lên Git và Deploy lên Server
---

# Quy Trình Deploy IT Manager

## 📋 Tổng Quan

Quy trình deploy bao gồm 4 bước chính:
1. Add files đã thay đổi
2. Commit với message mô tả
3. Push lên Git repository
4. Deploy lên server qua Portainer

---

## Bước 1: Add tất cả file đã thay đổi

```bash
# Mở terminal trong thư mục project
cd d:\Project\IT Manager

# Kiểm tra các file thay đổi
git status

# Add tất cả files
git add .

# Kiểm tra lại (files chuyển sang màu xanh)
git status
```

---

## Bước 2: Commit với message mô tả

```bash
# Commit ngắn gọn
git commit -m "feat: mô tả thay đổi của bạn"

# Hoặc commit chi tiết
git commit -m "feat: Tiêu đề thay đổi

- Chi tiết 1
- Chi tiết 2
- Chi tiết 3"
```

### Quy tắc đặt tên commit:
- `feat:` - Tính năng mới
- `fix:` - Sửa lỗi
- `docs:` - Cập nhật tài liệu
- `refactor:` - Tái cấu trúc code
- `style:` - Thay đổi giao diện/CSS

---

## Bước 3: Push lên Git repository

```bash
# Push lên branch main
git push origin main

# Hoặc push lên branch khác
git push origin <tên-branch>
```

---

## Bước 4: Deploy lên Server (Portainer)

### Cách A: Qua Portainer Web UI (Khuyến nghị)

1. Truy cập **Portainer**: `http://[server-ip]:9000`
2. Đăng nhập với tài khoản admin
3. Vào **Stacks** → Chọn stack `it-manager`
4. Click **Pull and redeploy**
5. Đợi container rebuild và restart

### Cách B: Qua SSH (Thủ công)

```bash
# SSH vào server
ssh user@server-ip

# Di chuyển đến thư mục project
cd /path/to/IT-Manager

# Pull code mới
git pull origin main

# Rebuild và restart containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Kiểm tra containers
docker-compose ps
```

---

## 🔍 Kiểm Tra Sau Deploy

1. **Truy cập ứng dụng**: `http://[server-ip]:3000`
2. **Kiểm tra logs nếu có lỗi**:
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

---

## ⚠️ Lưu Ý Quan Trọng

- Luôn **test cục bộ** trước khi deploy
- Backup database trước khi deploy các thay đổi lớn
- Kiểm tra **git status** trước khi commit để tránh commit nhầm file
- Sử dụng **branch riêng** cho các tính năng mới, sau đó merge vào main

---

## 📞 Liên Hệ Hỗ Trợ

Nếu gặp vấn đề khi deploy, kiểm tra:
1. Logs của Docker containers
2. Network connectivity đến Git repository
3. Quyền truy cập Portainer
