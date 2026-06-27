const AuditLog = require('../models/AuditLog');

/**
 * Creates an entry in the AuditLog collection.
 * 
 * @param {string} userId - ID of the user executing the action
 * @param {string} username - Name of the user (or 'System')
 * @param {string} action - Action category (e.g. 'Create Product')
 * @param {string} target - Subject item (e.g. 'Product D0001')
 * @param {string} details - Detailed summary of what changed
 * @param {string} ipAddress - Client IP address
 */
const logAction = async (userId, username, action, target, details = '', ipAddress = '') => {
  try {
    const log = new AuditLog({
      user: userId || null,
      username: username || 'System',
      action,
      target,
      details,
      ipAddress
    });
    await log.save();
  } catch (error) {
    console.error(`Audit logging failed: ${error.message}`);
  }
};

module.exports = { logAction };
