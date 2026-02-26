/**
 * Script update user thành admin
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../src/.env') });

const mongoose = require('mongoose');

async function updateAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = require('../src/models/User');

        const result = await User.updateOne(
            { phone: '0900000000' },
            { $set: { category: 'admin' } }
        );

        console.log('Update result:', result);

        const user = await User.findOne({ phone: '0900000000' });
        console.log('User category now:', user?.category);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

updateAdmin();
