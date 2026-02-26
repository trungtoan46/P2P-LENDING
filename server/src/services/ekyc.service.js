/**
 * @description eKYC Service - Business logic xử lý eKYC
 */

const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const ekycExternalService = require('../external/EkycService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const fs = require('fs');
const path = require('path');

// Thư mục lưu ảnh sau khi eKYC thành công
const RELATIVE_UPLOAD_DIR = 'uploads/ekyc';
const UPLOAD_DIR = path.join(__dirname, '../../', RELATIVE_UPLOAD_DIR);
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class EkycService {
    /**
     * Lưu ảnh KYC dạng Base64 để lưu DB, không ghi file local.
     */
    async savePermanentFiles(userId, frontIdBuffer, backIdBuffer, portraitBuffers) {
        const saveBuffer = (buffer, suffix) => {
            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
                return null;
            }
            const base64 = buffer.toString('base64');
            return `data:image/jpeg;base64,${base64}`;
        };

        const frontID = saveBuffer(frontIdBuffer, 'front');
        const backID = saveBuffer(backIdBuffer, 'back');
        const selfieBuffer = portraitBuffers && portraitBuffers.length > 0 ? portraitBuffers[0] : null;
        const selfie = saveBuffer(selfieBuffer, 'selfie');

        return { frontID, backID, selfie };
    }
    /**
     * OCR mặt trước CCCD
     * @param {String} userId - User ID
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} originalName - Tên file gốc
     * @returns {Object} OCR result
     */
    async processOcrFront(userId, imageBuffer, originalName) {
        console.log(`[EkycService] processOcrFront - userId: ${userId}, bufferSize: ${imageBuffer.length}`);

        // Gọi eKYC service với buffer
        const ocrResult = await ekycExternalService.ocrFrontID(imageBuffer, originalName);

        // Lưu kết quả OCR vào session tạm (không lưu DB ngay vì UserDetails yêu cầu nhiều field)
        // Dữ liệu sẽ được merge khi hoàn tất eKYC
        if (ocrResult.result) {
            const { id, name, dob, sex, home, address } = ocrResult.result;

            // Cập nhật hoặc tạo ekyc data trong collection riêng hoặc cache
            // Hiện tại chỉ trả về kết quả, sẽ lưu khi user hoàn tất flow
            console.log(`[EkycService] OCR Result:`, JSON.stringify(ocrResult.result));
        }

        return {
            success: true,
            data: ocrResult.result,
            message: 'OCR mặt trước CCCD thành công'
        };
    }

    /**
     * OCR mặt sau CCCD
     * @param {String} userId - User ID
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} originalName - Tên file gốc
     * @returns {Object} OCR result
     */
    async processOcrBack(userId, imageBuffer, originalName) {
        console.log(`[EkycService] processOcrBack - userId: ${userId}, bufferSize: ${imageBuffer.length}`);

        // Gọi eKYC service với buffer
        const ocrResult = await ekycExternalService.ocrBackID(imageBuffer, originalName);

        // Chỉ trả về kết quả, không lưu DB
        if (ocrResult.result) {
            console.log(`[EkycService] OCR Back Result:`, JSON.stringify(ocrResult.result));
        }

        return {
            success: true,
            data: ocrResult.result,
            message: 'OCR mặt sau CCCD thành công'
        };
    }

    /**
     * Phát hiện hướng khuôn mặt
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} expected - Hướng mong đợi
     * @returns {Object} Detection result
     */
    async detectFaceOrientation(imageBuffer, expected) {
        console.log(`[EkycService] detectFaceOrientation - expected: ${expected}, bufferSize: ${imageBuffer.length}`);

        const result = await ekycExternalService.detectFaceOrientation(imageBuffer, expected);
        console.log(`[EkycService] Detection result:`, JSON.stringify(result));

        return {
            success: true,
            data: result,
            detected: result?.result?.detected || false,
            message: 'Phát hiện khuôn mặt thành công'
        };
    }

    /**
     * Kiểm tra liveness và face matching
     * @param {String} userId - User ID
     * @param {Array<Buffer>} portraitBuffers - Danh sách buffer ảnh chân dung
     * @param {Buffer} frontIdBuffer - Buffer ảnh CCCD mặt trước
     * @returns {Object} Liveness result (không lưu DB, chỉ trả kết quả)
     */
    async verifyLiveness(userId, portraitBuffers, frontIdBuffer) {
        console.log(`[EkycService] verifyLiveness - portraits: ${portraitBuffers.length}`);

        const result = await ekycExternalService.livenessCheck(portraitBuffers, frontIdBuffer);
        console.log(`[EkycService] Liveness result:`, JSON.stringify(result));

        return {
            success: true,
            data: result.results,
            message: 'Kiểm tra liveness thành công'
        };
    }

    /**
     * Xử lý eKYC hoàn chỉnh - GỌI SAU KHI HOÀN TẤT TẤT CẢ BƯỚC
     * @param {String} userId - User ID
     * @param {Object} ekycData - Dữ liệu eKYC bao gồm:
     *   - frontIdBuffer: Buffer ảnh CCCD mặt trước
     *   - backIdBuffer: Buffer ảnh CCCD mặt sau (optional)
     *   - portraitBuffers: Array<Buffer> ảnh chân dung
     *   - ocrFrontResult: Kết quả OCR mặt trước
     *   - ocrBackResult: Kết quả OCR mặt sau (optional)
     * @returns {Object} Full eKYC result
     */
    async processFullEkyc(userId, ekycData) {
        const {
            frontIdBuffer,
            backIdBuffer,
            portraitBuffers,
            ocrFrontResult,
            ocrBackResult
        } = ekycData;

        console.log(`[EkycService] processFullEkyc - userId: ${userId}, portraits: ${portraitBuffers?.length || 0}`);

        // Gọi API liveness + face matching
        const result = await ekycExternalService.processFullEkyc(portraitBuffers, frontIdBuffer);
        console.log(`[EkycService] eKYC API result:`, JSON.stringify(result));

        // Kiểm tra kết quả
        const results = result.results || {};
        // Bỏ qua liveness check nếu bypass hoặc nếu success từ AI service (nằm trong results.success)
        const isLivenessPass = results.liveness === true || results.liveness === 'real' || results.success === true;

        // Lấy score từ matching_score hoặc default nếu là boolean
        const matchScore = results.matching_score !== undefined ? results.matching_score : (results.face_matching ? 1.0 : 0.0);
        const isFaceMatch = matchScore >= 0.7; // Ngưỡng chấp nhận

        // Gán lại vào results để client nhận được (EkycScreen.js dùng kết quả này để hiển thị %)
        results.face_matching = matchScore;

        // Biến lưu lỗi duplicate key nếu có
        let duplicateError = null;

        // Chỉ lưu DB khi eKYC thật sự thành công (AI detect được mặt và match)
        if (isFaceMatch) { // Ưu tiên face_matching để lưu dữ liệu
            // Lưu trữ tệp tin vĩnh viễn (Chuyển sang lưu Base64 trong DB theo yêu cầu)
            const { frontID, backID, selfie } = await this.savePermanentFiles(userId, frontIdBuffer, backIdBuffer, portraitBuffers);

            // Cập nhật hoặc tạo UserDetails với đủ thông tin
            const updateData = {
                userId,
                kycStatus: 'pending',
                kycSubmittedAt: new Date(),
                'imageURLs.frontID': frontID,
                'imageURLs.backID': backID,
                'imageURLs.selfie': selfie,
                'ekycData.fullResult': results,
                'ekycData.processedAt': new Date(),
                'ekycData.livenessPass': isLivenessPass,
                'ekycData.faceMatch': isFaceMatch
            };

            // Thêm OCR data nếu có
            if (ocrFrontResult) {
                // Map field từ Flask service (idNumber, fullName, dob, gender, address)
                if (ocrFrontResult.idNumber) updateData.ssn = ocrFrontResult.idNumber;
                if (ocrFrontResult.fullName) updateData.name = ocrFrontResult.fullName;
                if (ocrFrontResult.dob) updateData.birth = this._parseDate(ocrFrontResult.dob);
                if (ocrFrontResult.gender) updateData.sex = ocrFrontResult.gender === 'Nam' ? 'male' : 'female';
                if (ocrFrontResult.address) {
                    updateData.address = ocrFrontResult.address;
                    // Tạm thời lấy thành phố là từ cuối cùng của địa chỉ
                    const parts = ocrFrontResult.address.split(',');
                    updateData.city = parts[parts.length - 1].trim();
                }

                updateData['ekycData.frontIdOcr'] = ocrFrontResult;
            }

            if (ocrBackResult) {
                updateData['ekycData.backIdOcr'] = ocrBackResult;
            }

            // Đảm bảo các field required của UserDetails có giá trị (vì runValidators: false nhưng DB vẫn cần)
            // Lấy email từ User model nếu cần (thường đã có khi login)
            const user = await User.findById(userId);
            if (user && !updateData.email) updateData.email = user.email;

            if (!updateData.job) updateData.job = 'Tự do';
            if (!updateData.income) updateData.income = 0;
            if (!updateData.city) updateData.city = 'Hồ Chí Minh';
            try {
                await UserDetails.findOneAndUpdate(
                    { userId },
                    { $set: updateData },
                    { upsert: true, runValidators: false }
                );

                // Cập nhật User status và fullName (nếu có từ OCR)
                const userUpdate = { isVerified: true };
                if (ocrFrontResult && ocrFrontResult.fullName) {
                    userUpdate.fullName = ocrFrontResult.fullName;
                }
                await User.findByIdAndUpdate(userId, userUpdate);

                console.log(`[EkycService] eKYC completed and saved for user: ${userId}`);
            } catch (error) {
                // Bắt lỗi duplicate key (E11000) và gán vào biến thay vì throw
                if (error.code === 11000) {
                    const field = Object.keys(error.keyPattern || {})[0];
                    const value = error.keyValue ? error.keyValue[field] : '';

                    if (field === 'ssn') {
                        duplicateError = `Số CMND/CCCD ${value} đã được đăng ký trong hệ thống`;
                    } else {
                        duplicateError = `${field} đã tồn tại trong hệ thống`;
                    }
                } else {
                    throw error; // Ném lại lỗi khác (không phải duplicate)
                }
            }
        }

        // Nếu có lỗi duplicate, trả về thông báo thay vì throw
        if (duplicateError) {
            return {
                success: false,
                data: {
                    ...results,
                    kycStatus: 'failed'
                },
                message: duplicateError
            };
        }

        const isSuccess = isLivenessPass && isFaceMatch;

        return {
            success: isSuccess,
            data: {
                ...results,
                kycStatus: isSuccess ? 'pending' : 'failed',
                isVerified: isSuccess,
                frontIdOcr: ocrFrontResult
            },
            message: isSuccess
                ? 'eKYC hoàn tất, chờ xét duyệt'
                : results.error || 'eKYC chưa đạt yêu cầu, vui lòng thử lại'
        };
    }

    /**
     * Lấy trạng thái eKYC của user
     * @param {String} userId - User ID
     * @returns {Object} eKYC status
     */
    async getEkycStatus(userId) {
        const details = await UserDetails.findOne({ userId });

        return {
            hasDetails: !!details,
            kycStatus: details?.kycStatus || 'none',
            hasFrontId: !!details?.imageURLs?.frontID,
            hasBackId: !!details?.imageURLs?.backID,
            hasSelfie: !!details?.imageURLs?.selfie,
            ekycData: details?.ekycData || null
        };
    }

    /**
     * Helper: Parse date string từ OCR (dd/mm/yyyy) sang Date
     */
    _parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return null;
    }
}

module.exports = new EkycService();
