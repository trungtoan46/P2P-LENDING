# P2P Lending Server

## 🎯 Mục Đích

Server cho vay ngang hàng (P2P Lending) với cấu trúc đơn giản, dễ bảo trì và mở rộng.

## 📁 Cấu Trúc

```
src/
├── config/              # Cấu hình
├── models/              # Database models (Mongoose)
├── services/            # Business logic
├── controllers/         # Request handlers
├── routes/              # API routes
├── middlewares/         # Middlewares (auth, error, etc.)
├── utils/               # Utilities (logger, helpers)
├── constants/           # Constants
├── app.js              # Express app
└── server.js           # Entry point
```

## 🚀 Bắt Đầu

### Cài Đặt

```bash
npm install
```

### Cấu Hình

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn
```

### Chạy Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📝 API Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/loans` - Danh sách khoản vay
- `POST /api/loans` - Tạo khoản vay
- ... (sẽ được cập nhật)

## 🔧 Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Winston** - Logging

## 📦 Modules

1. **Auth** - Xác thực & phân quyền
2. **Loan** - Quản lý khoản vay
3. **Investment** - Quản lý đầu tư
4. **Payment** - Thanh toán (PayOS)
5. **Wallet** - Ví điện tử
6. **User** - Quản lý người dùng
7. **Notification** - Thông báo

## 📄 License

ISC
