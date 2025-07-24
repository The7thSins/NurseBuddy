
// เครื่องคำนวณน้ำเกลือที่ปรับปรุงแล้ว
class IVCalculator {
  // 1. การแปลงจาก drop/min เป็น cc/hr
  static dropPerMinToCcPerHr(dropPerMin, dropFactor) {
    if (!dropPerMin || !dropFactor) return 0;
    return (dropPerMin * 60) / dropFactor;
  }

  // 2. การแปลงจาก cc/hr เป็น drop/min  
  static ccPerHrToDropPerMin(ccPerHr, dropFactor) {
    if (!ccPerHr || !dropFactor) return 0;
    return (ccPerHr * dropFactor) / 60;
  }

  // 3. คำนวณเวลาที่น้ำเกลือจะหมด (ชั่วโมง)
  static calculateTimeToFinish(totalVolume, ccPerHr) {
    if (!totalVolume || !ccPerHr) return 0;
    return totalVolume / ccPerHr;
  }

  // 4. สูตรลัดสำหรับการคำนวณ drop/min
  static quickDropCalculation(ccPerHr, dropFactor) {
    if (dropFactor === 20) {
      return Math.round(ccPerHr / 3);
    } else if (dropFactor === 15) {
      return Math.round(ccPerHr / 4);
    } else if (dropFactor === 60) {
      // Micro set: ccPerHr = dropPerMin
      return Math.round(ccPerHr);
    } else {
      return this.ccPerHrToDropPerMin(ccPerHr, dropFactor);
    }
  }

  // 5. ฟังก์ชันแปลงเวลาจากชั่วโมงเป็นชั่วโมง:นาที
  static formatTime(hours) {
    if (!hours) return "0 ชั่วโมง 0 นาที";
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours} ชั่วโมง ${minutes} นาที`;
  }

  // 6. ฟังก์ชันคำนวณครบชุด
  static calculateComplete(params) {
    const {
      dropPerMin,
      ccPerHr, 
      totalVolume,
      dropFactor = 20
    } = params;

    const result = {
      dropFactor: dropFactor,
      originalDropPerMin: dropPerMin || 0,
      originalCcPerHr: ccPerHr || 0,
      totalVolume: totalVolume || 0
    };

    // คำนวณค่าที่ขาดหายไป
    if (dropPerMin && !ccPerHr) {
      result.calculatedCcPerHr = this.dropPerMinToCcPerHr(dropPerMin, dropFactor);
    } else if (ccPerHr && !dropPerMin) {
      result.calculatedDropPerMin = this.ccPerHrToDropPerMin(ccPerHr, dropFactor);
      result.quickDropPerMin = this.quickDropCalculation(ccPerHr, dropFactor);
    }

    // คำนวณเวลาที่น้ำเกลือจะหมด
    const finalCcPerHr = result.calculatedCcPerHr || result.originalCcPerHr;
    if (totalVolume && finalCcPerHr) {
      result.timeToFinishHours = this.calculateTimeToFinish(totalVolume, finalCcPerHr);
      result.timeToFinishFormatted = this.formatTime(result.timeToFinishHours);
      
      // คำนวณเวลาที่จะหมด (เวลาจริง)
      const finishTime = new Date(Date.now() + (result.timeToFinishHours * 60 * 60 * 1000));
      result.estimatedFinishTime = finishTime.toLocaleString('th-TH');
    }

    return result;
  }

  // 7. ฟังก์ชันตรวจสอบอัตราการไหลปกติ
  static checkFlowRate(ccPerHr, patientWeight, fluidType = 'normal') {
    if (!ccPerHr || !patientWeight) return null;

    const mlPerKgPerHr = ccPerHr / patientWeight;

    let recommendation = '';
    let riskLevel = 'normal';
    
    if (fluidType === 'maintenance') {
      // สูตรการให้น้ำเบื้องต้น
      if (mlPerKgPerHr < 1) {
        recommendation = 'อัตราต่ำ - ควรตรวจสอบการขาดน้ำ';
        riskLevel = 'low';
      } else if (mlPerKgPerHr > 4) {
        recommendation = 'อัตราสูง - ควรระวังภาวะน้ำเกิน';
        riskLevel = 'high';
      } else {
        recommendation = 'อัตราปกติสำหรับการรักษาเบื้องต้น';
        riskLevel = 'normal';
      }
    } else {
      if (mlPerKgPerHr > 10) {
        recommendation = 'อัตราสูงมาก - ควรระวังภาวะหัวใจล้มเหลว';
        riskLevel = 'critical';
      } else if (mlPerKgPerHr > 5) {
        recommendation = 'อัตราค่อนข้างสูง - ติดตามอย่างใกล้ชิด';
        riskLevel = 'moderate';
      } else {
        recommendation = 'อัตราอยู่ในเกณฑ์ปกติ';
        riskLevel = 'normal';
      }
    }

    return {
      mlPerKgPerHr: mlPerKgPerHr.toFixed(2),
      recommendation: recommendation,
      riskLevel: riskLevel
    };
  }

  // 8. คำนวณ Drop Factor แบบอัตโนมัติ
  static detectDropFactor(ccPerHr, observedDropPerMin) {
    if (!ccPerHr || !observedDropPerMin) return null;
    
    const calculatedFactor = (observedDropPerMin * 60) / ccPerHr;
    
    // หา Drop Factor ที่ใกล้เคียงที่สุด
    const commonFactors = [10, 15, 20, 60];
    let closest = commonFactors[0];
    let minDiff = Math.abs(calculatedFactor - closest);
    
    for (let factor of commonFactors) {
      const diff = Math.abs(calculatedFactor - factor);
      if (diff < minDiff) {
        minDiff = diff;
        closest = factor;
      }
    }
    
    return {
      calculated: calculatedFactor.toFixed(1),
      recommended: closest,
      accuracy: ((1 - minDiff / calculatedFactor) * 100).toFixed(1)
    };
  }
}

// ฟังก์ชันสำหรับสร้าง UI คำนวณน้ำเกลือ (ปรับปรุงแล้ว)
function createAdvancedIVCalculatorUI() {
  return `
    <div class="iv-calculator">
      <h3>🩺 เครื่องคำนวณน้ำเกลือขั้นสูง</h3>

