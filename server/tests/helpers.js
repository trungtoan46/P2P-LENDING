const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const UserDetails = require('../src/models/UserDetails');
const config = require('../src/config');

const createUser = async ({
    phone,
    password = 'Password123',
    category = 'borrower',
    isVerified = true,
    isActive = true
}) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return User.create({
        phone,
        password: hashedPassword,
        category,
        isVerified,
        isActive
    });
};

const createUserDetails = async (userId, overrides = {}) => {
    const base = {
        userId,
        name: 'Nguyen Van A',
        birth: new Date('1995-01-01'),
        sex: 'male',
        email: 'test@example.com',
        address: '123 Duong ABC, Quan 1',
        city: 'Ho Chi Minh',
        ssn: '123456789',
        job: 'Nhan vien',
        income: 10000000
    };
    return UserDetails.create({ ...base, ...overrides });
};

const createAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            phone: user.phone,
            category: user.category,
            tokenVersion: user.tokenVersion || 0
        },
        config.jwt.secret,
        { expiresIn: '1h' }
    );
};

module.exports = {
    createUser,
    createUserDetails,
    createAccessToken
};
