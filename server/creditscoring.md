# Hướng Dẫn Tích Hợp Credit Scoring Thay Thế Cho ML Scorecard

Tài liệu này hướng dẫn cách tích hợp Credit Scoring service thay thế cho **ML scorecard cũ** trong Fineract.

**QUAN TRỌNG:** Credit Scoring chỉ thay thế ML scorecard cũ, **KHÔNG ảnh hưởng** đến:
- **Rule-based scorecard** (vẫn hoạt động bình thường)

Fineract hỗ trợ 2 loại scoring methods chính:
1. **ruleBased** - Rule-based scorecard (giữ nguyên, không thay đổi)
2. **ml** - Machine Learning scorecard (thay thế bằng Credit Scoring mới)

## ⚠️ Các Lỗi Quan Trọng Đã Được Sửa

Tài liệu này đã được cập nhật để sửa các lỗi nghiêm trọng sau:

### 1. ✅ Docker Network
- **Lỗi:** Chạy 2 services riêng biệt không thể giao tiếp (khác network)
- **Sửa:** Hướng dẫn dùng external network hoặc gộp chung vào 1 file docker-compose.yml

### 2. ✅ JSON Mapping camelCase vs snake_case
- **Lỗi:** Web App gửi snake_case (`loan_amount`) nhưng Fineract nhận camelCase (`loanAmnt`) → null data
- **Sửa:** Web App phải gửi camelCase, Fineract tự convert sang snake_case khi gọi Python API

### 3. ✅ Mapping sai delinq2yrs
- **Lỗi:** Map "số lần chậm trả" (count) thành "thời gian" (time) - sai logic nghiêm trọng
- **Sửa:** Bỏ mapping này, để Python model xử lý missing value

### 4. ✅ Regex Format employment_length
- **Lỗi:** Regex xóa dấu chấm (`1.5 years` → `15 years`) và dấu + (`10+` → `10`)
- **Sửa:** Regex thông minh hơn, giữ số thập phân và dấu +

### 5. ✅ Liquibase Migration
- **Lỗi:** Dùng SQL trực tiếp → không chạy khi deploy môi trường mới
- **Sửa:** Tạo Liquibase changelog XML đúng chuẩn Fineract

### 6. ✅ DTO Mapping
- **Lỗi:** API không trả về field mới vì thiếu DTO mapping
- **Sửa:** Hướng dẫn extend DTO và mapper từ Entity sang DTO

### 7. ✅ Hardcode Region
- **Lỗi:** Hardcode "south" → điểm tín dụng sai cho user miền khác
- **Sửa:** Extract từ client address hoặc office location

## Tổng Quan

Credit Scoring service là một dịch vụ độc lập chạy trên port 8000, cung cấp API để đánh giá rủi ro tín dụng sử dụng mô hình machine learning. **Credit Scoring thay thế ML scorecard cũ**, nhưng **giữ nguyên rule-based scorecard**.

### Các Scoring Methods trong Fineract

Fineract hỗ trợ 2 loại scoring methods chính, có thể chọn khi gọi API:

| Method | Mô tả | Trạng thái |
|--------|-------|------------|
| `ruleBased` | Rule-based scorecard (dựa trên rules/criteria) | **Giữ nguyên**, không thay đổi |
| `ml` | Machine Learning scorecard | **Thay thế** bằng Credit Scoring mới |

**Ví dụ gọi API:**
```bash
# Dùng Rule-based (giữ nguyên)
POST /api/v1/creditScorecard/loans/{loanId}/assess?scoringMethod=ruleBased

# Dùng Credit Scoring mới (thay thế ML cũ)
POST /api/v1/creditScorecard/loans/{loanId}/assess?scoringMethod=ml
```

## Kiến Trúc

```
Fineract Backend → Credit Scoring API (port 8000) → ML Model → Kết quả đánh giá
```

## Các Bước Tích Hợp

### Bước 1: Cấu Hình Docker Network

**QUAN TRỌNG:** Nếu chạy 2 services trong 2 thư mục riêng, cần dùng **external network** để chúng có thể giao tiếp.

**Cách 1: Dùng External Network (Khuyến nghị)**

1. Tạo network chung trước:
```bash
docker network create shared-network
```

2. Sửa `docker-compose.yml` của Fineract:
```yaml
services:
  fineract:
    # ... existing config ...
    networks:
      - shared-network
    depends_on:
      - creditscoring

  creditscoring:
    build: ../CreditScoring
    container_name: creditscoring
    ports:
      - "8000:8000"
    volumes:
      - ../CreditScoring:/app
    environment:
      - PYTHONUNBUFFERED=1
    networks:
      - shared-network
    restart: unless-stopped

networks:
  shared-network:
    external: true
    name: shared-network
```

3. Sửa `docker-compose.yml` của CreditScoring:
```yaml
services:
  creditscoring:
    build: .
    container_name: creditscoring
    ports:
      - "8000:8000"
    networks:
      - shared-network

networks:
  shared-network:
    external: true
    name: shared-network
```

**Cách 2: Gộp chung vào 1 file docker-compose.yml (Đơn giản hơn)**

Thêm Credit Scoring service vào `docker-compose.yml` của Fineract:

```yaml
services:
  fineract:
    # ... existing config ...
    networks:
      - fineract-network
    depends_on:
      - creditscoring

  creditscoring:
    build: ../CreditScoring
    container_name: creditscoring
    ports:
      - "8000:8000"
    volumes:
      - ../CreditScoring:/app
    environment:
      - PYTHONUNBUFFERED=1
    networks:
      - fineract-network
    restart: unless-stopped

networks:
  fineract-network:
    driver: bridge
```

**Lưu ý:** Nếu chạy riêng biệt, phải dùng Cách 1 (external network) để 2 containers có thể giao tiếp.

### Bước 2: Cấu Hình Application Properties

Cập nhật file `application.properties` hoặc environment variables trong `docker-compose.yml`:

```properties
# Credit Scoring Service Configuration
fineract.credit-scorecard.base-url=http://creditscoring:8000
fineract.credit-scorecard.api-version=v1
fineract.credit-scorecard.connect-timeout=5000
fineract.credit-scorecard.read-timeout=10000
```

Hoặc trong `docker-compose.yml`:

```yaml
environment:
  FINERACT_CREDIT_SCORECARD_BASE_URL: "http://creditscoring:8000"
  FINERACT_CREDIT_SCORECARD_API_VERSION: "v1"
  FINERACT_CREDIT_SCORECARD_CONNECT_TIMEOUT: "5000"
  FINERACT_CREDIT_SCORECARD_READ_TIMEOUT: "10000"
```

### Bước 3: Sửa Đổi CreditScorecardHttpClient

Cập nhật `CreditScorecardHttpClient.java` để gọi Credit Scoring API thay vì scorecard API cũ:

**File:** `fineract-provider/src/main/java/org/apache/fineract/portfolio/creditscorecard/service/CreditScorecardHttpClient.java`

#### 3.1. Sửa phương thức `buildApiUri`:

```java
private URI buildApiUri(CreditScoreRequest request) {
    // Thay đổi endpoint từ /api/v1/algorithms/predict sang /score
    return UriComponentsBuilder.fromUriString(config.getBaseUrl())
            .path("/score")  // Endpoint mới của Credit Scoring API
            .toUri();
}
```

#### 3.2. Sửa phương thức `predictCreditScore` để map dữ liệu:

```java
public CreditScoreResponse predictCreditScore(CreditScoreRequest request) {
    URI uri = buildApiUri(request);
    HttpHeaders headers = createHeaders();
    
    // Map MLScorecardFields to Credit Scoring API format (English field names)
    Map<String, Object> body = mapToCreditScoringRequest(request.getFeatures());
    
    String jsonBody;
    try {
        jsonBody = objectMapper.writeValueAsString(body);
        log.debug("Serialized JSON body: {}", jsonBody);
    } catch (Exception e) {
        log.error("Failed to serialize request body to JSON: {}", e.getMessage(), e);
        throw new CreditScorecardServiceException("Failed to serialize request body to JSON: " + e.getMessage(), e);
    }
    
    HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
    try {
        log.info("Sending credit score prediction request to {} with JSON body: {}", uri, jsonBody);
        ResponseEntity<Map> response = creditScorecardRestTemplate.exchange(
                uri, HttpMethod.POST, entity, Map.class);
        return mapCreditScoringResponse(response.getBody());
    } catch (HttpServerErrorException e) {
        String errorMessage = extractErrorMessage(e);
        log.error("Error calling Credit Scoring service at {}: Status={}, Message={}, ResponseBody={}", 
                uri, e.getStatusCode(), e.getMessage(), e.getResponseBodyAsString());
        throw new CreditScorecardServiceException(
                String.format("Failed to call Credit Scoring service: %s. %s", 
                        e.getStatusCode(), errorMessage), e);
    } catch (RestClientException e) {
        log.error("Error calling Credit Scoring service at {}: {}", uri, e.getMessage(), e);
        throw new CreditScorecardServiceException(
                "Failed to call Credit Scoring service: " + e.getMessage(), e);
    }
}
```

#### 3.3. Thêm phương thức map request (sử dụng biến tiếng Anh):

