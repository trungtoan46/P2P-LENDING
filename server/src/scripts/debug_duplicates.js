
const mongoose = require('mongoose');
require('dotenv').config();

// Define Schemas (Simplified)
const UserSchema = new mongoose.Schema({}, { strict: false });
const LoanSchema = new mongoose.Schema({}, { strict: false });
const AutoInvestSchema = new mongoose.Schema({}, { strict: false });
const InvestmentSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Loan = mongoose.model('Loan', LoanSchema);
const AutoInvest = mongoose.model('AutoInvest', AutoInvestSchema);
const Investment = mongoose.model('Investment', InvestmentSchema);

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/p2p_lending');
        console.log('Connected to MongoDB');

        // 1. Check AutoInvest Configs
        const autoInvests = await AutoInvest.find({});
        console.log(`\n--- AutoInvest Configs (${autoInvests.length}) ---`);
        autoInvests.forEach(ai => {
            console.log(`ID: ${ai._id}, User: ${ai.investorId}, Status: ${ai.status}, MatchedNodes: ${ai.matchedNodes}/${ai.totalNodes}`);
            console.log(`   Loans Matched: ${ai.loans ? ai.loans.length : 0}`);
            if (ai.loans && ai.loans.length > 0) {
                ai.loans.forEach(l => console.log(`      Loan: ${l.loanId}, Amount: ${l.amount}`));
            }
        });

        // 2. Check Investments
        const investments = await Investment.find({});
        console.log(`\n--- Investments (${investments.length}) ---`);

        // Group by Loan
        const investmentsByLoan = {};
        investments.forEach(inv => {
            if (!investmentsByLoan[inv.loanId]) investmentsByLoan[inv.loanId] = [];
            investmentsByLoan[inv.loanId].push(inv);
        });

        for (const loanId in investmentsByLoan) {
            console.log(`Loan ${loanId} has ${investmentsByLoan[loanId].length} investments:`);
            investmentsByLoan[loanId].forEach(inv => {
                console.log(`   InvID: ${inv._id}, Investor: ${inv.investorId}, Amount: ${inv.amount}, AutoInvestId: ${inv.autoInvestId}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkDuplicates();
