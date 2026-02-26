/**
 * @description API Hook - Quản lý API calls
 */

import { useState, useCallback } from 'react';

export const useApi = (apiFunc) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...params) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFunc(...params);
            if (result.success) {
                setData(result.data);
            } else {
                setError(result.message || 'Có lỗi xảy ra');
            }
            return result;
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [apiFunc]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { data, loading, error, execute, reset };
};

export default useApi;