```java
/**
 * Map MLScorecardFields to Credit Scoring API format
 * All field names are in English
 */
private Map<String, Object> mapToCreditScoringRequest(MLScorecardFields mlFields) {
    Map<String, Object> request = new HashMap<>();
    
    // Required fields (English field names)
    if (mlFields.getLoanAmnt() != null) {
        request.put("loan_amount", mlFields.getLoanAmnt().longValue());
    }
    if (mlFields.getAnnualInc() != null) {
        request.put("annual_income", mlFields.getAnnualInc().longValue());
    }
    if (mlFields.getTerm() != null) {
        // Auto-format: chỉ nhập số -> tự thêm " months"
        request.put("term", formatTerm(mlFields.getTerm()));
    }
    if (mlFields.getIntRate() != null) {
        request.put("interest_rate", mlFields.getIntRate().doubleValue());
    }
    
    // Map home_ownership (English values)
    String homeOwnership = mapHomeOwnership(mlFields.getHomeOwnership());
    if (homeOwnership != null) {
        request.put("home_ownership", homeOwnership);
    }
    
    // Map purpose (English values)
    String purpose = mapPurpose(mlFields.getPurpose());
    if (purpose != null) {
        request.put("purpose", purpose);
    }
    
    // Map region - PHẢI extract từ client address, KHÔNG hardcode
    String region = extractRegionFromLoan(loan);
    request.put("region", region); // Options: "north", "central", "south"
    
    // Optional fields (English field names)
    if (mlFields.getEmpLength() != null) {
        // Auto-format: chỉ nhập số -> tự thêm " years"
        request.put("employment_length", formatEmploymentLength(mlFields.getEmpLength()));
    }
    if (mlFields.getDti() != null) {
        request.put("dti", mlFields.getDti().doubleValue());
    }
    if (mlFields.getInqLast6mths() != null) {
        request.put("inquiries_6m", mlFields.getInqLast6mths());
    }
    if (mlFields.getRevolBal() != null) {
        request.put("revolving_balance", mlFields.getRevolBal().longValue());
    }
    if (mlFields.getTotCurBal() != null) {
        request.put("total_assets", mlFields.getTotCurBal().longValue());
    }
    if (mlFields.getVerificationStatus() != null) {
        request.put("verification_status", mlFields.getVerificationStatus());
    }
    // LƯU Ý QUAN TRỌNG: delinq2yrs là SỐ LẦN chậm trả, KHÔNG PHẢI thời gian
    // Không thể map delinq2yrs (count) sang months_since_delinquency (time)
    // Nếu Fineract không có field months_since_delinquency, bỏ qua trường này
    // Python model sẽ xử lý missing value
    // if (mlFields.getDelinq2yrs() != null) {
    //     // KHÔNG map - đây là lỗi logic nghiêm trọng
    //     // delinq2yrs = số lần chậm trả (count)
    //     // months_since_delinquency = thời gian từ lần chậm trả gần nhất (time)
    // }
    
    // Nếu có field months_since_delinquency riêng trong MLScorecardFields, dùng nó:
    // if (mlFields.getMonthsSinceDelinquency() != null) {
    //     request.put("months_since_delinquency", mlFields.getMonthsSinceDelinquency());
    // }
    if (mlFields.getOpenAcc() != null) {
        request.put("open_accounts", mlFields.getOpenAcc());
    }
    if (mlFields.getTotalAcc() != null) {
        request.put("total_accounts", mlFields.getTotalAcc());
    }
    
    return request;
}

/**
 * Map home_ownership from Fineract format to Credit Scoring format
 * Returns English values: "rent", "own", "mortgage"
 */
private String mapHomeOwnership(String fineractValue) {
    if (fineractValue == null) {
        return "rent";
    }
    String lower = fineractValue.toLowerCase();
    if (lower.contains("rent") || lower.contains("thuê")) {
        return "rent";
    } else if (lower.contains("own") || lower.contains("chính chủ")) {
        return "own";
    } else if (lower.contains("mortgage") || lower.contains("trả góp")) {
        return "mortgage";
    }
    return "rent"; // Default
}

/**
 * Map purpose from Fineract format to Credit Scoring format
 * Returns English values: "car", "small_business", "home_improvement", etc.
 */
private String mapPurpose(String fineractValue) {
    if (fineractValue == null) {
        return "major_purchase";
    }
    String lower = fineractValue.toLowerCase();
    if (lower.contains("car") || lower.contains("ô tô") || lower.contains("xe")) {
        return "car";
    } else if (lower.contains("business") || lower.contains("kinh doanh")) {
        return "small_business";
    } else if (lower.contains("home") && lower.contains("improvement")) {
        return "home_improvement";
    } else if (lower.contains("debt")) {
        return "debt_consolidation";
    } else if (lower.contains("major") || lower.contains("purchase")) {
        return "major_purchase";
    }
    return "major_purchase"; // Default
}

/**
 * Format term: chỉ nhập số -> tự thêm " months"
 * Input: "36" hoặc "36 months" -> Output: "36 months"
 */
private String formatTerm(String term) {
    if (term == null || term.trim().isEmpty()) {
        return "36 months"; // Default
    }
    
    String trimmed = term.trim();
    
    // Nếu đã có "months" rồi thì giữ nguyên
    if (trimmed.toLowerCase().contains("months")) {
        return trimmed;
    }
    
    // Extract số từ string (có thể có ký tự khác)
    String numberStr = trimmed.replaceAll("[^0-9]", "");
    if (numberStr.isEmpty()) {
        return "36 months"; // Default nếu không có số
    }
    
    try {
        int months = Integer.parseInt(numberStr);
        return months + " months";
    } catch (NumberFormatException e) {
        return "36 months"; // Default nếu parse fail
    }
}

/**
 * Format employment_length: chỉ nhập số -> tự thêm " years"
 * Input: "5" hoặc "5 years" -> Output: "5 years"
 * Input: "10+" -> Output: "10+ years"
 * Input: "< 1" -> Output: "< 1 year"
 * 
 * LƯU Ý: Regex phải cẩn thận để không làm mất dấu chấm thập phân hoặc dấu +
 */
private String formatEmploymentLength(String empLength) {
    if (empLength == null || empLength.trim().isEmpty()) {
        return "< 1 year"; // Default
    }
    
    String trimmed = empLength.trim();
    
    // Nếu đã có "year" hoặc "years" rồi thì giữ nguyên
    if (trimmed.toLowerCase().contains("year")) {
        return trimmed;
    }
    
    // Xử lý các trường hợp đặc biệt TRƯỚC khi extract số
    if (trimmed.startsWith("<")) {
        return "< 1 year";
    }
    
    if (trimmed.contains("+")) {
        // Giữ nguyên dấu +, chỉ extract số trước dấu +
        String[] parts = trimmed.split("\\+");
        if (parts.length > 0) {
            String numberStr = parts[0].trim().replaceAll("[^0-9.]", "");
            if (!numberStr.isEmpty()) {
                return numberStr + "+ years";
            }
        }
    }
    
    // Extract số (bao gồm cả số thập phân)
    // Regex: lấy số và dấu chấm, không xóa dấu chấm
    String numberStr = trimmed.replaceAll("[^0-9.]", "");
    if (numberStr.isEmpty()) {
        return "< 1 year"; // Default
    }
    
    try {
        // Kiểm tra nếu là số thập phân
        if (numberStr.contains(".")) {
            double years = Double.parseDouble(numberStr);
            if (years < 1) {
                return "< 1 year";
            } else if (years == 1) {
                return "1 year";
            } else {
                return String.format("%.1f years", years);
            }
        } else {
            int years = Integer.parseInt(numberStr);
            if (years == 1) {
                return "1 year";
            } else {
                return years + " years";
            }
        }
    } catch (NumberFormatException e) {
        return "< 1 year"; // Default
    }
}
```

#### 3.4. Thêm phương thức map response (bao gồm đầy đủ thông tin):

```java
/**
 * Map response từ Credit Scoring API sang CreditScoreResponse
 * Lưu đầy đủ thông tin: credit_score, grade, expected_loss, ead, lgd
 */
private CreditScoreResponse mapCreditScoringResponse(Map<String, Object> responseBody) {
    if (responseBody == null || !"success".equals(responseBody.get("status"))) {
        throw new CreditScorecardServiceException("Credit Scoring API returned error: " + responseBody);
    }
    
    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
    if (data == null) {
        throw new CreditScorecardServiceException("Credit Scoring API response missing data field");
    }
    
    // Extract all values from response
    Integer creditScore = data.get("credit_score") != null ? 
        ((Number) data.get("credit_score")).intValue() : null;
    String decision = (String) data.get("decision");
    Double pdPercent = data.get("pd_percent") != null ? 
        ((Number) data.get("pd_percent")).doubleValue() : 0.0;
    String grade = (String) data.get("grade");
    Long expectedLossVnd = data.get("expected_loss_vnd") != null ? 
        ((Number) data.get("expected_loss_vnd")).longValue() : null;
    Long eadVnd = data.get("ead_vnd") != null ? 
        ((Number) data.get("ead_vnd")).longValue() : null;
    Double lgdPercent = data.get("lgd_percent") != null ? 
        ((Number) data.get("lgd_percent")).doubleValue() : null;
    
    // Map decision to label
    String label = "APPROVE";
    if ("REJECT".equalsIgnoreCase(decision)) {
        label = "REJECT";
    } else if ("REVIEW".equalsIgnoreCase(decision)) {
        label = "REVIEW";
    }
    
    // Convert PD from percentage to decimal
    BigDecimal probability = BigDecimal.valueOf(pdPercent / 100.0);
    
    // Log additional information
    log.info("Credit Scoring result - Score: {}, Grade: {}, Decision: {}, PD: {}%, Expected Loss: {} VND, EAD: {} VND, LGD: {}%",
            creditScore, grade, decision, pdPercent, expectedLossVnd, eadVnd, lgdPercent);
    
    // Create response
    CreditScoreResponse response = CreditScoreResponse.builder()
            .label(label)
            .probability(probability)
            .requestId(UUID.randomUUID().toString())
            .method("creditScoring")
            .build();
    
    // Lưu full response data vào instance variable để CreditScorecardWritePlatformServiceImpl có thể lấy
    // (Cần thêm field trong CreditScorecardHttpClient)
    this.lastFullResponseData = data;
    
    return response;
}

// Thêm field và method trong CreditScorecardHttpClient để lưu full response
private Map<String, Object> lastFullResponseData;

public Map<String, Object> getLastFullResponseData() {
    return lastFullResponseData;
}
```