      <div class="calc-section">
        <h4>ข้อมูลเริ่มต้น</h4>
        <div class="input-group">
          <label>ปริมาตรน้ำเกลือทั้งหมด (cc/ml):</label>
          <input type="number" id="totalVolume" placeholder="เช่น 1000" min="1">
        </div>

        <div class="input-group">
          <label>Drop Factor (หยด/cc):</label>
          <select id="dropFactor">
            <option value="10">10 หยด/cc (เด็ก)</option>
            <option value="15">15 หยด/cc</option>
            <option value="20" selected>20 หยด/cc (มาตรฐาน)</option>
            <option value="60">60 หยด/cc (Micro set)</option>
          </select>
        </div>

        <div class="input-group">
          <label>น้ำหนักผู้ป่วย (kg) - ไม่บังคับ:</label>
          <input type="number" id="patientWeight" placeholder="เช่น 70" min="1">
        </div>

        <div class="input-group">
          <label>ประเภทการให้น้ำเกลือ:</label>
          <select id="fluidType">
            <option value="normal">การรักษาทั่วไป</option>
            <option value="maintenance">การรักษาเบื้องต้น</option>
            <option value="resuscitation">การช่วยชีวิต</option>
          </select>
        </div>
      </div>

      <div class="calc-section">
        <h4>กรอกข้อมูลอย่างใดอย่างหนึ่ง</h4>
        <div class="input-group">
          <label>อัตราการหยด (หยด/นาที):</label>
          <input type="number" id="dropPerMin" placeholder="เช่น 30" min="0">
        </div>

        <div class="or-divider">หรือ</div>

        <div class="input-group">
          <label>อัตราการไหล (cc/hr):</label>
          <input type="number" id="ccPerHr" placeholder="เช่น 100" min="0">
        </div>
      </div>

      <div class="button-group">
        <button onclick="calculateAdvancedIV()" class="calc-button">คำนวณ</button>
        <button onclick="clearIVCalculator()" class="calc-button secondary">ล้างข้อมูล</button>
        <button onclick="detectDropFactor()" class="calc-button info">ตรวจสอบ Drop Factor</button>
      </div>

      <div id="ivResults" class="results-section" style="display: none;">
        <h4>ผลลัพธ์การคำนวณ</h4>
        <div id="resultsContent"></div>
      </div>

