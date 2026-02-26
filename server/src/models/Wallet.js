/**
 * @description Wallet Model - Ví tiền của người dùng
 */

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    balance: {
        type: Number,
        default: 0,
        min: 0
    },

    frozenBalance: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Tự động tạo wallet khi tạo user
walletSchema.statics.getOrCreate = async function(userId) {
    let wallet = await this.findOne({ userId });
    if (!wallet) {
        wallet = await this.create({ userId, balance: 0, frozenBalance: 0 });
    }
    return wallet;
};

module.exports = mongoose.model('Wallet', walletSchema);

