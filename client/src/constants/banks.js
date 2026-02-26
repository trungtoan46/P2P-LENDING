/**
 * Danh sách ngân hàng Việt Nam
 */

export const VIETNAM_BANKS = [
    // Nhóm Ngân hàng Quốc doanh & Big 4
    { code: 'AGRIBANK', shortName: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
    { code: 'VCB', shortName: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
    { code: 'CTG', shortName: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
    { code: 'BIDV', shortName: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },

    // Nhóm Ngân hàng TMCP Tư nhân
    { code: 'TCB', shortName: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
    { code: 'MB', shortName: 'MB Bank', fullName: 'Ngân hàng TMCP Quân đội' },
    { code: 'VPB', shortName: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
    { code: 'ACB', shortName: 'ACB', fullName: 'Ngân hàng TMCP Á Châu' },
    { code: 'STB', shortName: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
    { code: 'HDB', shortName: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh' },
    { code: 'VIB', shortName: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế Việt Nam' },
    { code: 'TPB', shortName: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong' },
    { code: 'SHB', shortName: 'SHB', fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
    { code: 'LPB', shortName: 'LPBank', fullName: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
    { code: 'MSB', shortName: 'MSB', fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
    { code: 'OCB', shortName: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông' },
    { code: 'SSB', shortName: 'SeABank', fullName: 'Ngân hàng TMCP Đông Nam Á' },
    { code: 'EIB', shortName: 'Eximbank', fullName: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
    { code: 'VBB', shortName: 'Vietbank', fullName: 'Ngân hàng TMCP Việt Nam Thương Tín' },
    { code: 'ABB', shortName: 'ABBank', fullName: 'Ngân hàng TMCP An Bình' },
    { code: 'BAB', shortName: 'Bac A Bank', fullName: 'Ngân hàng TMCP Bắc Á' },
    { code: 'NAB', shortName: 'Nam A Bank', fullName: 'Ngân hàng TMCP Nam Á' },
    { code: 'NCB', shortName: 'NCB', fullName: 'Ngân hàng TMCP Quốc Dân' },
    { code: 'VAB', shortName: 'VietABank', fullName: 'Ngân hàng TMCP Việt Á' },
    { code: 'BVB', shortName: 'BVBank', fullName: 'Ngân hàng TMCP Bản Việt' },
    { code: 'KLB', shortName: 'KienlongBank', fullName: 'Ngân hàng TMCP Kiên Long' },
    { code: 'PGB', shortName: 'PGBank', fullName: 'Ngân hàng TMCP Thịnh vượng và Phát triển' },
    { code: 'SGB', shortName: 'Saigonbank', fullName: 'Ngân hàng TMCP Sài Gòn Công Thương' },
    { code: 'BVB', shortName: 'BaoViet Bank', fullName: 'Ngân hàng TMCP Bảo Việt' },

    // Nhóm Ngân hàng Chuyển đổi
    { code: 'VCBNEO', shortName: 'VCBNeo', fullName: 'Ngân hàng TNHH MTV Ngoại thương Công nghệ số' },
    { code: 'MBV', shortName: 'MBV', fullName: 'Ngân hàng TNHH MTV Việt Nam Hiện Đại' },
    { code: 'VIKKI', shortName: 'Vikki Bank', fullName: 'Ngân hàng TNHH MTV Số Vikki' },
    { code: 'GPB', shortName: 'GPBank', fullName: 'Ngân hàng TMCP Dầu khí Toàn Cầu' },

    // Nhóm Ngân hàng Nước ngoài & Liên doanh
    { code: 'HSBC', shortName: 'HSBC', fullName: 'Ngân hàng TNHH MTV HSBC (Việt Nam)' },
    { code: 'SHINHAN', shortName: 'Shinhan Bank', fullName: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
    { code: 'SC', shortName: 'Standard Chartered', fullName: 'Ngân hàng TNHH MTV Standard Chartered (Việt Nam)' },
    { code: 'UOB', shortName: 'UOB', fullName: 'Ngân hàng TNHH MTV UOB Việt Nam' },
    { code: 'PBV', shortName: 'Public Bank', fullName: 'Ngân hàng TNHH MTV Public Bank Việt Nam' },
    { code: 'HLB', shortName: 'Hong Leong Bank', fullName: 'Ngân hàng TNHH MTV Hong Leong Việt Nam' },
    { code: 'WOORI', shortName: 'Woori Bank', fullName: 'Ngân hàng TNHH MTV Woori Việt Nam' },
    { code: 'CIMB', shortName: 'CIMB', fullName: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
    { code: 'IVB', shortName: 'IVB', fullName: 'Ngân hàng TNHH Indovina' },
    { code: 'VRB', shortName: 'VRB', fullName: 'Ngân hàng Liên doanh Việt - Nga' },

    // Nhóm Chính sách
    { code: 'VBSP', shortName: 'VBSP', fullName: 'Ngân hàng Chính sách xã hội Việt Nam' },
    { code: 'VDB', shortName: 'VDB', fullName: 'Ngân hàng Phát triển Việt Nam' },
    { code: 'COOPBANK', shortName: 'Co-opBank', fullName: 'Ngân hàng Hợp tác xã Việt Nam' },
];

export default VIETNAM_BANKS;