      <div id="safetyWarning" class="safety-warning" style="display: none;">
        <h4>⚠️ คำเตือนด้านความปลอดภัย</h4>
        <div id="warningContent"></div>
      </div>
    </div>
  `;
}

// ฟังก์ชันคำนวณขั้นสูง
function calculateAdvancedIV() {
  const totalVolume = parseFloat(document.getElementById('totalVolume').value) || 0;
  const dropFactor = parseInt(document.getElementById('dropFactor').value) || 20;
  const patientWeight = parseFloat(document.getElementById('patientWeight').value) || 0;
  const fluidType = document.getElementById('fluidType').value || 'normal';
  const dropPerMin = parseFloat(document.getElementById('dropPerMin').value) || 0;
  const ccPerHr = parseFloat(document.getElementById('ccPerHr').value) || 0;

  if (!dropPerMin && !ccPerHr) {
    alert('กรุณากรอกอัตราการหยด หรือ อัตราการไหล');
    return;
  }

  const result = IVCalculator.calculateComplete({
    dropPerMin,
    ccPerHr,
    totalVolume,
    dropFactor
  });

  let resultsHTML = `
    <div class="result-grid">
      <div class="result-item">
        <strong>Drop Factor:</strong> ${result.dropFactor} หยด/cc
      </div>
  `;

  if (result.calculatedCcPerHr) {
    resultsHTML += `
      <div class="result-item">
        <strong>อัตราการไหล:</strong> ${result.calculatedCcPerHr.toFixed(1)} cc/hr
      </div>
    `;
  }

  if (result.calculatedDropPerMin) {
    resultsHTML += `
      <div class="result-item">
        <strong>อัตราการหยด:</strong> ${result.calculatedDropPerMin.toFixed(1)} หยด/นาที
      </div>
    `;
  }

  if (result.quickDropPerMin) {
    resultsHTML += `
      <div class="result-item">
        <strong>สูตรลัด:</strong> ${result.quickDropPerMin} หยด/นาที
      </div>
    `;
  }

  if (result.timeToFinishFormatted) {
    resultsHTML += `
      <div class="result-item highlight">
        <strong>เวลาที่น้ำเกลือจะหมด:</strong> ${result.timeToFinishFormatted}
      </div>
      <div class="result-item">
        <strong>เวลาที่คาดว่าจะหมด:</strong> ${result.estimatedFinishTime}
      </div>
    `;
  }

  resultsHTML += `</div>`;

  // ตรวจสอบอัตราการไหลถ้ามีน้ำหนัก
  let warningHTML = '';
  if (patientWeight > 0) {
    const finalCcPerHr = result.calculatedCcPerHr || result.originalCcPerHr;
    const flowCheck = IVCalculator.checkFlowRate(finalCcPerHr, patientWeight, fluidType);
    if (flowCheck) {
      resultsHTML += `
        <div class="safety-check">
          <h5>การตรวจสอบความปลอดภัย</h5>
          <div class="result-item">
            <strong>อัตราต่อน้ำหนัก:</strong> ${flowCheck.mlPerKgPerHr} ml/kg/hr
          </div>
          <div class="result-item ${flowCheck.riskLevel !== 'normal' ? 'warning' : 'safe'}">
            <strong>คำแนะนำ:</strong> ${flowCheck.recommendation}
          </div>
        </div>
      `;

      if (flowCheck.riskLevel === 'high' || flowCheck.riskLevel === 'critical') {
        warningHTML = `
          <div class="warning-item">
            ⚠️ อัตราการให้น้ำเกลือสูงกว่าปกติ ควรติดตามอาการดังนี้:
            <ul>
              <li>อาการหายใจลำบาก</li>
              <li>เสียงแหบ หรือเสียงเวลาหายใจ</li>
              <li>บวมที่ขาหรือหน้า</li>
              <li>ปัสสาวะออกน้อย</li>
            </ul>
          </div>
        `;
      }
    }
  }

  document.getElementById('resultsContent').innerHTML = resultsHTML;
  document.getElementById('ivResults').style.display = 'block';

  if (warningHTML) {
    document.getElementById('warningContent').innerHTML = warningHTML;
    document.getElementById('safetyWarning').style.display = 'block';
  } else {
    document.getElementById('safetyWarning').style.display = 'none';
  }
}

// ฟังก์ชันตรวจสอบ Drop Factor
function detectDropFactor() {
  const ccPerHr = parseFloat(document.getElementById('ccPerHr').value) || 0;
  const dropPerMin = parseFloat(document.getElementById('dropPerMin').value) || 0;

  if (!ccPerHr || !dropPerMin) {
    alert('กรุณากรอกทั้งอัตราการไหล (cc/hr) และอัตราการหยด (หยด/นาที)');
    return;
  }

  const detection = IVCalculator.detectDropFactor(ccPerHr, dropPerMin);
  if (detection) {
    alert(`Drop Factor ที่คำนวณได้: ${detection.calculated}\nแนะนำใช้: ${detection.recommended} หยด/cc\nความแม่นยำ: ${detection.accuracy}%`);
    document.getElementById('dropFactor').value = detection.recommended;
  }
}

// ฟังก์ชันล้างข้อมูล
function clearIVCalculator() {
  document.getElementById('totalVolume').value = '';
  document.getElementById('dropPerMin').value = '';
  document.getElementById('ccPerHr').value = '';
  document.getElementById('patientWeight').value = '';
  document.getElementById('dropFactor').selectedIndex = 2; // กลับไปที่ 20 หยด/cc
  document.getElementById('fluidType').selectedIndex = 0;
  document.getElementById('ivResults').style.display = 'none';
  document.getElementById('safetyWarning').style.display = 'none';
}

// CSS สำหรับ IV Calculator ที่ปรับปรุงแล้ว
const advancedIVCalculatorCSS = `
  .iv-calculator {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    padding: 25px;
    border-radius: 15px;
    margin: 20px 0;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }

  .calc-section {
    margin-bottom: 25px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    border-left: 4px solid #0ea5e9;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .calc-section h4 {
    color: #1e293b;
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: 600;
  }

  .input-group {
    margin-bottom: 15px;
  }

  .input-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  .input-group input, .input-group select {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .input-group input:focus, .input-group select:focus {
    border-color: #0ea5e9;
    outline: none;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  .or-divider {
    text-align: center;
    margin: 15px 0;
    color: #64748b;
    font-style: italic;
    position: relative;
  }

  .or-divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e2e8f0;
    z-index: 1;
  }

  .or-divider span {
    background: white;
    padding: 0 15px;
    position: relative;
    z-index: 2;
  }

  .button-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .calc-button {
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    border: none;
    padding: 14px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(14, 165, 233, 0.2);
  }

  .calc-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.3);
  }

  .calc-button.secondary {
    background: linear-gradient(135deg, #64748b, #475569);
    box-shadow: 0 4px 15px rgba(100, 116, 139, 0.2);
  }

  .calc-button.info {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);
  }

  .results-section {
    margin-top: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-radius: 12px;
    border: 1px solid #22c55e;
  }

  .results-section h4 {
    color: #166534;
    margin-bottom: 15px;
  }

  .result-grid {
    display: grid;
    gap: 12px;
  }

  .result-item {
    padding: 12px 15px;
    background: white;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-left: 3px solid #0ea5e9;
  }

  .result-item.highlight {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    border-left-color: #f59e0b;
    font-weight: 600;
  }

  .result-item.warning {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    border-left-color: #ef4444;
    color: #991b1b;
  }

  .result-item.safe {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-left-color: #22c55e;
    color: #166534;
  }

  .safety-check {
    margin-top: 20px;
    padding: 15px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 10px;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .safety-check h5 {
    color: #1e40af;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .safety-warning {
    margin-top: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border-radius: 12px;
    border: 1px solid #ef4444;
  }

  .safety-warning h4 {
    color: #991b1b;
    margin-bottom: 15px;
  }

  .warning-item {
    color: #991b1b;
    line-height: 1.6;
  }

  .warning-item ul {
    margin-top: 10px;
    padding-left: 20px;
  }

  .warning-item li {
    margin-bottom: 5px;
  }

  @media (max-width: 768px) {
    .button-group {
      flex-direction: column;
    }
    
    .calc-button {
      width: 100%;
    }
    
    .result-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }
  }
`;

// เพิ่ม CSS ลงใน head
if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('#iv-calculator-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'iv-calculator-style';
  style.textContent = advancedIVCalculatorCSS;
  document.head.appendChild(style);
}

// Export สำหรับใช้งาน
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IVCalculator, createAdvancedIVCalculatorUI, calculateAdvancedIV };
}
