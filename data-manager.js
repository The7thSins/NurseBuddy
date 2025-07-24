
// ระบบจัดการข้อมูลแบบรวมศูนย์สำหรับ NurseBuddy
class DataManager {
  constructor() {
    this.cache = new Map();
    this.initialized = false;
    this.lastUpdate = new Map();
    this.cacheTimeout = 5000; // 5 วินาที
    this.observers = new Map();
    this.throttleTimers = new Map();
    
    // เพิ่ม performance optimization
    this.requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    this.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;
  }

  // เพิ่มฟังก์ชัน cache
  getCached(key) {
    const cached = this.cache.get(key);
    const lastUpdate = this.lastUpdate.get(key);

    if (cached && lastUpdate && (Date.now() - lastUpdate < this.cacheTimeout)) {
      return cached;
    }
    return null;
  }

  setCached(key, data) {
    // ใช้ requestIdleCallback เพื่อลดการใช้ CPU
    this.requestIdleCallback(() => {
      this.cache.set(key, data);
      this.lastUpdate.set(key, Date.now());
    });
  }

  // เพิ่ม throttle function เพื่อลดการเรียกใช้ฟังก์ชันบ่อยเกินไป
  throttle(key, func, delay = 300) {
    if (this.throttleTimers.has(key)) {
      clearTimeout(this.throttleTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      func();
      this.throttleTimers.delete(key);
    }, delay);
    
    this.throttleTimers.set(key, timer);
  }

  // ================================
  // การจัดการข้อมูลผู้ป่วย
  // ================================

  savePatient(bedId, patientData) {
    const key = `patient_${bedId}`;
    const enrichedData = {
      ...patientData,
      lastUpdated: new Date().toISOString(),
      bedId: bedId
    };

    // บันทึกข้อมูลหลัก
    localStorage.setItem(`ir_data_bed_${bedId}`, JSON.stringify(enrichedData));
    this.setCached(key, enrichedData);

    // อัพเดทข้อมูลที่เกี่ยวข้อง
    this.updateRelatedData(bedId, 'patient_updated', enrichedData);
    this.notifyObservers(key, enrichedData);

    return enrichedData;
  }

  getPatient(bedId) {
    const key = `patient_${bedId}`;
    const cachedData = this.getCached(key);
    if (cachedData) {
      return cachedData;
    }

    const data = JSON.parse(localStorage.getItem(`ir_data_bed_${bedId}`) || 'null');
    if (data) {
      this.setCached(key, data);
    }
    return data;
  }

  // ================================
  // การจัดการข้อมูล Vital Signs
  // ================================

  saveVitals(bedId, vitalsData) {
    const key = `vitals_${bedId}`;
    const patient = this.getPatient(bedId);

    const enrichedVitals = {
      ...vitalsData,
      bedId: bedId,
      patientId: patient?.patient_id || 'ไม่ทราบ',
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleString('th-TH')
    };

    localStorage.setItem(`vitals_bed_${bedId}`, JSON.stringify(enrichedVitals));
    this.setCached(key, enrichedVitals);

    // บันทึกประวัติ vitals
    this.saveVitalsHistory(bedId, enrichedVitals);

    // อัพเดทข้อมูลที่เกี่ยวข้อง
    this.updateRelatedData(bedId, 'vitals_updated', enrichedVitals);
    this.notifyObservers(key, enrichedVitals);

    return enrichedVitals;
  }

  getVitals(bedId) {
    const key = `vitals_${bedId}`;
    const cachedData = this.getCached(key);
    if (cachedData) {
      return cachedData;
    }

    const data = JSON.parse(localStorage.getItem(`vitals_bed_${bedId}`) || 'null');
    if (data) {
      this.setCached(key, data);
    }
    return data;
  }

  saveVitalsHistory(bedId, vitalsData) {
    const history = JSON.parse(localStorage.getItem(`vitals_history_bed_${bedId}`) || '[]');
    history.unshift(vitalsData);

    // เก็บแค่ 50 รายการล่าสุด
    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(`vitals_history_bed_${bedId}`, JSON.stringify(history));
  }

  getVitalsHistory(bedId) {
    return JSON.parse(localStorage.getItem(`vitals_history_bed_${bedId}`) || '[]');
  }

  // ================================
  // การจัดการข้อมูลยา
  // ================================

  addMedication(bedId, medicationData) {
    const patient = this.getPatient(bedId);
    const medications = this.getMedications(bedId);

    const enrichedMed = {
      ...medicationData,
      id: Date.now().toString(),
      bedId: bedId,
      patientId: patient?.patient_id || 'ไม่ทราบ',
      timestamp: new Date().toISOString(),
      addedBy: this.getCurrentUser()?.fullname || 'ไม่ทราบ'
    };

    medications.push(enrichedMed);
    localStorage.setItem(`medications_bed_${bedId}`, JSON.stringify(medications));

    // อัพเดทข้อมูลที่เกี่ยวข้อง
    this.updateRelatedData(bedId, 'medication_added', enrichedMed);

    return enrichedMed;
  }

