/**
 * @description Fabric Blockchain Service
 * Kết nối và tương tác với Hyperledger Fabric network
 */

const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const fabprotos = require('fabric-protos');

class FabricService {
    constructor() {
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.channelName = process.env.FABRIC_CHANNEL || 'mychannel';
        this.chaincodeName = process.env.FABRIC_CHAINCODE || 'p2plending';
        this.isConnecting = false;
    }

    /**
     * Kết nối với Hyperledger Fabric network
     */
    async connect() {
        try {
            if (this.contract) {
                return true;
            }

            if (process.env.BLOCKCHAIN_ENABLED !== 'true') {
                throw new Error('Blockchain chưa được bật. Vui lòng set BLOCKCHAIN_ENABLED=true trong .env');
            }

            const ccpPath = path.resolve(__dirname, '../../config/connection.json');

            console.log('[FabricService] ccpPath resolved:', ccpPath);

            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Không tìm thấy file connection.json tại: ${ccpPath}`);
            }

            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const walletPath = path.resolve(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = process.env.FABRIC_IDENTITY || 'admin';
            const identityExists = await wallet.get(identity);
            if (!identityExists) {
                throw new Error(`Identity '${identity}' không tồn tại trong wallet. Vui lòng đăng ký admin trước.`);
            }

            // Kết nối gateway
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet,
                identity,
                discovery: {
                    enabled: true,
                    asLocalhost: process.env.FABRIC_AS_LOCALHOST === 'true'
                }
            });

            // Lấy network và contract
            this.network = await this.gateway.getNetwork(this.channelName);
            this.contract = this.network.getContract(this.chaincodeName);

            console.log('[FabricService] Kết nối blockchain thành công');
            return true;
        } catch (error) {
            console.error(`[FabricService] Lỗi kết nối blockchain: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ngắt kết nối
     */
    async disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
            this.gateway = null;
            this.network = null;
            this.contract = null;
        }
    }