**Lưu ý:** Để lưu đầy đủ thông tin (credit_score, grade, expected_loss_vnd, ead_vnd, lgd_percent), bạn cần:

1. **Extend `MLScorecard` domain để thêm các field mới:**
```java
// Trong MLScorecard.java
@Column(name = "credit_score")
private Integer creditScore;

@Column(name = "grade", length = 1)
private String grade;

@Column(name = "expected_loss_vnd", scale = 6, precision = 19)
private BigDecimal expectedLossVnd;

@Column(name = "ead_vnd", scale = 6, precision = 19)
private BigDecimal eadVnd;

@Column(name = "lgd_percent", scale = 6, precision = 19)
private BigDecimal lgdPercent;

// Getters and setters...
```

2. **Tạo Liquibase Changelog (QUAN TRỌNG - Fineract dùng Liquibase, không dùng SQL trực tiếp):**

Tạo file: `fineract-provider/src/main/resources/db/changelog/tenant/parts/XXXX_add_credit_scoring_fields.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="XXXX-add-credit-scoring-fields" author="your-name">
        <comment>Add credit scoring fields to m_ml_scorecard table</comment>
        
        <addColumn tableName="m_ml_scorecard">
            <column name="credit_score" type="INT">
                <constraints nullable="true"/>
            </column>
        </addColumn>
        
        <addColumn tableName="m_ml_scorecard">
            <column name="grade" type="VARCHAR(1)">
                <constraints nullable="true"/>
            </column>
        </addColumn>
        
        <addColumn tableName="m_ml_scorecard">
            <column name="expected_loss_vnd" type="DECIMAL(19,6)">
                <constraints nullable="true"/>
            </column>
        </addColumn>
        
        <addColumn tableName="m_ml_scorecard">
            <column name="ead_vnd" type="DECIMAL(19,6)">
                <constraints nullable="true"/>
            </column>
        </addColumn>
        
        <addColumn tableName="m_ml_scorecard">
            <column name="lgd_percent" type="DECIMAL(19,6)">
                <constraints nullable="true"/>
            </column>
        </addColumn>
    </changeSet>
</databaseChangeLog>
```

Thêm vào `changelog-tenant.xml`:
```xml
<include file="parts/XXXX_add_credit_scoring_fields.xml" relativeToChangelogFile="true"/>
```

**LƯU Ý:** KHÔNG chạy SQL trực tiếp. Fineract quản lý DB bằng Liquibase, nếu chạy SQL tay sẽ gây lỗi khi deploy môi trường mới.

### Bước 4: Cập Nhật Health Check

Sửa phương thức `isServiceAvailable` để kiểm tra endpoint `/health`:

```java
public boolean isServiceAvailable() {
    try {
        URI healthUri = UriComponentsBuilder.fromUriString(config.getBaseUrl())
                .path("/health")
                .toUri();
        ResponseEntity<String> resp = creditScorecardRestTemplate.getForEntity(healthUri, String.class);
        return resp.getStatusCode() == HttpStatus.OK;
    } catch (Exception e) {
        log.warn("Credit Scoring health check failed: {}", e.getMessage());
        return false;
    }
}
```

### Bước 5: Extend MLScorecard Domain (Để lưu đầy đủ thông tin)

Thêm các field mới vào `MLScorecard.java` để lưu thông tin từ Credit Scoring API:

```java
// Trong MLScorecard.java
@Column(name = "credit_score")
private Integer creditScore;

@Column(name = "grade", length = 1)
private String grade;

@Column(name = "expected_loss_vnd", scale = 6, precision = 19)
private BigDecimal expectedLossVnd;

@Column(name = "ead_vnd", scale = 6, precision = 19)
private BigDecimal eadVnd;

@Column(name = "lgd_percent", scale = 6, precision = 19)
private BigDecimal lgdPercent;

// Getters and setters
public Integer getCreditScore() { return creditScore; }
public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }

public String getGrade() { return grade; }
public void setGrade(String grade) { this.grade = grade; }

public BigDecimal getExpectedLossVnd() { return expectedLossVnd; }
public void setExpectedLossVnd(BigDecimal expectedLossVnd) { this.expectedLossVnd = expectedLossVnd; }

public BigDecimal getEadVnd() { return eadVnd; }
public void setEadVnd(BigDecimal eadVnd) { this.eadVnd = eadVnd; }

public BigDecimal getLgdPercent() { return lgdPercent; }
public void setLgdPercent(BigDecimal lgdPercent) { this.lgdPercent = lgdPercent; }
```

**QUAN TRỌNG:** Fineract dùng Liquibase, KHÔNG chạy SQL trực tiếp. Xem phần Liquibase migration ở trên.

### Bước 6: Cập Nhật DTO và Mapper (Để API trả về đầy đủ thông tin)

**QUAN TRỌNG:** Fineract sử dụng pattern static factory method `instance()` để map Entity sang DTO. Cần sửa `MLScorecardData.instance()`.

1. **Extend MLScorecardData với các field mới:**

File: `fineract-provider/src/main/java/org/apache/fineract/portfolio/creditscorecard/data/MLScorecardData.java`

```java
public class MLScorecardData implements Serializable {
    // ... existing fields ...
    private final Integer creditScore;
    private final String grade;
    private final BigDecimal expectedLossVnd;
    private final BigDecimal eadVnd;
    private final BigDecimal lgdPercent;
    
    // Constructor - thêm các field mới vào cuối
    public MLScorecardData(Long id, Integer age, String sex, String job, String housing, 
                          BigDecimal creditAmount, Integer duration, String purpose, 
                          String risk, BigDecimal accuracy, 
                          Collection<Map<String, Object>> scoringModels,
                          Collection<Map<String, Object>> jobOptions, 
                          Collection<Map<String, Object>> genderOptions,
                          Collection<Map<String, Object>> purposeOptions, 
                          Collection<Map<String, Object>> housingOptions,
                          // Thêm các field mới
                          Integer creditScore, String grade, 
                          BigDecimal expectedLossVnd, BigDecimal eadVnd, BigDecimal lgdPercent) {
        // ... existing assignments ...
        this.creditScore = creditScore;
        this.grade = grade;
        this.expectedLossVnd = expectedLossVnd;
        this.eadVnd = eadVnd;
        this.lgdPercent = lgdPercent;
    }
    
    // Sửa static factory method instance() để map các field mới
    public static MLScorecardData instance(final MLScorecard sc) {
        final MLScorecardFields scf = sc.getScorecardFields();
        
        final Collection<Map<String, Object>> scoringModels = null;
        final Collection<Map<String, Object>> jobOptions = null;
        final Collection<Map<String, Object>> genderOptions = null;
        final Collection<Map<String, Object>> purposeOptions = null;
        final Collection<Map<String, Object>> housingOptions = null;
        
        // Map các field mới từ MLScorecard entity
        Integer creditScore = sc.getCreditScore();
        String grade = sc.getGrade();
        BigDecimal expectedLossVnd = sc.getExpectedLossVnd();
        BigDecimal eadVnd = sc.getEadVnd();
        BigDecimal lgdPercent = sc.getLgdPercent();
        
        return new MLScorecardData(
            sc.getId(), 
            scf.getAge(), scf.getSex(), scf.getJob(), scf.getHousing(), 
            scf.getCreditAmount(), scf.getDuration(), scf.getPurpose(), 
            sc.getPredictedRisk(), sc.getAccuracy(), 
            scoringModels, jobOptions, genderOptions, purposeOptions, housingOptions,
            // Thêm các field mới
            creditScore, grade, expectedLossVnd, eadVnd, lgdPercent
        );
    }
    
    // Getters cho các field mới
    public Integer getCreditScore() { return creditScore; }
    public String getGrade() { return grade; }
    public BigDecimal getExpectedLossVnd() { return expectedLossVnd; }
    public BigDecimal getEadVnd() { return eadVnd; }
    public BigDecimal getLgdPercent() { return lgdPercent; }
}
```

2. **Cập nhật LoanReadPlatformServiceImpl.buildMlResult() để thêm các field mới:**

File: `fineract-provider/src/main/java/org/apache/fineract/portfolio/loanaccount/service/LoanReadPlatformServiceImpl.java`

Method `buildMlResult()` đã map MLScorecardData sang Map. Cần thêm các field mới:

```java
private Map<String, Object> buildMlResult(MLScorecardData data) {
    Map<String, Object> section = new LinkedHashMap<>();
    // Existing fields
    section.put("age", data.getAge());
    section.put("sex", data.getSex());
    section.put("job", data.getJob());
    section.put("housing", data.getHousing());
    section.put("creditAmount", data.getCreditAmount());
    section.put("duration", data.getDuration());
    section.put("purpose", data.getPurpose());
    section.put("risk", data.getRisk()); // risk = label (APPROVE/REJECT/REVIEW)
    section.put("accuracy", data.getAccuracy()); // accuracy = probability (0.0-1.0)
    section.put("score", data.getAccuracy()); // alias for accuracy
    
    // Thêm các field mới từ Credit Scoring
    if (data.getCreditScore() != null) {
        section.put("creditScore", data.getCreditScore());
    }
    if (data.getGrade() != null) {
        section.put("grade", data.getGrade());
    }
    if (data.getExpectedLossVnd() != null) {
        section.put("expectedLossVnd", data.getExpectedLossVnd());
    }
    if (data.getEadVnd() != null) {
        section.put("eadVnd", data.getEadVnd());
    }
    if (data.getLgdPercent() != null) {
        section.put("lgdPercent", data.getLgdPercent());
    }
    
    return section;
}
```

**Lưu ý về Pattern Fineract:**
- Fineract dùng **static factory method pattern**: `MLScorecardData.instance(MLScorecard sc)`
- `CreditScorecardReadPlatformServiceImpl.mapToData()` tự động gọi `MLScorecardData.instance()`
- `LoanReadPlatformServiceImpl.buildMlResult()` map DTO sang Map cho JSON response
- **Không cần tạo mapper riêng**, chỉ cần sửa 2 chỗ:
  1. `MLScorecardData.instance()` - map Entity → DTO
  2. `LoanReadPlatformServiceImpl.buildMlResult()` - map DTO → Map (cho API response)

### Bước 7: Cập Nhật CreditScorecardWritePlatformServiceImpl

Trong file `CreditScorecardWritePlatformServiceImpl.java`, cập nhật để lưu đầy đủ thông tin:

```java
@Override
public CreditScorecard assessCreditRisk(Loan loan, MLScorecardFields mlFields) {
    try {
        log.info("Assessing credit risk for loan ID: {} using Credit Scoring service", loan.getId());
        
        // ... existing field merging logic ...
        
        // Build request
        CreditScoreRequest request = CreditScoreRequest.builder()
                .features(mlFields)
                .build();
        
        // Call Credit Scoring service - mapToCreditScoringRequest đã tự động convert sang snake_case
        // httpClient.predictCreditScore() sẽ gọi mapCreditScoringResponse() để extract đầy đủ data
        CreditScoreResponse response = httpClient.predictCreditScore(request);
        
        // Lưu full response data vào biến tạm để set vào MLScorecard
        // (Cần modify mapCreditScoringResponse để return cả Map data hoặc lưu vào instance variable)
        Map<String, Object> fullResponseData = httpClient.getLastResponseData(); // Cần implement
        
        // Create ML scorecard entity with full information
        MLScorecard mlScorecard = new MLScorecard();
        mlScorecard.setScorecardFields(mlFields);
        mlScorecard.setPredictionResponse(response.getProbability(), response.getLabel(), response.getRequestId());
        
        // Set additional Credit Scoring fields từ fullResponseData
        if (fullResponseData != null) {
            mlScorecard.setCreditScore((Integer) fullResponseData.get("credit_score"));
            mlScorecard.setGrade((String) fullResponseData.get("grade"));
            if (fullResponseData.get("expected_loss_vnd") != null) {
                mlScorecard.setExpectedLossVnd(BigDecimal.valueOf(
                    ((Number) fullResponseData.get("expected_loss_vnd")).longValue()));
            }
            if (fullResponseData.get("ead_vnd") != null) {
                mlScorecard.setEadVnd(BigDecimal.valueOf(
                    ((Number) fullResponseData.get("ead_vnd")).longValue()));
            }
            if (fullResponseData.get("lgd_percent") != null) {
                mlScorecard.setLgdPercent(BigDecimal.valueOf(
                    ((Number) fullResponseData.get("lgd_percent")).doubleValue()));
            }
        }
        
        // Create and save scorecard
        // Lưu ý: Chỉ tạo ML scorecard, rule-based scorecard vẫn giữ nguyên
        CreditScorecard creditScorecard = new CreditScorecard("ml", "creditScoring",
                null, // ruleBasedScorecard - giữ null, không ảnh hưởng
                null, // statScorecard - giữ null
                mlScorecard); // ML scorecard với Credit Scoring mới
        creditScorecard.setLoan(loan);
        
        creditScorecardRepository.saveAndFlush(creditScorecard);
        
        return creditScorecard;
    } catch (Exception e) {
        log.error("Error assessing credit risk for loan ID: {}", loan.getId(), e);
        throw new RuntimeException("Failed to assess credit risk", e);
    }
}
```

## Kiểm Tra Tích Hợp

### 1. Khởi động services

**Nếu dùng external network:**

```bash
# Tạo network chung trước
docker network create shared-network

# Khởi động Credit Scoring
cd mobile-wallet/CreditScoring
docker-compose up -d

# Khởi động Fineract
cd ../fineract
docker-compose up -d
```

**Nếu gộp chung vào 1 file docker-compose.yml:**

```bash
cd mobile-wallet/fineract
docker-compose up -d
```

### 2. Kiểm tra Credit Scoring service

```bash
curl http://localhost:8000/health
```

Kết quả mong đợi:
```json
{"status": "healthy", "service": "creditscoring"}
```

### 3. Test API trực tiếp (sử dụng biến tiếng Anh)

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "loan_amount": 100000000,
    "annual_income": 360000000,
    "term": "36 months",
    "interest_rate": 12.5,
    "home_ownership": "rent",
    "purpose": "car",
    "region": "south"
  }'
