/**
 * @description eKYC API - Client wrapper for eKYC endpoints
 */

import httpClient from '../httpClient';
import { ENDPOINTS } from '../config';

const EkycApi = {
    /**
     * Lấy trạng thái eKYC hiện tại
     */
    async getStatus() {
        return httpClient.get(ENDPOINTS.EKYC.STATUS);
    },

    /**
     * OCR mặt trước CCCD
     * @param {String} imageUri - URI ảnh từ camera/gallery
     */
    async ocrFrontId(imageUri) {
        const formData = new FormData();
        formData.append('frontID', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'frontID.jpg'
        });
        return httpClient.upload(ENDPOINTS.EKYC.FRONT_ID, formData);
    },

    /**
     * OCR mặt sau CCCD
     * @param {String} imageUri - URI ảnh từ camera/gallery
     */
    async ocrBackId(imageUri) {
        const formData = new FormData();
        formData.append('backID', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'backID.jpg'
        });
        return httpClient.upload(ENDPOINTS.EKYC.BACK_ID, formData);
    },

    /**
     * Phát hiện hướng khuôn mặt
     * @param {String} imageUri - URI ảnh frame
     * @param {String} expected - Hướng mong đợi (left/right/up/down/straight)
     */
    async detectFace(imageUri, expected) {
        const formData = new FormData();
        formData.append('frame', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'frame.jpg'
        });
        formData.append('expected', expected);
        return httpClient.upload(ENDPOINTS.EKYC.DETECT_FACE, formData);
    },

    /**
     * Kiểm tra liveness + face matching
     * @param {Array<String>} portraitUris - Danh sách URI ảnh chân dung
     * @param {String} frontIdUri - URI ảnh CCCD (optional nếu đã upload)
     */
    async verifyLiveness(portraitUris, frontIdUri = null) {
        const formData = new FormData();

        portraitUris.forEach((uri, index) => {
            formData.append('portraits', {
                uri: uri,
                type: 'image/jpeg',
                name: `portrait_${index}.jpg`
            });
        });

        if (frontIdUri) {
            formData.append('frontID', {
                uri: frontIdUri,
                type: 'image/jpeg',
                name: 'frontID.jpg'
            });
        }

        return httpClient.upload(ENDPOINTS.EKYC.LIVENESS, formData);
    },

    /**
     * Xử lý eKYC hoàn chỉnh
     * @param {Array<String>} portraitUris - Danh sách URI ảnh chân dung
     * @param {String} frontIdUri - URI ảnh CCCD mặt trước
     * @param {String} backIdUri - URI ảnh CCCD mặt sau
     * @param {Object} ocrFrontResult - Kết quả OCR mặt trước
     * @param {Object} ocrBackResult - Kết quả OCR mặt sau
     */
    async processEkyc(portraitUris, frontIdUri, backIdUri = null, ocrFrontResult = null, ocrBackResult = null) {
        const formData = new FormData();

        portraitUris.forEach((uri, index) => {
            formData.append('portraits', {
                uri: uri,
                type: 'image/jpeg',
                name: `portrait_${index}.jpg`
            });
        });

        formData.append('frontID', {
            uri: frontIdUri,
            type: 'image/jpeg',
            name: 'frontID.jpg'
        });

        if (backIdUri) {
            formData.append('backID', {
                uri: backIdUri,
                type: 'image/jpeg',
                name: 'backID.jpg'
            });
        }

        if (ocrFrontResult) {
            formData.append('ocrFrontResult', JSON.stringify(ocrFrontResult));
        }

        if (ocrBackResult) {
            formData.append('ocrBackResult', JSON.stringify(ocrBackResult));
        }

        return httpClient.upload(ENDPOINTS.EKYC.PROCESS, formData);
    }
};

export default EkycApi;
