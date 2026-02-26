/**
 * Script tạo tài khoản Admin
 * Chạy: node scripts/create-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../src/.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Thông tin admin mặc định
const ADMIN_PHONE = '0900000000';
const ADMIN_PASSWORD = 'admin123';

async function createAdmin() {
    try {
        // Kết nối MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('Lỗi: MONGODB_URI không được cấu hình trong .env');
            process.exit(1);
        }

        console.log('Đang kết nối MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Đã kết nối MongoDB');

        // Load model User
        const User = require('../src/models/User');

        // Kiểm tra admin đã tồn tại chưa
        const existingAdmin = await User.findOne({ phone: ADMIN_PHONE });
        if (existingAdmin) {
            console.log('Tài khoản admin đã tồn tại!');
            console.log('---');
            console.log(`SĐT: ${ADMIN_PHONE}`);
            console.log(`Mật khẩu: ${ADMIN_PASSWORD}`);
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        // Tạo admin mới
        const admin = await User.create({
            phone: ADMIN_PHONE,
            password: hashedPassword,
            category: 'admin',
            isActive: true,
            isVerified: true,
        });

        console.log('-----------------------------------');
        console.log('Tạo tài khoản Admin thành công!');
        console.log('-----------------------------------');
        console.log(`SĐT: ${ADMIN_PHONE}`);
        console.log(`Mật khẩu: ${ADMIN_PASSWORD}`);
        console.log(`ID: ${admin._id}`);
        console.log('-----------------------------------');

        await mongoose.disconnect();
        console.log('Đã ngắt kết nối MongoDB');

    } catch (error) {
        console.error('Lỗi:', error.message);
        process.exit(1);
    }
}

createAdmin();