```

### 4. Test từ Fineract

Tạo một loan application và gọi API assess credit risk:

```bash
POST /fineract-provider/api/v1/creditScorecard/loans/{loanId}/assess
```

## Tổng Hợp Các Trường Cho Credit Scoring

Khi tích hợp Credit Scoring (thay thế ML scorecard cũ), chỉ cần tập trung vào các trường sau:

**Lưu ý:** Rule-based scorecard vẫn hoạt động bình thường, không cần thay đổi.

### Tổng Số: 19 Trường

**Required (7 trường bắt buộc):**
1. `loan_amount` - Số tiền vay
2. `annual_income` - Thu nhập hàng năm
3. `term` - Thời hạn
4. `interest_rate` - Lãi suất
5. `home_ownership` - Tình trạng nhà ở
6. `purpose` - Mục đích vay
7. `region` - Khu vực

**Optional (12 trường tùy chọn):**
1. `employment_length` - Kinh nghiệm làm việc
2. `dti` - Tỷ lệ nợ trên thu nhập
3. `inquiries_6m` - Số lần truy vấn 6 tháng
4. `revolving_balance` - Số dư nợ quay vòng
5. `total_assets` - Tổng tài sản
6. `verification_status` - Tình trạng xác minh
7. `months_since_delinquency` - Tháng từ lần chậm trả
8. `open_accounts` - Số tài khoản mở
9. `total_accounts` - Tổng số tài khoản
10. `initial_list_status` - Tình trạng niêm yết (có thể bỏ qua)
11. `earliest_credit_line` - Lịch sử tín dụng từ (có thể bỏ qua)
12. `issue_date` - Ngày phát hành khoản vay (có thể bỏ qua)

### Mapping Từ Fineract MLScorecardFields

Trong Fineract, các trường này được map từ `MLScorecardFields`:

| Fineract Field | Credit Scoring Field | Required | Type | Mô tả |
|----------------|---------------------|----------|------|-------|
| `loanAmnt` | `loan_amount` | ✅ | BigDecimal | Số tiền vay (VND) |
| `annualInc` | `annual_income` | ✅ | BigDecimal | Thu nhập hàng năm (VND) |
| `term` | `term` | ✅ | String/Integer | Thời hạn: chỉ nhập số (36) hoặc "36 months" - tự động format thành "36 months" |
| `intRate` | `interest_rate` | ✅ | BigDecimal | Lãi suất (%) |
| `homeOwnership` | `home_ownership` | ✅ | String | Tình trạng nhà ở: "rent", "own", "mortgage" |
| `purpose` | `purpose` | ✅ | String | Mục đích vay: "car", "small_business", etc. |
| - | `region` | ✅ | String | Khu vực: "north", "central", "south" (extract từ client/loan) |
| `empLength` | `employment_length` | ⚪ | String/Integer | Kinh nghiệm: chỉ nhập số (5) hoặc "5 years" - tự động format thành "5 years" |
| `dti` | `dti` | ⚪ | BigDecimal | Tỷ lệ nợ trên thu nhập (%) |
| `inqLast6mths` | `inquiries_6m` | ⚪ | Integer | Số lần truy vấn 6 tháng |
| `revolBal` | `revolving_balance` | ⚪ | BigDecimal | Số dư nợ quay vòng (VND) |
| `totCurBal` | `total_assets` | ⚪ | BigDecimal | Tổng tài sản (VND) |
| `verificationStatus` | `verification_status` | ⚪ | String | Tình trạng xác minh |
| `delinq2yrs` | `months_since_delinquency` | ⚪ | Integer | Tháng từ lần chậm trả (convert: years * 12) |
| `openAcc` | `open_accounts` | ⚪ | Integer | Số tài khoản mở |
| `totalAcc` | `total_accounts` | ⚪ | Integer | Tổng số tài khoản |

**Lưu ý:** 
- 3 trường (`initial_list_status`, `earliest_credit_line`, `issue_date`) không có trong MLScorecardFields, có thể bỏ qua hoặc set giá trị mặc định
- Trường `region` cần extract từ client address hoặc loan product configuration

## Mapping Dữ Liệu

**Lưu ý:** Tất cả biến trong code sử dụng tiếng Anh. Tiếng Việt chỉ dùng trong documentation và hiển thị cho người dùng.

### Request Mapping (Fineract → Credit Scoring)

**Tổng: 19 trường (7 required + 12 optional)**

#### Required Fields (7 trường)

| Fineract Field | Credit Scoring Field | Type | Giá trị (English) | Mô tả |
|----------------|---------------------|------|-------------------|-------|
| `loanAmnt` | `loan_amount` | BigDecimal | Integer (VND) | Số tiền vay |
| `annualInc` | `annual_income` | BigDecimal | Integer (VND) | Thu nhập hàng năm |
| `term` | `term` | String/Integer | Chỉ nhập số: `36` hoặc `"36 months"` - tự động format thành `"36 months"` | Thời hạn vay |
| `intRate` | `interest_rate` | BigDecimal | Float (%) | Lãi suất |
| `homeOwnership` | `home_ownership` | String | "rent", "own", "mortgage" | Tình trạng nhà ở |
| `purpose` | `purpose` | String | "car", "small_business", "home_improvement", "debt_consolidation", "major_purchase", "other" | Mục đích vay |
| - | `region` | String | "north", "central", "south" | Khu vực (extract từ client/loan) |

#### Optional Fields (12 trường)

| Fineract Field | Credit Scoring Field | Type | Mô tả |
|----------------|---------------------|------|-------|
| `empLength` | `employment_length` | String/Integer | Chỉ nhập số: `5` hoặc `"5 years"` - tự động format thành `"5 years"` | Kinh nghiệm làm việc |
| `dti` | `dti` | BigDecimal | Tỷ lệ nợ trên thu nhập (%) |
| `inqLast6mths` | `inquiries_6m` | Integer | Số lần truy vấn 6 tháng |
| `revolBal` | `revolving_balance` | BigDecimal | Số dư nợ quay vòng (VND) |
| `totCurBal` | `total_assets` | BigDecimal | Tổng tài sản (VND) |
| `verificationStatus` | `verification_status` | String | Tình trạng xác minh |
| `delinq2yrs` | `months_since_delinquency` | Integer | Tháng từ lần chậm trả (convert: years * 12) |
| `openAcc` | `open_accounts` | Integer | Số tài khoản mở |
| `totalAcc` | `total_accounts` | Integer | Tổng số tài khoản |
| - | `initial_list_status` | String | Tình trạng niêm yết (có thể bỏ qua) |
| - | `earliest_credit_line` | String | Lịch sử tín dụng từ (có thể bỏ qua) |
| - | `issue_date` | String | Ngày phát hành khoản vay (có thể bỏ qua) |

### Giá Trị Enum (English Values)

#### home_ownership
- `"rent"` - Nhà thuê
- `"own"` - Nhà chính chủ  
- `"mortgage"` - Đang trả góp

#### purpose
- `"car"` - Mua ô tô
- `"small_business"` - Kinh doanh
- `"home_improvement"` - Sửa nhà
- `"debt_consolidation"` - Trả nợ
- `"major_purchase"` - Mua sắm
- `"other"` - Khác

#### region
- `"north"` - Miền Bắc
- `"central"` - Miền Trung
- `"south"` - Miền Nam

### Response Mapping (Credit Scoring → Fineract)

| Credit Scoring Field (English) | Fineract Field | Lưu vào | Mô tả |
|-------------------------------|----------------|---------|-------|
| `decision` | `label` | MLScorecard.label | Quyết định: "APPROVE", "REJECT", "REVIEW" |
| `pd_percent` | `probability` | MLScorecard.probability | Xác suất vỡ nợ (%) - Convert sang decimal (0.0-1.0) |
| `credit_score` | `creditScore` | MLScorecard.creditScore | Điểm tín dụng (300-850) - **Cần thêm field** |
| `grade` | `grade` | MLScorecard.grade | Hạng tín dụng: "A", "B", "C", "D", "E", "F" - **Cần thêm field** |
| `expected_loss_vnd` | `expectedLossVnd` | MLScorecard.expectedLossVnd | Tổn thất dự kiến (VND) - **Cần thêm field** |
| `ead_vnd` | `eadVnd` | MLScorecard.eadVnd | Exposure at Default (VND) - **Cần thêm field** |
| `lgd_percent` | `lgdPercent` | MLScorecard.lgdPercent | Loss Given Default (%) - **Cần thêm field** |

**Lưu ý:** 
- Các field `creditScore`, `grade`, `expectedLossVnd`, `eadVnd`, `lgdPercent` cần được thêm vào domain `MLScorecard` để lưu vào database
- Hoặc có thể lưu vào JSON field nếu database hỗ trợ
- Các thông tin này quan trọng cho báo cáo và phân tích rủi ro

## Xử Lý Ngoại Lệ và Error Handling

### Tổng Quan Các Trường Hợp Ngoại Lệ

Khi tích hợp Credit Scoring, cần xử lý các trường hợp ngoại lệ sau:

#### 1. Connection Errors (Lỗi Kết Nối)

**Các trường hợp:**
- Credit Scoring service không chạy
- Network không khả dụng
- DNS resolution failed
- Firewall blocking

**Xử lý:**
```java
try {
    CreditScoreResponse response = httpClient.predictCreditScore(request);
} catch (RestClientException e) {
    if (e instanceof ResourceAccessException) {
        // Connection refused hoặc timeout
        log.error("Cannot connect to Credit Scoring service: {}", e.getMessage());
        throw new CreditScorecardServiceException(
            "Credit Scoring service is unavailable. Please try again later.", e);
    }
    throw new CreditScorecardServiceException(
        "Failed to communicate with Credit Scoring service: " + e.getMessage(), e);
}
```

**Fallback strategy:**
- Retry với exponential backoff (3 lần)
- Nếu vẫn fail, có thể:
  -  throw exception để user biết cần thử lại

#### 2. Timeout Errors (Lỗi Timeout)

**Các trường hợp:**
- Credit Scoring service xử lý quá lâu
- Network latency cao
- Model inference chậm

**Xử lý:**
```java
try {
    CreditScoreResponse response = httpClient.predictCreditScore(request);
} catch (ResourceAccessException e) {
    if (e.getCause() instanceof SocketTimeoutException) {
        log.error("Credit Scoring service timeout after {}ms", config.getReadTimeout());
        throw new CreditScorecardServiceException(
            "Credit Scoring service timeout. The request took too long to process.", e);
    }
    throw e;
}
```

**Cấu hình:**
- Tăng `read-timeout` nếu model thường xuyên timeout
- Monitor average response time
- Set timeout hợp lý (10-30s tùy model)

#### 3. HTTP Errors (4xx, 5xx)

**400 Bad Request:**
```java
catch (HttpClientErrorException e) {
    if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
        String errorBody = e.getResponseBodyAsString();
        log.error("Credit Scoring API validation error: {}", errorBody);
        
        // Parse error message từ response
        String errorMessage = extractValidationError(errorBody);
        throw new CreditScorecardServiceException(
            "Invalid request data: " + errorMessage, e);
    }
    throw e;
}
```

**Các lỗi validation thường gặp:**
- Thiếu trường required (loan_amount, annual_income, etc.)
- Giá trị không hợp lệ (số âm, enum không đúng)
- Format sai (term có thể là số "36" hoặc "36 months" - code tự động format)

**500 Internal Server Error:**
```java
catch (HttpServerErrorException e) {
    if (e.getStatusCode() == HttpStatus.INTERNAL_SERVER_ERROR) {
        log.error("Credit Scoring service internal error: {}", e.getResponseBodyAsString());
        throw new CreditScorecardServiceException(
            "Credit Scoring service encountered an error. Please contact support.", e);
    }
    throw e;
}
```

**503 Service Unavailable:**
```java
if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
    log.warn("Credit Scoring service temporarily unavailable");
    // Có thể implement retry logic
    throw new CreditScorecardServiceException(
        "Credit Scoring service is temporarily unavailable. Please try again later.", e);
}
```

#### 4. Response Parsing Errors (Lỗi Parse Response)

**Các trường hợp:**
- Response format không đúng
- Thiếu field bắt buộc
- Type mismatch (string thay vì number)

**Xử lý:**
```java
private CreditScoreResponse mapCreditScoringResponse(Map<String, Object> responseBody) {
    try {
        if (responseBody == null || !"success".equals(responseBody.get("status"))) {
            String errorMsg = responseBody != null ? 
                (String) responseBody.get("error") : "Unknown error";
            throw new CreditScorecardServiceException(
                "Credit Scoring API returned error: " + errorMsg);
        }
        
        Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
        if (data == null) {
            throw new CreditScorecardServiceException(
                "Credit Scoring API response missing data field");
        }
        
        // Validate required fields
        if (data.get("decision") == null) {
            throw new CreditScorecardServiceException(
                "Credit Scoring response missing 'decision' field");
        }
        
        if (data.get("pd_percent") == null) {
            throw new CreditScorecardServiceException(
                "Credit Scoring response missing 'pd_percent' field");
        }
        
        // Safe extraction với default values
        Integer creditScore = safeExtractInteger(data, "credit_score", null);
        String decision = safeExtractString(data, "decision", "REVIEW");
        Double pdPercent = safeExtractDouble(data, "pd_percent", 50.0);
        String grade = safeExtractString(data, "grade", "C");
        
        // Validate decision value
        if (!Arrays.asList("APPROVE", "REJECT", "REVIEW").contains(decision)) {
            log.warn("Invalid decision value: {}, defaulting to REVIEW", decision);
            decision = "REVIEW";
        }
        
        // Validate pd_percent range
        if (pdPercent < 0 || pdPercent > 100) {
            log.warn("Invalid pd_percent: {}, defaulting to 50.0", pdPercent);
            pdPercent = 50.0;
        }
        
        // ... rest of mapping
        
    } catch (ClassCastException e) {
        log.error("Type mismatch in Credit Scoring response: {}", e.getMessage());
        throw new CreditScorecardServiceException(
            "Invalid response format from Credit Scoring service", e);
    } catch (Exception e) {
        log.error("Error parsing Credit Scoring response: {}", e.getMessage(), e);
        throw new CreditScorecardServiceException(
            "Failed to parse Credit Scoring response: " + e.getMessage(), e);
    }
}

