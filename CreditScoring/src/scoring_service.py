import pandas as pd
import numpy as np
import pickle
import os
import re
import sys
import logging
import statsmodels.api as sm

# Configure logger
logger = logging.getLogger(__name__)

class ScoringService:
    def __init__(self, artifacts_dir='artifacts'):
        self.usd_to_vnd = 26500
        self.income_scaling_factor = 5.0
        self.loan_scaling_factor = 2.0
        
        # Load artifacts
        pd_path = os.path.join(artifacts_dir, 'pd_model', 'scorecard.csv')
        self.scorecard = pd.read_csv(pd_path)
        
        ead_lgd_dir = os.path.join(artifacts_dir, 'ead_lgd_models')
        with open(os.path.join(ead_lgd_dir, 'preprocessor.pkl'), 'rb') as f:
            self.preprocessor = pickle.load(f)
        with open(os.path.join(ead_lgd_dir, 'ead_model.pkl'), 'rb') as f:
            self.ead_model = pickle.load(f)
        with open(os.path.join(ead_lgd_dir, 'lgd_logistic.pkl'), 'rb') as f:
            self.lgd_stage1 = pickle.load(f)
        with open(os.path.join(ead_lgd_dir, 'lgd_linear.pkl'), 'rb') as f:
            self.lgd_stage2 = pickle.load(f)

    def _map_input_to_model_format(self, input_data):
        """
        Map English API input fields to internal model format
        Supports both English field names (API) and Vietnamese (backward compatibility)
        """
        # Region mapping (English/Vietnamese -> US state codes)
        region_mapping = {
            # English
            'North': 'NY', 'Central': 'FL', 'South': 'CA',
            # Vietnamese (backward compatibility)
            'Miền Bắc': 'NY', 'Miền Trung': 'FL', 'Miền Nam': 'CA'
        }
        
        # Purpose mapping (English/Vietnamese -> US format)
        purpose_mapping = {
            # English
            'debt_consolidation': 'debt_consolidation',
            'credit_card': 'credit_card',
            'home_improvement': 'home_improvement',
            'major_purchase': 'major_purchase',
            'small_business': 'other',
            'car': 'car',
            'wedding': 'wedding',
            'medical': 'medical',
            'educational': 'educational',
            'vacation': 'vacation',
            'house': 'house',
            'other': 'other',
            # Vietnamese (backward compatibility)
            'Trả nợ': 'debt_consolidation',
            'Thẻ tín dụng': 'credit_card',
            'Sửa nhà': 'home_improvement',
            'Mua sắm': 'major_purchase',
            'Kinh doanh': 'other',
            'Mua ô tô': 'car',
            'Mua xe máy': 'major_purchase',
            'Đám cưới': 'wedding',
            'Y tế': 'medical',
            'Giáo dục': 'educational',
            'Du lịch': 'vacation',
            'Mua nhà': 'house',
            'Khác': 'other'
        }
        
        # Home ownership mapping
        home_ownership_mapping = {
            # English
            'RENT': 'RENT',
            'OWN': 'OWN',
            'MORTGAGE': 'MORTGAGE',
            # Vietnamese (backward compatibility)
            'Nhà thuê': 'RENT',
            'Nhà chính chủ': 'OWN',
            'Đang trả góp': 'MORTGAGE',
            'Ở cùng bố mẹ/người thân': 'OWN'
        }
        
        model_data = input_data.copy()
        
        # Map region (supports both 'region' and 'khu_vuc' for backward compatibility)
        region = input_data.get('region') or input_data.get('khu_vuc', 'South')
        model_data['addr_state'] = region_mapping.get(region, 'CA')
        
        # Map purpose (supports both 'purpose' and 'muc_dich' for backward compatibility)
        purpose = input_data.get('purpose') or input_data.get('muc_dich', 'other')
        model_data['purpose'] = purpose_mapping.get(purpose, 'other')
        
        # Map home ownership (supports both 'home_ownership' and 'nha_o' for backward compatibility)
        home_ownership = input_data.get('home_ownership') or input_data.get('nha_o', 'RENT')
        model_data['home_ownership'] = home_ownership_mapping.get(home_ownership, 'RENT')
        
        # Scale amounts from VND to USD (supports both English and Vietnamese field names)
        loan_amount = input_data.get('loan_amount') or input_data.get('so_tien_vay_vnd', 0)
        annual_income = input_data.get('annual_income') or input_data.get('thu_nhap_nam_vnd', 0)
        revolving_balance = input_data.get('revolving_balance') or input_data.get('so_du_no_vnd', 0)
        total_assets = input_data.get('total_assets') or input_data.get('tot_cur_bal') or input_data.get('tong_tai_san_vnd', 0)
        
        # Adaptive Scaling
        if loan_amount:
            model_data['loan_amnt'] = (loan_amount / self.usd_to_vnd) * self.loan_scaling_factor
            model_data['loan_amnt_real'] = loan_amount / self.usd_to_vnd
        if annual_income:
            model_data['annual_inc'] = (annual_income / self.usd_to_vnd) * self.income_scaling_factor
        if revolving_balance:
            model_data['revol_bal'] = (revolving_balance / self.usd_to_vnd) * self.loan_scaling_factor
        if total_assets:
            model_data['tot_cur_bal'] = (total_assets / self.usd_to_vnd) * self.income_scaling_factor
            
        return model_data

    def _bin_pd_features(self, data):
        bins = []
        # State
        state = data.get('addr_state', 'FL')
        state_bins = {'CA': 'addr_state_CA', 'TX': 'addr_state_TX', 'NY': 'addr_state_NY'}
        if state in state_bins: bins.append(state_bins[state])
        elif state in ['AL', 'NM', 'NJ']: bins.append('addr_state_AL_NM_NJ')
        elif state in ['AR', 'TN', 'MI', 'UT', 'VA', 'LA', 'PA', 'AZ', 'OH', 'RI', 'KY', 'DE', 'IN']: bins.append('addr_state_AR_TN_MI_UT_VA_LA_PA_AZ_OH_RI_KY_DE_IN')
        elif state in ['MA', 'SD', 'GA', 'MN', 'WI', 'WA', 'OR', 'IL', 'CT']: bins.append('addr_state_MA_SD_GA_MN_WI_WA_OR_IL_CT')
        elif state in ['MS', 'MT', 'SC', 'VT', 'KS', 'CO', 'AK', 'NH', 'WV', 'WY', 'ID', 'DC', 'ME']: bins.append('addr_state_MS_MT_SC_VT_KS_CO_AK_NH_WV_WY_ID_DC_ME')
        else: bins.append('addr_state_NE_IA_NV_HI_FL')

        # Inc
        inc = data.get('annual_inc', 0)
        if inc <= 20000: bins.append('annual_inc_<=20.0K')
        elif inc <= 40000: bins.append('annual_inc_20.0K-40.0K')
        elif inc <= 60000: bins.append('annual_inc_40.0K-60.0K')
        elif inc <= 75000: bins.append('annual_inc_60.0K-75.0K')
        elif inc <= 90000: bins.append('annual_inc_75.0K-90.0K')
        elif inc <= 120000: bins.append('annual_inc_90.0K-120.0K')
        elif inc <= 150000: bins.append('annual_inc_120.0K-150.0K')
        else: bins.append('annual_inc_>150.0K')

        # DTI
        dti = data.get('dti', 0)
        if dti <= 4: bins.append('dti_<=4.0')
        elif dti <= 8: bins.append('dti_4.0-8.0')
        elif dti <= 12: bins.append('dti_8.0-12.0')
        elif dti <= 16: bins.append('dti_12.0-16.0')
        elif dti <= 20: bins.append('dti_16.0-20.0')
        elif dti <= 28: bins.append('dti_20.0-28.0')
        else: bins.append('dti_>28.0')

        # Emp
        emp = data.get('emp_length_raw', 0)
        if emp == 0: bins.append('emp_length_0')
        elif 1 <= emp <= 3: bins.append('emp_length_1-3')
        elif 4 <= emp <= 6: bins.append('emp_length_4-6')
        elif 7 <= emp <= 9: bins.append('emp_length_7-9')
        else: bins.append('emp_length_10')

        # Home
        home = data.get('home_ownership', 'RENT')
        if home == 'MORTGAGE': bins.append('home_ownership_MORTGAGE')
        elif home == 'OWN': bins.append('home_ownership_OWN')
        else: bins.append('home_ownership_OTHER_NONE_RENT_ANY')

        # IR
        ir = data.get('int_rate', 15)
        if ir <= 7: bins.append('int_rate_<=7.0')
        elif ir <= 10: bins.append('int_rate_7.0-10.0')
        elif ir <= 12: bins.append('int_rate_10.0-12.0')
        elif ir <= 14: bins.append('int_rate_12.0-14.0')
        elif ir <= 16: bins.append('int_rate_14.0-16.0')
        elif ir <= 18: bins.append('int_rate_16.0-18.0')
        elif ir <= 22: bins.append('int_rate_18.0-22.0')
        else: bins.append('int_rate_>22.0')

        # Loan Amt
        amt = data.get('loan_amnt', 10000)
        if amt <= 7400: bins.append('loan_amnt_<=7.4K')
        elif amt <= 14300: bins.append('loan_amnt_7.4K-14.3K')
        elif amt <= 21200: bins.append('loan_amnt_14.3K-21.2K')
        elif amt <= 28100: bins.append('loan_amnt_21.2K-28.1K')
        else: bins.append('loan_amnt_>28.1K')

        # Purpose
        purp = data.get('purpose', 'other')
        if purp == 'credit_card': bins.append('purpose_credit_card')
        elif purp == 'debt_consolidation': bins.append('purpose_debt_consolidation')
        elif purp in ['other', 'house', 'medical', 'vacation']: bins.append('purpose_other_house_medical_vacation')
        elif purp in ['small_business', 'educational', 'renewable_energy', 'moving']: bins.append('purpose_small_business_educational_renewable_energy_moving')
        else: bins.append('purpose_wedding_home_improvement_major_purchase_car')

        # Inquiries (inq_last_6mths)
        inq = data.get('inq_last_6mths', 0)
        if inq == 0: bins.append('inq_last_6mths_0')
        elif inq == 1: bins.append('inq_last_6mths_1')
        elif inq == 2: bins.append('inq_last_6mths_2')
        elif inq == 3: bins.append('inq_last_6mths_3')
        else: bins.append('inq_last_6mths_4-33')

        # Delinquency (mths_since_last_delinq)
        msld = data.get('mths_since_last_delinq', 0)
        if msld == 0: bins.append('mths_since_last_delinq_never_delinquent') # Assumption: 0 means never
        elif msld <= 4: bins.append('mths_since_last_delinq_<=4.0')
        elif msld <= 7: bins.append('mths_since_last_delinq_4.0-7.0')
        elif msld <= 22: bins.append('mths_since_last_delinq_7.0-22.0')
        elif msld <= 37: bins.append('mths_since_last_delinq_22.0-37.0')
        elif msld <= 74: bins.append('mths_since_last_delinq_37.0-74.0')
        else: bins.append('mths_since_last_delinq_>74.0')

        # Revolving Balance (revol_bal)
        rb = data.get('revol_bal', 0)
        if rb <= 2000: bins.append('revol_bal_<=2.0K')
        elif rb <= 6000: bins.append('revol_bal_2.0K-6.0K')
        elif rb <= 12000: bins.append('revol_bal_6.0K-12.0K')
        elif rb <= 22000: bins.append('revol_bal_12.0K-22.0K')
        elif rb <= 30000: bins.append('revol_bal_22.0K-30.0K')
        elif rb <= 36000: bins.append('revol_bal_30.0K-36.0K')
        elif rb <= 40000: bins.append('revol_bal_36.0K-40.0K')
        else: bins.append('revol_bal_>40.0K')

        # Open Accounts (open_acc)
        oa = data.get('open_acc', 5)
        if oa <= 6: bins.append('open_acc_<=6.0')
        elif oa <= 12: bins.append('open_acc_6.0-12.0')
        elif oa <= 21: bins.append('open_acc_12.0-21.0')
        else: bins.append('open_acc_>21.0')

        # Initial List Status
        ils = data.get('initial_list_status', 'f')
        if ils == 'w': bins.append('initial_list_status_w')
        else: bins.append('initial_list_status_f')

        # Credit History Length (mths_since_earliest_cr_line)
        mec = data.get('mths_since_earliest_cr_line', 100)
        if mec <= 151: bins.append('mths_since_earliest_cr_line_<=151.0')
        elif mec <= 226: bins.append('mths_since_earliest_cr_line_151.0-226.0')
        elif mec <= 276: bins.append('mths_since_earliest_cr_line_226.0-276.0')
        elif mec <= 401: bins.append('mths_since_earliest_cr_line_276.0-401.0')
        else: bins.append('mths_since_earliest_cr_line_>401.0')

        # Verification Status
        vstatus = data.get('verification_status', 'Not Verified')
        if vstatus == 'Not Verified': bins.append('verification_status_Not Verified')
        elif vstatus == 'Source Verified': bins.append('verification_status_Source Verified')
        else: bins.append('verification_status_Verified')

        # Total Current Balance (tot_cur_bal)
        tcb = data.get('tot_cur_bal', 0)
        if tcb <= 80000: bins.append('tot_cur_bal_<=80.0K')
        elif tcb <= 140000: bins.append('tot_cur_bal_80.0K-140.0K')
        elif tcb <= 200000: bins.append('tot_cur_bal_140.0K-200.0K')
        elif tcb <= 240000: bins.append('tot_cur_bal_200.0K-240.0K')
        elif tcb <= 280000: bins.append('tot_cur_bal_240.0K-280.0K')
        elif tcb <= 340000: bins.append('tot_cur_bal_280.0K-340.0K')
        elif tcb <= 400000: bins.append('tot_cur_bal_340.0K-400.0K')
        else: bins.append('tot_cur_bal_>400.0K')

        return bins

    def predict(self, vn_input):
        logger.info(f"=== SCORING REQUEST ===")
        logger.info(f"Input data: {vn_input}")
        
        # 1. Mapping & Scaling
        data_model = self._map_input_to_model_format(vn_input)
        logger.info(f"After mapping - loan_amnt: {data_model.get('loan_amnt')}, annual_inc: {data_model.get('annual_inc')}, addr_state: {data_model.get('addr_state')}")
        
        # 2. Metadata Assignment - support both Fineract API names and friendly English names
        data_model['term'] = vn_input.get('term') or vn_input.get('thoi_han', '36 months')
        data_model['int_rate'] = vn_input.get('int_rate') or vn_input.get('interest_rate') or vn_input.get('lai_suat', 15.0)
        data_model['verification_status'] = vn_input.get('verification_status') or vn_input.get('tinh_trang_xac_minh', 'Not Verified')
        data_model['dti'] = vn_input.get('dti') or vn_input.get('ti_le_no_tren_thu_nhap', 15.0)
        data_model['inq_last_6mths'] = vn_input.get('inq_last_6mths') or vn_input.get('inquiries_6m') or vn_input.get('so_lan_truy_van_6th', 0)
        data_model['mths_since_last_delinq'] = vn_input.get('mths_since_last_delinq') or vn_input.get('delinq_2yrs') or vn_input.get('thang_tu_lan_cham_tra_gan_nhat', 0)
        data_model['open_acc'] = vn_input.get('open_acc') or vn_input.get('open_accounts') or vn_input.get('so_tai_khoan_mo', 5)
        data_model['total_acc'] = vn_input.get('total_acc') or vn_input.get('total_accounts') or vn_input.get('tong_so_tai_khoan', 10)
        data_model['revol_bal'] = vn_input.get('revol_bal') or data_model.get('revol_bal', 0)
        data_model['tot_cur_bal'] = vn_input.get('tot_cur_bal') or data_model.get('tot_cur_bal', 0)
        data_model['initial_list_status'] = vn_input.get('initial_list_status') or vn_input.get('tinh_trang_niem_yet', 'f')
        data_model['earliest_cr_line'] = vn_input.get('earliest_cr_line') or vn_input.get('lich_su_tin_dung_tu', 'Jan-2020')
        data_model['issue_d'] = vn_input.get('issue_d') or vn_input.get('ngay_phat_hanh_khoan_vay', 'Jan-2024')
        
        emp_str = str(vn_input.get('emp_length') or vn_input.get('employment_length') or vn_input.get('kin_nghiem_lam_viec', '1 year'))
        if '< 1 year' in emp_str: data_model['emp_length_raw'] = 0
        else:
            match = re.search(r'(\d+)', emp_str)
            data_model['emp_length_raw'] = int(match.group(1)) if match else 0
        
        logger.info(f"Model data: term={data_model['term']}, int_rate={data_model['int_rate']}, dti={data_model['dti']}, emp_length={data_model['emp_length_raw']}")

        # 3. PD & Score Calculation
        pd_bins = self._bin_pd_features(data_model)
        logger.info(f"PD Bins matched: {pd_bins}")
        
        total_score = self.scorecard.loc[self.scorecard['Dummy'] == 'const', 'Score'].values[0]
        total_beta = self.scorecard.loc[self.scorecard['Dummy'] == 'const', 'Beta Coefficient'].values[0]
        logger.info(f"Base score (const): {total_score:.2f}, Base beta: {total_beta:.4f}")
        
        score_breakdown = []
        for b in pd_bins:
            match = self.scorecard[self.scorecard['Dummy'] == b]
            if not match.empty:
                score_add = match['Score'].values[0]
                beta_add = match['Beta Coefficient'].values[0]
                total_score += score_add
                total_beta += beta_add
                score_breakdown.append(f"{b}: +{score_add:.1f}")
        
        logger.info(f"Score breakdown: {score_breakdown}")
        logger.info(f"Total score after bins: {total_score:.2f}")
                
        pd_good = 1 / (1 + np.exp(-total_beta))
        pd_val = 1 - pd_good
        
        # 4. Grading (Pass 1)
        if total_score >= 600: grade = 'A'
        elif total_score >= 550: grade = 'B'
        elif total_score >= 500: grade = 'C'
        elif total_score >= 450: grade = 'D'
        elif total_score >= 400: grade = 'E'
        else: grade = 'F'
        
        sub_grade = grade + '1' # Simplistic assignment
        
        # 4.1. Refine Score with SubGrade (Pass 2)
        # Map sub_grade to dummy bucket
        sg_bin = None
        if grade == 'A': 
            sg_bin = 'sub_grade_A3_A2_A1' # A1 falls here
        elif grade == 'B':
            sg_bin = 'sub_grade_B2_B1' # B1 falls here
        elif grade == 'C':
            sg_bin = 'sub_grade_C2_C1_B5' # C1 falls here
        elif grade == 'D':
            sg_bin = 'sub_grade_D3_D2_D1' # D1 falls here
        elif grade == 'E':
            sg_bin = 'sub_grade_E1_D5_D4' # E1 falls here
        # F grades usually reference category so no points added or handled by default
        
        if sg_bin:
            match = self.scorecard[self.scorecard['Dummy'] == sg_bin]
            if not match.empty:
                total_score += match['Score'].values[0]
                total_beta += match['Beta Coefficient'].values[0]
                
        # Recalculate PD with new beta
        pd_good = 1 / (1 + np.exp(-total_beta))
        pd_val = 1 - pd_good
        
        # Re-evaluate Grade (Optional, but score changed)
        if total_score >= 600: grade = 'A'
        elif total_score >= 550: grade = 'B'
        elif total_score >= 500: grade = 'C'
        elif total_score >= 450: grade = 'D'
        elif total_score >= 400: grade = 'E'
        else: grade = 'F'
        
        data_model['grade'] = grade
        data_model['sub_grade'] = grade + '1'

        # 5. EAD & LGD Models
        df_for_ai = pd.DataFrame([data_model])
        state_to_region = {
            'ME': 'Northeast', 'NH': 'Northeast', 'VT': 'Northeast', 'MA': 'Northeast', 'RI': 'Northeast', 'CT': 'Northeast', 'NY': 'Northeast', 'NJ': 'Northeast', 'PA': 'Northeast',
            'OH': 'Midwest', 'MI': 'Midwest', 'IN': 'Midwest', 'IL': 'Midwest', 'WI': 'Midwest', 'MN': 'Midwest', 'IA': 'Midwest', 'MO': 'Midwest', 'ND': 'Midwest', 'SD': 'Midwest', 'NE': 'Midwest', 'KS': 'Midwest',
            'DE': 'South', 'MD': 'South', 'VA': 'South', 'WV': 'South', 'KY': 'South', 'NC': 'South', 'SC': 'South', 'TN': 'South', 'GA': 'South', 'FL': 'South', 'AL': 'South', 'MS': 'South', 'AR': 'South', 'LA': 'South', 'TX': 'South', 'OK': 'South',
            'MT': 'West', 'ID': 'West', 'WY': 'West', 'CO': 'West', 'NM': 'West', 'AZ': 'West', 'UT': 'West', 'NV': 'West', 'WA': 'West', 'OR': 'West', 'CA': 'West', 'AK': 'West', 'HI': 'West', 'DC': 'Northeast',
        }
        df_for_ai['region'] = df_for_ai['addr_state'].replace(state_to_region)
        df_for_ai['home_ownership'] = df_for_ai['home_ownership'].replace(['RENT', 'NONE', 'OTHER', 'ANY'], 'RENT_NONE_OTHER')
        df_for_ai['purpose'] = df_for_ai['purpose'].replace(['educational', 'renewable_energy'], 'other')
        df_for_ai['purpose'] = df_for_ai['purpose'].replace(['vacation', 'moving', 'wedding'], 'vacation_moving_wedding')
        df_for_ai['purpose'] = df_for_ai['purpose'].replace(['house', 'car', 'medical'], 'house_car_medical')
        df_for_ai['emp_length'] = data_model['emp_length_raw']
        
        try:
            issue_d_dt = pd.to_datetime(data_model['issue_d'], format='%b-%Y')
            earliest_cr_dt = pd.to_datetime(data_model['earliest_cr_line'], format='%b-%Y')
            df_for_ai['mths_since_earliest_cr_line'] = (issue_d_dt - earliest_cr_dt).days / 30
        except:
            df_for_ai['mths_since_earliest_cr_line'] = 120
            
        nominal = ['term', 'region', 'initial_list_status', 'purpose', 'verification_status', 'home_ownership']
        ordinal = ['grade', 'sub_grade']
        numerical = ['loan_amnt', 'int_rate', 'emp_length', 'annual_inc', 'dti', 'inq_last_6mths', 
                     'mths_since_last_delinq', 'open_acc', 'revol_bal', 'total_acc', 'tot_cur_bal', 
                     'mths_since_earliest_cr_line']
        
        X_test_ai = df_for_ai[nominal + ordinal + numerical]
        X_prepared = self.preprocessor.transform(X_test_ai)
        X_df = pd.DataFrame(X_prepared)
        X_const = sm.add_constant(X_df, has_constant='add')
        
        # EAD
        ccf = self.ead_model.predict(X_const)[0]
        ccf = np.clip(ccf, 0, 1)
        ead_usd = data_model['loan_amnt_real'] * ccf
        
        # LGD
        recovery_prob = self.lgd_stage1.model.predict(X_const)[0] 
        recovery_rate = self.lgd_stage2.predict(X_const)[0] if recovery_prob > 0.5 else 0
        lgd_val = 1 - np.clip(recovery_rate, 0, 1)
        
        # EL
        el_vnd = (pd_val * ead_usd * lgd_val) * self.usd_to_vnd
        
        # Status Decision
        if total_score < 450 or pd_val > 0.35: decision = 'REJECT'
        elif total_score < 530: decision = 'REVIEW'
        else: decision = 'APPROVE'
        
        result = {
            'credit_score': int(total_score),
            'grade': grade,
            'pd_percent': round(pd_val * 100, 2),
            'ead_vnd': round(ead_usd * self.usd_to_vnd),
            'lgd_percent': round(lgd_val * 100, 2),
            'expected_loss_vnd': round(el_vnd),
            'decision': decision
        }
        
        logger.info(f"=== SCORING RESULT ===")
        logger.info(f"Credit Score: {result['credit_score']}, Grade: {result['grade']}, Decision: {result['decision']}")
        logger.info(f"PD: {result['pd_percent']}%, LGD: {result['lgd_percent']}%, EAD: {result['ead_vnd']:,} VND")
        logger.info(f"Expected Loss: {result['expected_loss_vnd']:,} VND")
        
        return result
