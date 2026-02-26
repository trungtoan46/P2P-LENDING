
const mongoose = require('mongoose');
require('dotenv').config();

// Define Schemas (Simplified)
const AutoInvestSchema = new mongoose.Schema({
    investorId: mongoose.Schema.Types.ObjectId,
    capital: Number,
    totalNodes: Number,
    matchedNodes: { type: Number, default: 0 },
    matchedCapital: { type: Number, default: 0 },
    status: String,
    loans: [Object],
    createdAt: Date
}, { strict: false });

const AutoInvest = mongoose.model('AutoInvest', AutoInvestSchema);

async function fixDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/p2p_lending');
        console.log('Connected to MongoDB');

        // Find users with multiple active configs
        const activeConfigs = await AutoInvest.find({ status: { $in: ['active', 'paused'] } }).sort({ createdAt: 1 });
        const userConfigs = {};

        activeConfigs.forEach(ac => {
            if (!userConfigs[ac.investorId]) userConfigs[ac.investorId] = [];
            userConfigs[ac.investorId].push(ac);
        });

        for (const userId in userConfigs) {
            const configs = userConfigs[userId];
            if (configs.length > 1) {
                console.log(`User ${userId} has ${configs.length} active configs.`);

                // Keep the one with the MOST matched nodes (or the oldest if equal)
                // Actually, we should merge them if possible, or just keep the 'best' one
                // Simple strategy: Keep the one with highest matchedNodes. If equal, keep oldest.

                configs.sort((a, b) => {
                    if (b.matchedNodes !== a.matchedNodes) return b.matchedNodes - a.matchedNodes;
                    return a.createdAt - b.createdAt;
                });

                const primary = configs[0];
                const duplicates = configs.slice(1);

                console.log(`Keeping Primary: ${primary._id} (Matched: ${primary.matchedNodes})`);

                for (const dup of duplicates) {
                    console.log(`   Deactivating Duplicate: ${dup._id} (Matched: ${dup.matchedNodes})`);

                    // Logic issue: If duplicate has matches, we shouldn't just loose them?
                    // But effectively we just want to stop NEW matching on it.
                    // The investments already made exist independently in Investment collection.
                    // So we can safely set status to 'cancelled'.

                    await AutoInvest.updateOne({ _id: dup._id }, { status: 'cancelled', cancelledAt: new Date() });
                }
            }
        }

        console.log('Duplicate fix complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixDuplicates();
