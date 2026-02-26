// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const FILE_BASE_URL = import.meta.env.VITE_FILE_URL || 'http://localhost:3000';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Date formats
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';

// Currency
export const CURRENCY = 'VND';
export const LOCALE = 'vi-VN';

// Base unit price for notes
export const BASE_UNIT_PRICE = 500000;