    /**
     * Đảm bảo đã kết nối trước khi thực hiện transaction
     */
    async ensureConnection() {
        if (this.contract) {
            return true;
        }

        if (this.isConnecting) {
            while (this.isConnecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return !!this.contract;
        }

        this.isConnecting = true;
        try {
            return await this.connect();
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Kiểm tra blockchain có sẵn sàng không
     */
    async isAvailable() {
        return await this.ensureConnection();
    }

    // ===== GENERIC EXPLORER FUNCTIONS =====

    /**
     * Lấy danh sách block (pagination)
     * @param {number} fromBlock - Block ending number (descending)
     * @param {number} limit - Number of blocks to fetch
     */
    /**
     * Decode block from protobuf bytes
     */
    _decodeBlock(blockBytes) {
        const block = fabprotos.common.Block.decode(blockBytes);
        const header = block.header;
        const blockNumber = header.number.toString();
        const dataHash = Buffer.from(header.data_hash).toString('hex');
        const previousHash = Buffer.from(header.previous_hash).toString('hex');

        const transactions = [];
        if (block.data && block.data.data) {
            for (const envBytes of block.data.data) {
                try {
                    const envelope = fabprotos.common.Envelope.decode(envBytes);
                    const payload = fabprotos.common.Payload.decode(envelope.payload);
                    const channelHeader = fabprotos.common.ChannelHeader.decode(payload.header.channel_header);
                    const signatureHeader = fabprotos.common.SignatureHeader.decode(payload.header.signature_header);
                    const creator = fabprotos.msp.SerializedIdentity.decode(signatureHeader.creator);

                    transactions.push({
                        txId: channelHeader.tx_id,
                        timestamp: channelHeader.timestamp ? new Date(channelHeader.timestamp.seconds * 1000).toISOString() : null,
                        creatorMsp: creator.mspid,
                        type: channelHeader.type
                    });
                } catch (e) {
                    transactions.push({ txId: 'parse_error', timestamp: null, creatorMsp: 'unknown' });
                }
            }
        }

        return {
            number: blockNumber,
            previousHash,
            dataHash,
            txCount: transactions.length,
            timestamp: transactions[0]?.timestamp || null,
            transactions
        };
    }

    async queryBlocks(fromBlock, limit = 10) {
        try {
            await this.ensureConnection();
            const qscc = this.network.getContract('qscc');

            // Get current height if fromBlock is not provided
            let endBlock = fromBlock;
            if (!endBlock) {
                const infoBytes = await qscc.evaluateTransaction('GetChainInfo', this.channelName);
                const info = fabprotos.common.BlockchainInfo.decode(infoBytes);
                endBlock = parseInt(info.height.toString()) - 1;
            }

            const startBlock = Math.max(0, endBlock - limit + 1);
            const promises = [];

            for (let i = endBlock; i >= startBlock; i--) {
                promises.push(
                    qscc.evaluateTransaction('GetBlockByNumber', this.channelName, String(i))
                        .then(bytes => this._decodeBlock(bytes))
                        .catch(e => null)
                );
            }

            const blocks = await Promise.all(promises);
            return blocks.filter(b => b);
        } catch (error) {
            console.error(`[FabricService] Error querying blocks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy thông tin chain (height, hash)
     */
    async queryChainInfo() {
        try {
            await this.ensureConnection();
            const qscc = this.network.getContract('qscc');
            const infoBytes = await qscc.evaluateTransaction('GetChainInfo', this.channelName);
            const info = fabprotos.common.BlockchainInfo.decode(infoBytes);

            return {
                height: parseInt(info.height.toString()),
                currentBlockHash: Buffer.from(info.currentBlockHash).toString('hex'),
                previousBlockHash: Buffer.from(info.previousBlockHash).toString('hex')
            };
        } catch (error) {
            console.error(`[FabricService] Error querying chain info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy thông tin Block theo số
     */
    async queryBlock(blockNumber) {
        try {
            await this.ensureConnection();
            const qscc = this.network.getContract('qscc');
            const blockBytes = await qscc.evaluateTransaction('GetBlockByNumber', this.channelName, String(blockNumber));
            return this._decodeBlock(blockBytes);
        } catch (error) {
            console.error(`[FabricService] Error querying block: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy thông tin Transaction theo ID
     */
    async queryTransaction(txId) {
        try {
            await this.ensureConnection();
            const qscc = this.network.getContract('qscc');
            const txBytes = await qscc.evaluateTransaction('GetTransactionByID', this.channelName, txId);
            const processedTx = fabprotos.protos.ProcessedTransaction.decode(txBytes);

            const envelope = fabprotos.common.Envelope.decode(processedTx.transactionEnvelope.payload);
            const payload = fabprotos.common.Payload.decode(envelope.payload);
            const channelHeader = fabprotos.common.ChannelHeader.decode(payload.header.channel_header);
            const signatureHeader = fabprotos.common.SignatureHeader.decode(payload.header.signature_header);
            const creator = fabprotos.msp.SerializedIdentity.decode(signatureHeader.creator);

            return {
                txId: channelHeader.tx_id,
                timestamp: channelHeader.timestamp ? new Date(channelHeader.timestamp.seconds * 1000).toISOString() : null,
                channelId: channelHeader.channel_id,
                creatorMsp: creator.mspid,
                validationCode: processedTx.validationCode,
            };
        } catch (error) {
            console.error(`[FabricService] Error querying transaction: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy lịch sử thay đổi của một asset (Key)
     */
    async queryHistory(key) {
        try {
            await this.ensureConnection();
            // Assumes chaincode has a GetHistory method or similar standard pattern
            // 'GetHistoryForKey' is a standard shim API method, often exposed via chaincode
            const result = await this.contract.evaluateTransaction('GetHistoryForKey', key);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`[FabricService] Error querying history: ${error.message}`);
            // If chaincode doesn't support generic GetHistory, return empty or error
            return [];
        }
    }

    /**
     * Tạo hợp đồng vay tự động
     */
    async createLoanContractAuto(borrower, capital, periodMonth, score, willing, disbursementDate = null) {
        try {
            await this.ensureConnection();

            const loanId = `LOAN_${Date.now()}`;
            const borrowerStr = JSON.stringify(borrower);
            const disbursementDateISO = disbursementDate ? new Date(disbursementDate).toISOString() : '';

            const result = await this.contract.submitTransaction(
                'createLoanContractAuto',
                loanId,
                capital.toString(),
                periodMonth.toString(),
                score.toString(),
                willing,
                borrowerStr,
                disbursementDateISO
            );

            const parsedResult = JSON.parse(result.toString());
            parsedResult._id = parsedResult.contractId;
            return parsedResult;
        } catch (error) {
            console.error(`[FabricService] Lỗi tạo loan contract: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cập nhật trạng thái khoản vay trên blockchain
     * @param {String} contractId - ID contract trên blockchain
     * @param {String} newStatus - Trạng thái mới (approved, rejected, active, completed, etc.)
     * @param {Object} additionalData - Dữ liệu bổ sung (reason, adminId, etc.)
     */
    async updateLoanStatus(contractId, newStatus, additionalData = {}) {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction(
                'updateLoanStatus',
                contractId,
                newStatus,
                JSON.stringify(additionalData)
            );

            const parsedResult = JSON.parse(result.toString());
            console.log(`[FabricService] Đã cập nhật trạng thái loan ${contractId} -> ${newStatus}`);
            return parsedResult;
        } catch (error) {
            console.error(`[FabricService] Lỗi cập nhật trạng thái loan: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy danh sách khoản vay theo trạng thái
     */
    async findLoanByStatus(user, status) {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('getLoanContracts');
            const loans = JSON.parse(result.toString());

            return loans.filter(loan => {
                if (status === 'current') {
                    return loan.status !== 'clean' && loan.status !== 'fail';
                }
                return loan.status === status;
            }).map(loan => {
                loan._id = loan.contractId;
                return loan;
            });
        } catch (error) {
            console.error(`[FabricService] Lỗi tìm loan: ${error.message}`);
            throw error;
        }
    }

    /**
     * Tìm khoản vay theo ID
     */
    async findLoanById(loanId) {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('queryLoanContract', loanId);
            const loan = JSON.parse(result.toString());
            loan._id = loan.contractId;
            return loan;
        } catch (error) {
            console.error(`[FabricService] Lỗi tìm loan by ID: ${error.message}`);
            throw error;
        }
    }

    // ===== INVESTMENT FUNCTIONS =====

    /**
     * Tạo hợp đồng đầu tư
     */
    async createInvestContract(lender, loanData, investAmount, investNotes) {
        try {
            await this.ensureConnection();

            const investId = `INVEST_${Date.now()}`;
            const info = {
                investAmount: parseInt(investAmount),
                investNotes: parseInt(investNotes),
                serviceFee: Math.round(investAmount * 0.01)
            };

            const result = await this.contract.submitTransaction(
                'createInvestContract',
                investId,
                loanData.contractId,
                JSON.stringify(info),
                JSON.stringify(lender)
            );

            const parsedResult = JSON.parse(result.toString());
            parsedResult._id = parsedResult.contractId;
            return parsedResult;
        } catch (error) {
            console.error(`[FabricService] Lỗi tạo invest contract: ${error.message}`);
            throw error;
        }
    }

    /**
     * Tìm đầu tư theo trạng thái
     */
    async findInvestByStatus(lender, status) {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('queryAllInvestContracts');
            const invests = JSON.parse(result.toString());

            return invests.filter(invest => {
                const lenderData = typeof invest.lender === 'string'
                    ? JSON.parse(invest.lender)
                    : invest.lender;
                return invest.status === status && String(lenderData._id) === String(lender._id);
            }).map(invest => {
                invest._id = invest.contractId;
                return invest;
            });
        } catch (error) {
            console.error(`[FabricService] Lỗi tìm invest: ${error.message}`);
            throw error;
        }
    }

    // ===== SETTLEMENT FUNCTIONS =====

    /**
     * Thanh toán khoản vay
     */
    async settleLoanContract(settledId, realpaidDate) {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction(
                'settleLoanContract',
                settledId,
                realpaidDate || new Date().toISOString()
            );

            const parsedResult = JSON.parse(result.toString());
            parsedResult._id = parsedResult.contractId;
            return parsedResult;
        } catch (error) {
            console.error(`[FabricService] Lỗi settle loan: ${error.message}`);
            throw error;
        }
    }

    /**
     * Trả nợ một phần
     */
    async partialPayment(settledId, amount, realpaidDate) {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction(
                'partialPayment',
                settledId,
                amount.toString(),
                realpaidDate || new Date().toISOString()
            );

            const parsedResult = JSON.parse(result.toString());
            parsedResult._id = parsedResult.contractId;
            return parsedResult;
        } catch (error) {
            console.error(`[FabricService] Lỗi partial payment: ${error.message}`);
            throw error;
        }
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Kiểm tra khoản vay đến hạn
     */
    async checkDuePayments() {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction('checkDuePayments');
            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`[FabricService] Lỗi check due payments: ${error.message}`);
            throw error;
        }
    }

    /**
     * Lấy danh sách khoản vay đến hạn
     */
    async getDuePayments() {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('getDuePayments');
            const duePayments = JSON.parse(result.toString());

            return duePayments.map(payment => {
                payment._id = payment.contractId;
                return payment;
            });
        } catch (error) {
            console.error(`[FabricService] Lỗi get due payments: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new FabricService();
