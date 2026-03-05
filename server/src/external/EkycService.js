/**
 * @description eKYC External Service - Wrapper gọi eKYC Flask API
 * Kết nối với eKYC service chạy trên port 8000
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class EkycService {
    constructor() {
        this.baseUrl = process.env.EKYC_SERVICE_URL || 'http://localhost:8000';
        this.timeout = 60000; // 60s cho liveness/face matching (theo EKYC guide)

        // Axios instance với config mặc định
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout
        });
    }

    /**
     * Helper: Tạo request với form-data
     */
    async _makeRequest(endpoint, formData) {
        console.log(`[EkycService] Making request to: ${this.baseUrl}${endpoint}`);

        try {
            const response = await this.client.post(endpoint, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            console.log(`[EkycService] Response status: ${response.status}`);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            console.error(`[EkycService] Request to ${endpoint} failed:`, errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * OCR mặt trước CCCD
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} filename - Tên file gốc
     * @returns {Object} { result: { id, name, dob, ... } }
     */
    async ocrFrontID(imageBuffer, filename = 'frontID.jpg') {
        console.log(`[EkycService] OCR frontID - Buffer size: ${imageBuffer.length} bytes`);

        const formData = new FormData();
        formData.append('frontID', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/frontID', formData);
        console.log('[EkycService] OCR front ID completed');
        return result;
    }

    /**
     * OCR mặt sau CCCD
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} filename - Tên file gốc
     * @returns {Object} { result: { issue_date, issue_place, ... } }
     */
    async ocrBackID(imageBuffer, filename = 'backID.jpg') {
        console.log(`[EkycService] OCR backID - Buffer size: ${imageBuffer.length} bytes`);

        const formData = new FormData();
        formData.append('backID', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/backID', formData);
        console.log('[EkycService] OCR back ID completed');
        return result;
    }

    /**
     * Phát hiện hướng khuôn mặt
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} expected - Hướng mong đợi (left, right, up, down, straight)
     * @returns {Object} { result: { detected, expected, match } }
     */
    async detectFaceOrientation(imageBuffer, expected) {
        console.log(`[EkycService] Face detection - expected: ${expected}`);

        const formData = new FormData();
        formData.append('frame', imageBuffer, {
            filename: 'frame.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('expected', expected);

        const result = await this._makeRequest('/api/ekyc/detection', formData);
        console.log(`[EkycService] Face detection completed`);
        return result;
    }

    /**
     * Kiểm tra liveness + face matching
     * @param {Array<Buffer>} portraitBuffers - Danh sách buffer ảnh chân dung
     * @param {Buffer} frontIdBuffer - Buffer ảnh CCCD mặt trước
     * @returns {Object} { results: { liveness, face_matching, spoof_score, ... } }
     */
    async livenessCheck(portraitBuffers, frontIdBuffer) {
        console.log(`[EkycService] Liveness check - ${portraitBuffers.length} portraits`);

        const formData = new FormData();

        // Thêm nhiều ảnh portrait
        portraitBuffers.forEach((buffer, index) => {
            formData.append('portraitImages', buffer, {
                filename: `portrait_${index}.jpg`,
                contentType: 'image/jpeg'
            });
        });

        formData.append('frontID', frontIdBuffer, {
            filename: 'frontID.jpg',
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/liveness', formData);
        console.log('[EkycService] Liveness check completed');
        return result;
    }

    /**
     * Xử lý eKYC hoàn chỉnh
     * @param {Array<Buffer>} portraitBuffers - Danh sách buffer ảnh chân dung
     * @param {Buffer} frontIdBuffer - Buffer ảnh CCCD mặt trước
     * @returns {Object} { results: { ocr, liveness, face_matching, ... } }
     */
    async processFullEkyc(portraitBuffers, frontIdBuffer) {
        console.log(`[EkycService] Full eKYC - ${portraitBuffers.length} portraits`);

        // DEBUG: Lưu ảnh gốc để kiểm tra
        if (portraitBuffers.length > 0) {
            const debugPath = path.join(__dirname, '../../uploads/ekyc/debug_portrait_original.jpg');
            try {
                fs.writeFileSync(debugPath, portraitBuffers[0]);
                console.log(`[EkycService] DEBUG - Saved original portrait (${portraitBuffers[0].length} bytes) to: ${debugPath}`);
            } catch (err) {
                console.log(`[EkycService] DEBUG - Could not save debug image: ${err.message}`);
            }
        }

        const formData = new FormData();

        portraitBuffers.forEach((buffer, index) => {
            formData.append('portraitImages', buffer, {
                filename: `portrait_${index}.jpg`,
                contentType: 'image/jpeg'
            });
        });

        formData.append('frontID', frontIdBuffer, {
            filename: 'frontID.jpg',
            contentType: 'image/jpeg'
        });

        // Dùng /api/ekyc/liveness (hybrid liveness) thay vì /api/ekyc-process
        // Vì liveness endpoint có face detection tốt hơn (MTCNN fallback) + anti-spoofing
        const result = await this._makeRequest('/api/ekyc/liveness', formData);
        console.log('[EkycService] Full eKYC process completed');
        return result;
    }

    /**
     * Kiểm tra eKYC service có khả dụng không
     */
    async isAvailable() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error('[EkycService] Service not available:', error.message);
            return false;
        }
    }
}

module.exports = new EkycService();