// Helper methods
private Integer safeExtractInteger(Map<String, Object> data, String key, Integer defaultValue) {
    try {
        Object value = data.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(value.toString());
    } catch (Exception e) {
        log.warn("Failed to extract integer for key '{}': {}", key, e.getMessage());
        return defaultValue;
    }
}

private String safeExtractString(Map<String, Object> data, String key, String defaultValue) {
    Object value = data.get(key);
    return value != null ? value.toString() : defaultValue;
}

private Double safeExtractDouble(Map<String, Object> data, String key, Double defaultValue) {
    try {
        Object value = data.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(value.toString());
    } catch (Exception e) {
        log.warn("Failed to extract double for key '{}': {}", key, e.getMessage());
        return defaultValue;
    }
}
```

#### 5. Data Validation Errors (Lỗi Validation Dữ Liệu)

**Trước khi gọi API:**
```java
private void validateRequestData(MLScorecardFields mlFields) {
    List<String> errors = new ArrayList<>();
    
    // Validate required fields
    if (mlFields.getLoanAmnt() == null || mlFields.getLoanAmnt().compareTo(BigDecimal.ZERO) <= 0) {
        errors.add("loan_amount must be greater than 0");
    }
    
    if (mlFields.getAnnualInc() == null || mlFields.getAnnualInc().compareTo(BigDecimal.ZERO) <= 0) {
        errors.add("annual_income must be greater than 0");
    }
    
    if (mlFields.getTerm() == null || mlFields.getTerm().trim().isEmpty()) {
        errors.add("term is required");
    } else {
        // Validate term: có thể là số hoặc "X months"
        // Code sẽ tự động format số thành "X months"
        String termStr = mlFields.getTerm().trim();
        if (!termStr.matches("\\d+") && !termStr.matches("\\s*\\d+\\s+months\\s*")) {
            errors.add("term must be a number (e.g., '36') or 'X months' format");
        }
    }
    
    if (mlFields.getIntRate() == null || mlFields.getIntRate().compareTo(BigDecimal.ZERO) < 0) {
        errors.add("interest_rate must be non-negative");
    }
    
    if (mlFields.getHomeOwnership() == null || mlFields.getHomeOwnership().trim().isEmpty()) {
        errors.add("home_ownership is required");
    } else {
        // Validate enum value
        List<String> validValues = Arrays.asList("rent", "own", "mortgage");
        if (!validValues.contains(mlFields.getHomeOwnership().toLowerCase())) {
            errors.add("home_ownership must be one of: rent, own, mortgage");
        }
    }
    
    if (mlFields.getPurpose() == null || mlFields.getPurpose().trim().isEmpty()) {
        errors.add("purpose is required");
    }
    
    // Validate optional fields if provided
    if (mlFields.getDti() != null && 
        (mlFields.getDti().compareTo(BigDecimal.ZERO) < 0 || 
         mlFields.getDti().compareTo(BigDecimal.valueOf(100)) > 0)) {
        errors.add("dti must be between 0 and 100");
    }
    
    if (!errors.isEmpty()) {
        throw new CreditScorecardServiceException(
            "Validation failed: " + String.join(", ", errors));
    }
}
```

#### 6. Database Errors (Lỗi Database)

**Khi lưu kết quả:**
```java
try {
    creditScorecardRepository.saveAndFlush(creditScorecard);
} catch (DataIntegrityViolationException e) {
    log.error("Database constraint violation when saving scorecard: {}", e.getMessage());
    throw new CreditScorecardServiceException(
        "Failed to save credit scorecard due to data constraint violation", e);
} catch (OptimisticLockingFailureException e) {
    log.warn("Optimistic locking failure, retrying...");
    // Retry logic
    creditScorecardRepository.saveAndFlush(creditScorecard);
} catch (Exception e) {
    log.error("Unexpected database error: {}", e.getMessage(), e);
    throw new CreditScorecardServiceException(
        "Failed to save credit scorecard", e);
}
```

#### 7. Retry Logic (Logic Thử Lại)

**Implement retry với exponential backoff:**
```java
@Retryable(
    value = {RestClientException.class, HttpServerErrorException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public CreditScoreResponse predictCreditScoreWithRetry(CreditScoreRequest request) {
    return httpClient.predictCreditScore(request);
}

@Recover
public CreditScoreResponse recover(RestClientException e, CreditScoreRequest request) {
    log.error("All retry attempts failed for Credit Scoring request", e);
    // Return default response
    return CreditScoreResponse.builder()
        .label("REVIEW")
        .probability(BigDecimal.valueOf(0.5))
        .method("creditScoring")
        .requestId(UUID.randomUUID().toString())
        .build();
}
```

#### 8. Error Logging và Monitoring

**Structured logging:**
```java
log.error("Credit Scoring error - LoanId: {}, ErrorType: {}, Message: {}, ResponseTime: {}ms",
    loan.getId(),
    e.getClass().getSimpleName(),
    e.getMessage(),
    System.currentTimeMillis() - startTime);
```

**Metrics tracking:**
```java
// Track success/failure rates
if (success) {
    metrics.incrementCounter("credit_scoring.success");
} else {
    metrics.incrementCounter("credit_scoring.failure", 
        "error_type", e.getClass().getSimpleName());
}

// Track response time
metrics.recordTimer("credit_scoring.response_time", duration);
```

#### 9. API Layer Error Handling

**Trong CreditScorecardApiResource:**
```java
@PostMapping("/loans/{loanId}/assess")
public ResponseEntity<CommandProcessingResult> assessCreditRisk(
        @PathVariable Long loanId,
        @RequestParam(required = false) String scoringMethod,
        @RequestBody(required = false) String apiRequestBodyAsJson) {
    
    try {
        CreditScorecard scorecard = creditScorecardWritePlatformService.assessCreditRisk(loanId);
        return ResponseEntity.ok(CommandProcessingResult.resourceResult(scorecard.getId()));
        
    } catch (CreditScorecardServiceException e) {
        log.error("Credit Scoring service error for loan {}: {}", loanId, e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(CommandProcessingResult.error("Credit Scoring service error: " + e.getMessage()));
            
    } catch (IllegalArgumentException e) {
        log.error("Invalid request for loan {}: {}", loanId, e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(CommandProcessingResult.error("Invalid request: " + e.getMessage()));
            
    } catch (Exception e) {
        log.error("Unexpected error assessing credit risk for loan {}: {}", loanId, e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(CommandProcessingResult.error("Internal server error"));
    }
}
```

### Tóm Tắt Các Trường Hợp Cần Xử Lý

| Trường Hợp | Exception Type | Xử Lý | Fallback |
|------------|----------------|-------|----------|
| Connection refused | `ResourceAccessException` | Log + throw | Retry 3 lần, sau đó return REVIEW |
| Timeout | `SocketTimeoutException` | Log + throw | Tăng timeout hoặc return REVIEW |
| 400 Bad Request | `HttpClientErrorException` | Parse error message | Validate trước khi gọi API |
| 500 Internal Error | `HttpServerErrorException` | Log + throw | Retry hoặc return REVIEW |
| Invalid response | `ClassCastException`, `NullPointerException` | Safe extraction với defaults | Return default values |
| Database error | `DataIntegrityViolationException` | Log + throw | Retry hoặc rollback |
| Missing required fields | `IllegalArgumentException` | Validate trước | Set default values |
| Network issues | `RestClientException` | Retry với backoff | Return REVIEW sau 3 lần |

### Best Practices

1. **Always validate input** trước khi gọi API
2. **Use safe extraction** với default values cho optional fields
3. **Implement retry logic** cho transient errors
4. **Log đầy đủ context** (loanId, requestId, error type)
5. **Return meaningful error messages** cho user
6. **Monitor error rates** và alert khi cao
7. **Set reasonable timeouts** và handle timeout gracefully
8. **Test error scenarios** trong integration tests

## Tích Hợp Với Web App (Client)

### API Endpoint

Web app gọi API Fineract để đánh giá tín dụng:

```
POST /fineract-provider/api/v1/creditScorecard/loans/{loanId}/assess
```

### Request Body (từ Web App)

**QUAN TRỌNG - JSON Mapping:**

Fineract backend (Java) sử dụng **camelCase** cho POJO mapping. Web App phải gửi **camelCase**, không phải snake_case.

Web app có thể gửi thêm thông tin bổ sung (dùng camelCase):

```json
{
  "loanAmnt": 100000000,
  "annualInc": 360000000,
  "term": 36,
  "intRate": 12.5,
  "homeOwnership": "rent",
  "purpose": "car",
  "empLength": 5,
  "dti": 15.5
}
```

**Lưu ý:**
- **Web App → Fineract:** Dùng **camelCase** (`loanAmnt`, `annualInc`, `intRate`, `homeOwnership`)
- **Fineract → Credit Scoring API:** Code tự động convert sang **snake_case** (`loan_amount`, `annual_income`, `interest_rate`, `home_ownership`)
- Tất cả values đều dùng tiếng Anh trong code. Tiếng Việt chỉ dùng để hiển thị cho người dùng trong UI.

**Mapping Flow:**
```
Web App (camelCase) → Fineract API (camelCase) → MLScorecardFields (camelCase) 
→ mapToCreditScoringRequest() (snake_case) → Credit Scoring API (snake_case)
```

### Response (từ Fineract)

Response đầy đủ bao gồm tất cả thông tin từ Credit Scoring API:

```json
{
  "id": 1,
  "scoringMethod": "creditScoring",
  "scoringModel": "creditScoring",
  "mlScorecard": {
    "probability": 0.0168,
    "label": "APPROVE",
    "requestId": "uuid-here",
    "creditScore": 745,
    "grade": "A",
    "expectedLossVnd": 952853,
    "eadVnd": 65583598,
    "lgdPercent": 86.37
  }
}
```

**Các trường trong response:**

| Field | Type | Mô tả |
|-------|------|-------|
| `probability` | BigDecimal | Xác suất vỡ nợ (0.0 - 1.0) |
| `label` | String | Quyết định: "APPROVE", "REJECT", "REVIEW" |
| `requestId` | String | ID của request |
| `creditScore` | Integer | Điểm tín dụng (300 - 850) |
| `grade` | String | Hạng tín dụng: "A", "B", "C", "D", "E", "F" |
| `expectedLossVnd` | Long | Tổn thất dự kiến (VND) |
| `eadVnd` | Long | Exposure at Default - Mức phơi nhiễm khi vỡ nợ (VND) |
| `lgdPercent` | Double | Loss Given Default - Tỷ lệ tổn thất khi vỡ nợ (%) |

### Hiển Thị Trong Web App

Web app cần map các giá trị tiếng Anh sang tiếng Việt để hiển thị:

```typescript
// Mapping cho hiển thị
const homeOwnershipMap = {
  'rent': 'Nhà thuê',
  'own': 'Nhà chính chủ',
  'mortgage': 'Đang trả góp'
};

const purposeMap = {
  'car': 'Mua ô tô',
  'small_business': 'Kinh doanh',
  'home_improvement': 'Sửa nhà',
  'debt_consolidation': 'Trả nợ',
  'major_purchase': 'Mua sắm',
  'other': 'Khác'
};

const regionMap = {
  'north': 'Miền Bắc',
  'central': 'Miền Trung',
  'south': 'Miền Nam'
};

const decisionMap = {
  'APPROVE': 'Chấp nhận',
  'REJECT': 'Từ chối',
  'REVIEW': 'Xem xét lại'
};
```

## Lưu Ý

1. **Network**: Đảm bảo Fineract container có thể kết nối tới Credit Scoring container qua Docker network.

2. **Timeout**: Cấu hình timeout phù hợp (mặc định 10s) vì ML model có thể mất thời gian để xử lý.

3. **Default values**: Một số trường có thể không có trong loan data, cần set giá trị mặc định hợp lý.

4. **Region mapping**: Hiện tại hardcode "south". Cần extract từ client address hoặc loan product configuration.

5. **Biến tiếng Anh**: Tất cả biến, field names, và enum values trong code đều dùng tiếng Anh. Tiếng Việt chỉ dùng trong:
   - Documentation
   - UI display (mapping từ tiếng Anh sang tiếng Việt)
   - Log messages cho người dùng

6. **Backward compatibility**: 
   - **Rule-based scorecard**: Vẫn hoạt động bình thường, không cần thay đổi
   - **ML scorecard cũ**: Được thay thế bằng Credit Scoring mới
   - UI có thể chọn scoring method: `ruleBased` hoặc `ml` (Credit Scoring)

## Troubleshooting

### Lỗi: Connection refused

- Kiểm tra Credit Scoring service đã chạy: `docker ps | grep creditscoring`
- Kiểm tra network: `docker network inspect fineract-network`
- Kiểm tra URL trong config: phải dùng service name `creditscoring` thay vì `localhost`

### Lỗi: 400 Bad Request

- Kiểm tra request body có đủ 7 trường required
- Kiểm tra format của các trường (số, chuỗi)
- Xem log của Credit Scoring service để biết chi tiết

### Lỗi: Timeout

- Tăng `read-timeout` trong config
- Kiểm tra Credit Scoring service có đang xử lý quá lâu không
- Kiểm tra resource (CPU, memory) của container

## Hướng Dẫn Tích Hợp Cho Web App Client

### 1. Service Layer (TypeScript)

Tạo service để gọi API Fineract:

```typescript
// credit-scoring.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreditScoringRequest {
  // QUAN TRỌNG: Dùng camelCase để match với Fineract POJO (MLScorecardFields)
  loanAmnt?: number;  // KHÔNG dùng loan_amount
  annualInc?: number; // KHÔNG dùng annual_income
  term?: string | number; // Chỉ nhập số (36) hoặc "36 months" - tự động format
  intRate?: number;   // KHÔNG dùng interest_rate
  homeOwnership?: 'rent' | 'own' | 'mortgage'; // KHÔNG dùng home_ownership
  purpose?: 'car' | 'small_business' | 'home_improvement' | 'debt_consolidation' | 'major_purchase' | 'other';
  region?: 'north' | 'central' | 'south';
  empLength?: string | number; // KHÔNG dùng employment_length, chỉ nhập số (5) hoặc "5 years" - tự động format
  dti?: number;
  inqLast6mths?: number; // KHÔNG dùng inquiries_6m
  revolBal?: number;     // KHÔNG dùng revolving_balance
  totCurBal?: number;    // KHÔNG dùng total_assets
  verificationStatus?: string; // KHÔNG dùng verification_status
  monthsSinceDelinquency?: number; // KHÔNG dùng months_since_delinquency (nếu có field này)
  openAcc?: number;      // KHÔNG dùng open_accounts
  totalAcc?: number;     // KHÔNG dùng total_accounts
}

export interface CreditScoringResponse {
  id: number;
  scoringMethod: string;
  scoringModel: string;
  mlScorecard: {
    probability: number;
    label: 'APPROVE' | 'REJECT' | 'REVIEW';
    requestId: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CreditScoringService {
  private apiUrl = '/fineract-provider/api/v1/creditScorecard';

  constructor(private http: HttpClient) {}

  assessCreditRisk(loanId: number, data?: CreditScoringRequest): Observable<CreditScoringResponse> {
    return this.http.post<CreditScoringResponse>(
      `${this.apiUrl}/loans/${loanId}/assess`,
      data || {}
    );
  }
}
```

### 2. Mapping Utils (Tiếng Anh → Tiếng Việt cho hiển thị)

```typescript
// credit-scoring.utils.ts

export const HOME_OWNERSHIP_MAP: Record<string, string> = {
  'rent': 'Nhà thuê',
  'own': 'Nhà chính chủ',
  'mortgage': 'Đang trả góp'
};

export const PURPOSE_MAP: Record<string, string> = {
  'car': 'Mua ô tô',
  'small_business': 'Kinh doanh',
  'home_improvement': 'Sửa nhà',
  'debt_consolidation': 'Trả nợ',
  'major_purchase': 'Mua sắm',
  'other': 'Khác'
};

export const REGION_MAP: Record<string, string> = {
  'north': 'Miền Bắc',
  'central': 'Miền Trung',
  'south': 'Miền Nam'
};

export const DECISION_MAP: Record<string, string> = {
  'APPROVE': 'Chấp nhận',
  'REJECT': 'Từ chối',
  'REVIEW': 'Xem xét lại'
};

export function translateHomeOwnership(value: string): string {
  return HOME_OWNERSHIP_MAP[value] || value;
}

export function translatePurpose(value: string): string {
  return PURPOSE_MAP[value] || value;
}

export function translateRegion(value: string): string {
  return REGION_MAP[value] || value;
}

export function translateDecision(value: string): string {
  return DECISION_MAP[value] || value;
}
```

### 3. Component Example

```typescript
// credit-scoring.component.ts
import { Component, OnInit } from '@angular/core';
import { CreditScoringService, CreditScoringRequest } from './credit-scoring.service';
import { translateDecision, translatePurpose, translateHomeOwnership, formatTerm, formatEmploymentLength } from './credit-scoring.utils';

@Component({
  selector: 'app-credit-scoring',
  templateUrl: './credit-scoring.component.html'
})
export class CreditScoringComponent implements OnInit {
  loanId: number;
  request: CreditScoringRequest = {
    loanAmnt: 100000000,      // camelCase - match với Fineract
    annualInc: 360000000,      // camelCase
    term: 36,                  // Chỉ nhập số, tự động format thành "36 months"
    intRate: 12.5,             // camelCase
    homeOwnership: 'rent',     // camelCase
    purpose: 'car',
    region: 'south',
    empLength: 5               // camelCase, chỉ nhập số, tự động format thành "5 years"
  };
  
  result: any;
  loading = false;

  constructor(private creditScoringService: CreditScoringService) {}

  assessCredit() {
    this.loading = true;
    
    // Format các trường trước khi gửi
    // Lưu ý: Fineract nhận camelCase, không cần format field names
    // Chỉ format values (term, empLength) nếu cần
    const formattedRequest = {
      ...this.request,
      term: formatTerm(this.request.term),
      empLength: formatEmploymentLength(this.request.empLength) // camelCase
    };
    
    this.creditScoringService.assessCreditRisk(this.loanId, formattedRequest)
      .subscribe({
        next: (response) => {
          this.result = response;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error assessing credit:', error);
          this.loading = false;
        }
      });
  }

  getDecisionLabel(decision: string): string {
    return translateDecision(decision);
  }
}
```

### 4. Template Example

```html
<!-- credit-scoring.component.html -->
<div *ngIf="result">
  <h3>Kết quả đánh giá tín dụng</h3>
  <p>Quyết định: <strong>{{ getDecisionLabel(result.mlScorecard.label) }}</strong></p>
  <p>Xác suất vỡ nợ: {{ (result.mlScorecard.probability * 100).toFixed(2) }}%</p>
</div>

<form (ngSubmit)="assessCredit()">
  <label>
    Số tiền vay (VND):
    <input type="number" [(ngModel)]="request.loanAmnt" name="loanAmnt">
    <small>Dùng camelCase: loanAmnt (không phải loan_amount)</small>
  </label>
  
  <label>
    Thu nhập hàng năm (VND):
    <input type="number" [(ngModel)]="request.annualInc" name="annualInc">
    <small>Dùng camelCase: annualInc (không phải annual_income)</small>
  </label>
  
  <label>
    Thời hạn vay (tháng):
    <input type="number" [(ngModel)]="request.term" name="term" placeholder="36">
    <small>Chỉ nhập số (ví dụ: 36), tự động format thành "36 months"</small>
  </label>
  
  <label>
    Lãi suất (%):
    <input type="number" [(ngModel)]="request.intRate" name="intRate" step="0.1">
    <small>Dùng camelCase: intRate (không phải interest_rate)</small>
  </label>
  
  <label>
    Kinh nghiệm làm việc (năm):
    <input type="number" [(ngModel)]="request.empLength" name="empLength" placeholder="5">
    <small>Dùng camelCase: empLength, chỉ nhập số (ví dụ: 5), tự động format thành "5 years"</small>
  </label>
  
  <label>
    Tình trạng nhà ở:
    <select [(ngModel)]="request.homeOwnership" name="homeOwnership">
      <option value="rent">Nhà thuê</option>
      <option value="own">Nhà chính chủ</option>
      <option value="mortgage">Đang trả góp</option>
    </select>
  </label>
  
  <label>
    Mục đích vay:
    <select [(ngModel)]="request.purpose" name="purpose">
      <option value="car">Mua ô tô</option>
      <option value="small_business">Kinh doanh</option>
      <option value="home_improvement">Sửa nhà</option>
      <option value="debt_consolidation">Trả nợ</option>
      <option value="major_purchase">Mua sắm</option>
    </select>
  </label>
  
  <label>
    Khu vực:
    <select [(ngModel)]="request.region" name="region">
      <option value="north">Miền Bắc</option>
      <option value="central">Miền Trung</option>
      <option value="south">Miền Nam</option>
    </select>
  </label>
  
  <button type="submit" [disabled]="loading">
    {{ loading ? 'Đang xử lý...' : 'Đánh giá tín dụng' }}
  </button>
</form>
```

### 5. Lưu Ý Cho Web App

1. **Field Names**: Luôn dùng tiếng Anh trong request/response (loan_amount, annual_income, etc.)

2. **Enum Values**: Dùng giá trị tiếng Anh trong code:
   - home_ownership: "rent", "own", "mortgage"
   - purpose: "car", "small_business", "home_improvement", etc.
   - region: "north", "central", "south"

3. **Hiển Thị**: Map sang tiếng Việt chỉ khi hiển thị cho người dùng

4. **Validation**: Validate input theo enum values tiếng Anh

5. **Auto-format**: Sử dụng `formatTerm()` và `formatEmploymentLength()` để tự động format:
   - `term`: chỉ nhập số (36) -> tự động thành "36 months"
   - `employment_length`: chỉ nhập số (5) -> tự động thành "5 years"

6. **Error Handling**: Xử lý lỗi từ API và hiển thị message tiếng Việt cho người dùng

```typescript
// credit-scoring.service.ts - Error handling
assessCreditRisk(loanId: number, data?: CreditScoringRequest): Observable<CreditScoringResponse> {
  return this.http.post<CreditScoringResponse>(
    `${this.apiUrl}/loans/${loanId}/assess`,
    data || {}
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Đã xảy ra lỗi khi đánh giá tín dụng';
      
      if (error.status === 0) {
        // Network error
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.status === 400) {
        // Bad request
        errorMessage = error.error?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.status === 503) {
        // Service unavailable
        errorMessage = 'Dịch vụ đánh giá tín dụng tạm thời không khả dụng. Vui lòng thử lại sau.';
      } else if (error.status === 500) {
        // Internal server error
        errorMessage = 'Lỗi hệ thống. Vui lòng liên hệ bộ phận hỗ trợ.';
      } else if (error.status === 504) {
        // Gateway timeout
        errorMessage = 'Yêu cầu xử lý quá lâu. Vui lòng thử lại.';
      }
      
      console.error('Credit Scoring error:', error);
      return throwError(() => new Error(errorMessage));
    }),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount - 1) * 1000;
        console.log(`Retrying Credit Scoring request (attempt ${retryCount}) after ${delay}ms`);
        return timer(delay);
      },
      resetOnSuccess: true
    })
  );
}
```

```typescript
// credit-scoring.component.ts - Error handling trong component
assessCredit() {
  this.loading = true;
  this.errorMessage = null;
  
  this.creditScoringService.assessCreditRisk(this.loanId, this.request)
    .subscribe({
      next: (response) => {
        this.result = response;
        this.loading = false;
        this.showSuccessMessage('Đánh giá tín dụng thành công');
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.message || 'Đã xảy ra lỗi không xác định';
        this.showErrorMessage(this.errorMessage);
        console.error('Error assessing credit:', error);
      }
    });
}
```

## Tóm Tắt Các Điểm Quan Trọng

### ✅ Checklist Trước Khi Deploy

1. **Docker Network:**
   - [ ] Đã tạo external network hoặc gộp chung docker-compose.yml
   - [ ] Test kết nối giữa 2 containers

2. **JSON Mapping:**
   - [ ] Web App gửi camelCase (`loanAmnt`, `annualInc`, `intRate`, `homeOwnership`)
   - [ ] Fineract convert sang snake_case khi gọi Python API
   - [ ] Test với Postman/curl để verify mapping

3. **Database Migration:**
   - [ ] Đã tạo Liquibase changelog XML
   - [ ] Đã include vào changelog-tenant.xml
   - [ ] Test migration trên môi trường dev

4. **DTO Mapping:**
   - [ ] Đã extend MLScorecardData với các field mới
   - [ ] Đã cập nhật mapper từ Entity sang DTO
   - [ ] Test API response có đầy đủ fields

5. **Logic Mapping:**
   - [ ] Đã bỏ mapping sai `delinq2yrs` → `months_since_delinquency`
   - [ ] Đã implement `extractRegionFromLoan()` thay vì hardcode
   - [ ] Đã sửa regex format để giữ số thập phân và dấu +

6. **Error Handling:**
   - [ ] Đã implement retry logic
   - [ ] Đã xử lý tất cả exception cases
   - [ ] Đã test các trường hợp lỗi

### ⚠️ Các Lỗi Nghiêm Trọng Đã Sửa

| # | Lỗi | Mức Độ | Đã Sửa |
|---|-----|--------|--------|
| 1 | Docker Network không kết nối được | Blocker | ✅ |
| 2 | JSON mapping camelCase vs snake_case | Blocker | ✅ |
| 3 | Mapping sai delinq2yrs (count → time) | Logic Error | ✅ |
| 4 | Regex format làm mất dấu chấm/dấu + | Logic Error | ✅ |
| 5 | Dùng SQL trực tiếp thay vì Liquibase | Implementation Gap | ✅ |
| 6 | Thiếu DTO mapping → API không trả field mới | Implementation Gap | ✅ |
| 7 | Hardcode region → điểm tín dụng sai | Implementation Gap | ✅ |

### 📝 Lưu Ý Khi Code

1. **Web App → Fineract:** Luôn dùng **camelCase** (`loanAmnt`, `annualInc`)
2. **Fineract → Credit Scoring API:** Tự động convert sang **snake_case** (`loan_amount`, `annual_income`)
3. **delinq2yrs:** KHÔNG map sang `months_since_delinquency` - đây là 2 khái niệm khác nhau
4. **Region:** PHẢI extract từ client address, không hardcode
5. **Liquibase:** LUÔN dùng changelog XML, không chạy SQL trực tiếp
6. **DTO:** PHẢI map từ Entity sang DTO để API trả về đầy đủ
7. **Rule-based Scorecard:** **KHÔNG được xóa hoặc sửa** - vẫn hoạt động song song với Credit Scoring
8. **Scoring Method:** Khi tạo CreditScorecard, dùng `"ml"` cho method, `"creditScoring"` cho model

## Tài Liệu Tham Khảo

- [Credit Scoring API Documentation](./API_DOCS.md)
- [Fineract Integration Plan](./FINERACT_INTEGRATION.md)