  getMedications(bedId) {
    return JSON.parse(localStorage.getItem(`medications_bed_${bedId}`) || '[]');
  }

  removeMedication(bedId, medicationId) {
    const medications = this.getMedications(bedId);
    const filtered = medications.filter(med => med.id !== medicationId);
    localStorage.setItem(`medications_bed_${bedId}`, JSON.stringify(filtered));

    this.updateRelatedData(bedId, 'medication_removed', { medicationId });
  }

  // ================================
  // การจัดการข้อมูล I/O
  // ================================

  saveIORecord(bedId, ioData) {
    const patient = this.getPatient(bedId);
    const ioRecords = this.getIORecords(bedId);

    const enrichedIO = {
      ...ioData,
      id: Date.now().toString(),
      bedId: bedId,
      patientId: patient?.patient_id || 'ไม่ทราบ',
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleString('th-TH'),
      recordedBy: this.getCurrentUser()?.fullname || 'ไม่ทราบ'
    };

    ioRecords.unshift(enrichedIO);
    localStorage.setItem(`io_records_bed_${bedId}`, JSON.stringify(ioRecords));

    // อัพเดทสรุป I/O
    this.updateIOSummary(bedId);

    // อัพเดทข้อมูลที่เกี่ยวข้อง
    this.updateRelatedData(bedId, 'io_added', enrichedIO);

    return enrichedIO;
  }

  getIORecords(bedId) {
    return JSON.parse(localStorage.getItem(`io_records_bed_${bedId}`) || '[]');
  }

  updateIOSummary(bedId) {
    const records = this.getIORecords(bedId);
    let totalInput = 0;
    let totalOutput = 0;

    records.forEach(record => {
      totalInput += record.totalIn || 0;
      totalOutput += record.totalOut || 0;
    });

    const summary = {
      totalInput,
      totalOutput,
      balance: totalInput - totalOutput,
      recordCount: records.length,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(`io_summary_bed_${bedId}`, JSON.stringify(summary));
    return summary;
  }

  getIOSummary(bedId) {
    return JSON.parse(localStorage.getItem(`io_summary_bed_${bedId}`) || 'null');
  }

  // ================================
  // การจัดการบันทึกการดูแล
  // ================================

  addNote(bedId, noteContent, noteType = 'general') {
    const patient = this.getPatient(bedId);
    const notes = this.getNotes(bedId);

    const noteData = {
      id: Date.now().toString(),
      content: noteContent,
      type: noteType,
      bedId: bedId,
      patientId: patient?.patient_id || 'ไม่ทราบ',
      time: new Date().toLocaleString('th-TH'),
      timestamp: new Date().toISOString(),
      author: this.getCurrentUser()?.fullname || 'ไม่ทราบ'
    };

    notes.unshift(noteData);
    localStorage.setItem(`nurseNotes_${bedId}`, JSON.stringify(notes));

    // อัพเดทข้อมูลที่เกี่ยวข้อง
    this.updateRelatedData(bedId, 'note_added', noteData);

    return noteData;
  }

  getNotes(bedId) {
    return JSON.parse(localStorage.getItem(`nurseNotes_${bedId}`) || '[]');
  }

  // ================================
  // การจัดการข้อมูลการแจ้งเตือน
  // ================================

  saveAlert(bedId, alertData) {
    const alerts = this.getAlerts(bedId);
    const patient = this.getPatient(bedId);

    const enrichedAlert = {
      ...alertData,
      id: Date.now().toString(),
      bedId: bedId,
      patientId: patient?.patient_id || 'ไม่ทราบ',
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleString('th-TH'),
      acknowledged: false
    };

    alerts.unshift(enrichedAlert);
    localStorage.setItem(`alerts_bed_${bedId}`, JSON.stringify(alerts));

    return enrichedAlert;
  }

  getAlerts(bedId) {
    return JSON.parse(localStorage.getItem(`alerts_bed_${bedId}`) || '[]');
  }

  acknowledgeAlert(bedId, alertId) {
    const alerts = this.getAlerts(bedId);
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = this.getCurrentUser()?.fullname || 'ไม่ทราบ';
      localStorage.setItem(`alerts_bed_${bedId}`, JSON.stringify(alerts));
    }
  }

  // ================================
  // ฟังก์ชันช่วยเหลือ
  // ================================

  getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  }

  updateRelatedData(bedId, action, data) {
    // อัพเดทบันทึกโดยอัตโนมัติตาม action
    switch (action) {
      case 'patient_updated':
        this.addNote(bedId, `อัพเดทข้อมูลผู้ป่วย: ${data.patient_id} | ${data.medication} ${data.volume} @ ${data.rate} ดรอป/นาที`, 'patient_update');
        break;
      case 'vitals_updated':
        this.addNote(bedId, `บันทึก Vital Signs: BP ${data.systolic}/${data.diastolic}, HR ${data.heartRate}, Temp ${data.temperature}°C, O2 ${data.oxygen}%`, 'vital_signs');
        break;
      case 'medication_added':
        this.addNote(bedId, `เพิ่มกำหนดการยา: ${data.name} ${data.dose} เวลา ${data.time}`, 'medication_schedule');
        break;
      case 'io_added':
        this.addNote(bedId, `บันทึก I/O: Input ${data.totalIn}mL, Output ${data.totalOut}mL, Balance ${data.balance > 0 ? '+' : ''}${data.balance}mL`, 'fluid_balance');
        break;
    }
  }

  // ================================
  // การจัดการ Observer Pattern
  // ================================

  subscribe(key, callback) {
    if (!this.observers.has(key)) {
      this.observers.set(key, []);
    }
    this.observers.get(key).push(callback);
  }

  unsubscribe(key, callback) {
    if (this.observers.has(key)) {
      const callbacks = this.observers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyObservers(key, data) {
    if (this.observers.has(key)) {
      this.observers.get(key).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in observer callback:', error);
        }
      });
    }
  }

  // ================================
  // การสำรองและกู้คืนข้อมูล
  // ================================

  exportBedData(bedId) {
    return {
      patient: this.getPatient(bedId),
      vitals: this.getVitals(bedId),
      vitalsHistory: this.getVitalsHistory(bedId),
      medications: this.getMedications(bedId),
      ioRecords: this.getIORecords(bedId),
      ioSummary: this.getIOSummary(bedId),
      notes: this.getNotes(bedId),
      alerts: this.getAlerts(bedId),
      exportedAt: new Date().toISOString()
    };
  }

  importBedData(bedId, data) {
    if (data.patient) {
      this.savePatient(bedId, data.patient);
    }
    if (data.vitals) {
      this.saveVitals(bedId, data.vitals);
    }
    if (data.medications) {
      localStorage.setItem(`medications_bed_${bedId}`, JSON.stringify(data.medications));
    }
    if (data.ioRecords) {
      localStorage.setItem(`io_records_bed_${bedId}`, JSON.stringify(data.ioRecords));
    }
    if (data.notes) {
      localStorage.setItem(`nurseNotes_${bedId}`, JSON.stringify(data.notes));
    }
    if (data.alerts) {
      localStorage.setItem(`alerts_bed_${bedId}`, JSON.stringify(data.alerts));
    }
  }

  // ================================
  // สถิติและรายงาน
  // ================================

  getSystemSummary() {
    const summary = {
      totalBeds: 8,
      activeBeds: 0,
      totalPatients: 0,
      totalNotes: 0,
      totalIORecords: 0,
      totalVitals: 0,
      totalMedications: 0,
      totalAlerts: 0,
      criticalAlerts: 0,
      bedSummaries: []
    };

    for (let i = 1; i <= 8; i++) {
      const patient = this.getPatient(i);
      const vitals = this.getVitals(i);
      const medications = this.getMedications(i);
      const ioRecords = this.getIORecords(i);
      const notes = this.getNotes(i);
      const alerts = this.getAlerts(i);

      if (patient) {
        summary.activeBeds++;
        summary.totalPatients++;
      }

      summary.totalNotes += notes.length;
      summary.totalIORecords += ioRecords.length;
      summary.totalMedications += medications.length;
      summary.totalAlerts += alerts.length;

      if (vitals) summary.totalVitals++;

      // นับ critical alerts
      const criticalAlerts = alerts.filter(alert => alert.type === 'critical' && !alert.acknowledged);
      summary.criticalAlerts += criticalAlerts.length;

      summary.bedSummaries.push({
        bedId: i,
        hasPatient: !!patient,
        patientId: patient?.patient_id || null,
        hasVitals: !!vitals,
        notesCount: notes.length,
        ioCount: ioRecords.length,
        medicationsCount: medications.length,
        alertsCount: alerts.length,
        criticalAlertsCount: criticalAlerts.length
      });
    }

    return summary;
  }

  // ================================
  // การล้างข้อมูล
  // ================================

  clearBedData(bedId) {
    const keys = [
      `ir_data_bed_${bedId}`,
      `nurseNotes_${bedId}`,
      `io_records_bed_${bedId}`,
      `io_summary_bed_${bedId}`,
      `vitals_bed_${bedId}`,
      `vitals_history_bed_${bedId}`,
      `medications_bed_${bedId}`,
      `alerts_bed_${bedId}`,
      `flow_history_bed_${bedId}`
    ];

    keys.forEach(key => {
      localStorage.removeItem(key);
      this.cache.delete(key);
      this.lastUpdate.delete(key);
    });

    // แจ้งเตือน observers
    this.notifyObservers(`bed_${bedId}`, { action: 'cleared' });
  }

  clearAllData() {
    for (let i = 1; i <= 8; i++) {
      this.clearBedData(i);
    }
    this.cache.clear();
    this.lastUpdate.clear();
  }
}

// สร้าง instance หลักสำหรับใช้งานทั้งระบบ
const dataManager = new DataManager();

// Export สำหรับใช้งานในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataManager, dataManager };
}
