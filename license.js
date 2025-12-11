/**
 * License Manager - Handles offline license validation with HWID binding
 */

const fs = require('fs');
const path = require('path');
const { machineIdSync } = require('node-machine-id');

class LicenseManager {
  constructor(app) {
    this.userDataPath = app.getPath('userData');
    this.licensePath = path.join(this.userDataPath, 'license.json');
    this.keysPath = path.join(__dirname, 'keys.json');
    this.validKeys = this.loadKeys();
  }

  loadKeys() {
    try {
      return JSON.parse(fs.readFileSync(this.keysPath, 'utf-8'));
    } catch {
      console.error('keys.json not found or invalid');
      return [];
    }
  }

  getHWID() {
    return machineIdSync({ original: true });
  }

  checkLicense() {
    if (!fs.existsSync(this.licensePath)) return false;
    try {
      const lic = JSON.parse(fs.readFileSync(this.licensePath, 'utf-8'));
      const hwid = this.getHWID();
      return this.validKeys.includes(lic.key) && lic.hwid === hwid;
    } catch {
      return false;
    }
  }

  getLicenseInfo() {
    if (!fs.existsSync(this.licensePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.licensePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  activate(key) {
    const upperKey = key.toUpperCase().trim();
    if (!this.validKeys.includes(upperKey)) {
      return { success: false, message: 'Invalid product key.' };
    }
    const hwid = this.getHWID();
    const licData = { 
      key: upperKey, 
      hwid, 
      activatedAt: new Date().toISOString(),
      appVersion: '1.0.0'
    };
    try {
      fs.writeFileSync(this.licensePath, JSON.stringify(licData, null, 2), 'utf-8');
      return { success: true, message: 'Activation successful!' };
    } catch (e) {
      return { success: false, message: 'Failed to save license: ' + e.message };
    }
  }

  deactivate() {
    try {
      if (fs.existsSync(this.licensePath)) {
        fs.unlinkSync(this.licensePath);
      }
      return { success: true, message: 'License deactivated.' };
    } catch (e) {
      return { success: false, message: 'Failed to deactivate: ' + e.message };
    }
  }
}

module.exports = LicenseManager;
