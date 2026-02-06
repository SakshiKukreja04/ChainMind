/**
 * Vendor Score Service
 * Recalculates vendor reliability score after order events
 *
 * Scoring factors:
 *   On-time delivery   → +5
 *   Delayed delivery   → −10
 *   Order cancellation → −20
 *   Completed order    → +3
 *
 * Score is clamped between 0 and 100.
 */

const { Vendor } = require('../models');
const { getSocket } = require('../sockets');

/**
 * Scoring constants
 */
const SCORE = {
  ON_TIME_DELIVERY: 5,
  DELAYED_DELIVERY: -10,
  ORDER_CANCELLED: -20,
  ORDER_COMPLETED: 3,
};

/**
 * Clamp a number between min and max
 */
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/**
 * Update vendor reliability score based on delivery event
 *
 * @param {string} vendorId  - Vendor document _id
 * @param {'ON_TIME'|'DELAYED'|'CANCELLED'|'COMPLETED'} deliveryStatus
 * @returns {Promise<object>} Updated vendor with new score
 */
const updateVendorScore = async (vendorId, deliveryStatus) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error(`Vendor ${vendorId} not found`);
  }

  let delta = 0;
  switch (deliveryStatus) {
    case 'ON_TIME':
      delta = SCORE.ON_TIME_DELIVERY;
      break;
    case 'DELAYED':
      delta = SCORE.DELAYED_DELIVERY;
      break;
    case 'CANCELLED':
      delta = SCORE.ORDER_CANCELLED;
      break;
    case 'COMPLETED':
      delta = SCORE.ORDER_COMPLETED;
      break;
    default:
      console.warn(`Unknown delivery status: ${deliveryStatus}`);
      return vendor;
  }

  const previousScore = vendor.reliabilityScore;
  vendor.reliabilityScore = clamp(vendor.reliabilityScore + delta);

  // Update total orders on completion
  if (deliveryStatus === 'COMPLETED' || deliveryStatus === 'ON_TIME') {
    vendor.totalOrders = (vendor.totalOrders || 0) + 1;
  }

  await vendor.save();

  // Emit real-time score update
  try {
    const io = getSocket();
    io.emit('vendor:score-updated', {
      id: vendor._id,
      name: vendor.name,
      previousScore,
      reliabilityScore: vendor.reliabilityScore,
      event: deliveryStatus,
      delta,
    });
  } catch {
    // Socket may not be initialized in tests
  }

  console.log(
    `✓ Vendor score updated: ${vendor.name} ${previousScore} → ${vendor.reliabilityScore} (${deliveryStatus}: ${delta > 0 ? '+' : ''}${delta})`,
  );

  return {
    vendorId: vendor._id,
    name: vendor.name,
    previousScore,
    reliabilityScore: vendor.reliabilityScore,
    event: deliveryStatus,
  };
};

module.exports = {
  updateVendorScore,
  SCORE,
};
