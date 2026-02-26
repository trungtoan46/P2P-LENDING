# Tài Liệu Hướng Dẫn Sử Dụng API Scoring Engine

Dịch vụ chấm điểm tín dụng (Credit Scoring) chạy trên cổng **8000**.

## Thông Tin Kết Nối
- **Base URL**: `http://localhost:8000` (hoặc IP của server chứa Docker)
- **Endpoint**: `/score`
- **Method**: `POST`
- **Content-Type**: `application/json`

---

## 1. Request Body (English Fields)

Gửi định dạng JSON với các trường thông tin khách hàng như sau:

### Core Fields (Bắt buộc)

| Field Name | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `customer_name` | String | No | Customer name (for logging) | "Nguyen Van A" |
| `loan_amount` | Integer | **Yes** | Loan amount in VND | `100000000` |
| `annual_income` | Integer | **Yes** | Annual income in VND | `360000000` |
| `term` | String | Yes | Loan term | `"36 months"` or `"60 months"` |
| `interest_rate` | Float | Yes | Interest rate (%) | `12.5` |
| `home_ownership` | String | Yes | Housing status | `"Nhà chính chủ"`, `"Nhà thuê"`, `"Đang trả góp"` |
| `purpose` | String | Yes | Loan purpose | `"Mua ô tô"`, `"Kinh doanh"`, `"Sửa nhà"` |
| `region` | String | Yes | Living region | `"Miền Bắc"`, `"Miền Trung"`, `"Miền Nam"` |
| `employment_length` | String | No | Work experience | `"5 years"`, `"10+ years"`, `"< 1 year"` |
| `dti` | Float | No | Debt-to-Income ratio (%) | `15.5` |
| `inquiries_6m` | Integer | No | Credit inquiries in last 6 months | `0` (Good), `5` (Bad) |
| `revolving_balance` | Integer | No | Current credit card balance (VND) | `5000000` |
| `total_assets` | Integer | No | Total assets (VND) | `2000000000` |

### Advanced Fields (Optional)

| Field Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `verification_status` | String | "Not Verified" | Income verification (`Verified`, `Source Verified`, `Not Verified`) |
| `months_since_delinquency` | Integer | 0 | Months since last delinquency (0 = Never) |
| `open_accounts` | Integer | 5 | Number of open credit accounts |
| `total_accounts` | Integer | 10 | Total credit accounts ever held |
| `initial_list_status` | String | "f" | Loan listing status (`w` or `f`) |
| `earliest_credit_line` | String | "Jan-2020" | Earliest credit line date (Format: `Mon-YYYY`) |
| `issue_date` | String | "Jan-2024" | Expected disbursement date |

---

## 2. Example Request (JSON)

```json
{
    "customer_name": "Tran Van VIP",
    "loan_amount": 100000000,
    "annual_income": 1200000000,
    "term": "36 months",
    "interest_rate": 10.0,
    "employment_length": "10+ years",
    "home_ownership": "Nhà chính chủ",
    "purpose": "Mua ô tô",
    "region": "Miền Bắc",
    "dti": 5.0,
    "inquiries_6m": 0,
    "revolving_balance": 10000000,
    "total_assets": 5000000000,
    "verification_status": "Verified",
    "months_since_delinquency": 0,
    "open_accounts": 10,
    "total_accounts": 25,
    "earliest_credit_line": "Jan-2005"
}
```

---

## 3. Response

| Field | Type | Description |
| :--- | :--- | :--- |
| `credit_score` | Integer | Credit score (300 - 850). Higher is better. |
| `grade` | String | Credit grade (`A`, `B`, `C`, `D`, `E`, `F`). |
| `decision` | String | Suggested decision: `APPROVE`, `REVIEW`, `REJECT`. |
| `pd_percent` | Float | Probability of Default (%). |
| `ead_vnd` | Integer | Exposure at Default (VND). |
| `expected_loss_vnd` | Integer | Expected Loss (VND). |

### Example Response:
```json
{
    "status": "success",
    "data": {
        "credit_score": 745,
        "decision": "APPROVE",
        "ead_vnd": 65583598,
        "expected_loss_vnd": 952853,
        "grade": "A",
        "lgd_percent": 86.37,
        "pd_percent": 1.68
    }
}
```

---

## 4. How to Call API

### Curl (Command Line)
```bash
curl -X POST http://localhost:8000/score \
-H "Content-Type: application/json" \
-d '{
    "loan_amount": 50000000,
    "annual_income": 300000000,
    "purpose": "Mua sắm",
    "home_ownership": "Nhà thuê",
    "region": "Miền Nam"
}'
```

### Postman
1. Method: **POST**
2. URL: `http://localhost:8000/score`
3. Tab **Body** -> **raw** -> **JSON**
4. Paste JSON content
5. Click **Send**

---

## 5. Field Mapping Reference

| English Key | Vietnamese Key (Internal) |
| :--- | :--- |
| `customer_name` | `ten_khach_hang` |
| `loan_amount` | `so_tien_vay_vnd` |
| `annual_income` | `thu_nhap_nam_vnd` |
| `term` | `thoi_han` |
| `interest_rate` | `lai_suat` |
| `employment_length` | `kin_nghiem_lam_viec` |
| `home_ownership` | `nha_o` |
| `purpose` | `muc_dich` |
| `region` | `khu_vuc` |
| `dti` | `ti_le_no_tren_thu_nhap` |
| `inquiries_6m` | `so_lan_truy_van_6th` |
| `revolving_balance` | `so_du_no_vnd` |
| `total_assets` | `tong_tai_san_vnd` |
| `verification_status` | `tinh_trang_xac_minh` |
| `months_since_delinquency` | `thang_tu_lan_cham_tra_gan_nhat` |
| `open_accounts` | `so_tai_khoan_mo` |
| `total_accounts` | `tong_so_tai_khoan` |
| `initial_list_status` | `tinh_trang_niem_yet` |
| `earliest_credit_line` | `lich_su_tin_dung_tu` |
| `issue_date` | `ngay_phat_hanh_khoan_vay` |

> **Note:** API now accepts BOTH English and Vietnamese field names. You can mix them in a single request.

---

## 6. Model Assumptions & Pipeline Logic

### Adaptive Distribution Scaling
Hệ thống AI Credit Scoring này sử dụng phương pháp **Adaptive Distribution Scaling** ngầm ở phía Backend để tránh sai lệch phân phối (Out-of-Distribution Data) khi áp dụng mô hình huấn luyện ở thị trường quốc tế vào Việt Nam:
1. **Currency Exchange:** Thu nhập và khoản vay gửi lên qua API (bằng VND) sẽ được tự động chia cho tỷ giá cố định `USD_TO_VND = 26,500`. Tỷ giá này cố định thay vì real-time để đảm bảo tốc độ score model cao nhất và không phụ thuộc API thứ 3.
2. **Distribution Matching:** Do mặt bằng tài chính ở VN và US là khác nhau, service sẽ tự động nhân các biến thu nhập (`annual_inc`, `tot_cur_bal`) với `income_scaling_factor = 5.0` và nhân các biến khoản vay (`loan_amnt`, `revol_bal`) với `loan_scaling_factor = 2.0` để hệ thống binning hoạt động chính xác theo phân phối chuẩn.
*(Việc xử lý hoàn toàn khép kín trong `scoring_service.py`, Client Side không cần tác động thêm).*
