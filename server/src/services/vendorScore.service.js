/**
 * Vendor Score Service
 * Recalculates vendor reliability score after order events
 *
 * Scoring approach (per spec):
 *   Base score:  100
 *   Delay penalty:  −10  (delivered after expected date)
 *   Completion bonus: +5  (order successfully delivered)
 *   Order cancellation: −20
 *
 * Delta-based increments (quick path)
 *   ON_TIME   → +5
 *   DELAYED   → −10
 *   CANCELLED → −20
 *   COMPLETED → +3
 *
 * Full recalculation uses aggregate delivery history.
 * Score is clamped 0 – 100.
 */

const { Vendor, Order } = require('../models');
const { getSocket } = require('../sockets');

/**
 * Delta scoring constants (quick path)
 */
const SCORE = {
  ON_TIME_DELIVERY: 5,
  DELAYED_DELIVERY: -10,
  ORDER_CANCELLED: -20,
  ORDER_COMPLETED: 3,
};

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/**
 * Quick delta-based score update (existing behaviour preserved)
 */
const updateVendorScore = async (vendorId, deliveryStatus) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error(`Vendor ${vendorId} not found`);

  let delta = 0;
  switch (deliveryStatus) {
    case 'ON_TIME':   delta = SCORE.ON_TIME_DELIVERY; break;
    case 'DELAYED':   delta = SCORE.DELAYED_DELIVERY; break;
    case 'CANCELLED': delta = SCORE.ORDER_CANCELLED;  break;
    case 'COMPLETED': delta = SCORE.ORDER_COMPLETED;  break;
    default:
      console.warn(`Unknown delivery status: ${deliveryStatus}`);
      return vendor;
  }

  const previousScore = vendor.reliabilityScore;
  vendor.reliabilityScore = clamp(vendor.reliabilityScore + delta);

  if (deliveryStatus === 'COMPLETED' || deliveryStatus === 'ON_TIME') {
    vendor.totalOrders = (vendor.totalOrders || 0) + 1;
  }

  await vendor.save();
  emitScoreUpdate(vendor, previousScore, deliveryStatus, delta);

  return {
    vendorId: vendor._id,
    name: vendor.name,
    previousScore,
    reliabilityScore: vendor.reliabilityScore,
    event: deliveryStatus,
  };
};

/**
 * Full recalculation of reliability score based on delivery history.
 * Called after every DELIVERED order.
 *
 * Formula:
 *   Start at 100
 *   For each delivered order:
 *     +5  completion bonus
 *     −10 if delivered after expectedDeliveryDate (delay penalty)
 *   For each VENDOR_REJECTED order:
 *     −20
 *   Clamp [0, 100]
 *
 * Also updates performanceMetrics.onTimeDeliveryRate and totalOrders.
 */
const recalculateReliabilityScore = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error(`Vendor ${vendorId} not found`);

  const previousScore = vendor.reliabilityScore;

  // Pull all completed + rejected orders for this vendor
  const orders = await Order.find({
    vendorId,
    status: { $in: ['DELIVERED', 'VENDOR_REJECTED'] },
  }).select('status expectedDeliveryDate actualDeliveryDate deliveredAt').lean();

  let score = 100;
  let deliveredCount = 0;
  let onTimeCount = 0;
  let rejectedCount = 0;

  for (const o of orders) {
    if (o.status === 'DELIVERED') {
      deliveredCount++;
      score += 5; // completion bonus

      const deliverDate = o.actualDeliveryDate || o.deliveredAt;
      const isOnTime = !o.expectedDeliveryDate || !deliverDate || deliverDate <= o.expectedDeliveryDate;
      if (isOnTime) {
        onTimeCount++;
      } else {
        score -= 10; // delay penalty
      }
    } else if (o.status === 'VENDOR_REJECTED') {
      rejectedCount++;
      score -= 20;
    }
  }

  vendor.reliabilityScore = clamp(score);
  vendor.totalOrders = deliveredCount + rejectedCount;

  const onTimeRate = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 0;
  vendor.performanceMetrics = vendor.performanceMetrics || {};
  vendor.performanceMetrics.onTimeDeliveryRate = onTimeRate;

  await vendor.save();
  emitScoreUpdate(vendor, previousScore, 'RECALCULATED', vendor.reliabilityScore - previousScore);

  console.log(
    `✓ Vendor score recalculated: ${vendor.name} ${previousScore} → ${vendor.reliabilityScore} ` +
    `(delivered=${deliveredCount}, onTime=${onTimeCount}, rejected=${rejectedCount})`,
  );

  return {
    vendorId: vendor._id,
    name: vendor.name,
    previousScore,
    reliabilityScore: vendor.reliabilityScore,
    onTimeDeliveryRate: onTimeRate,
    totalOrders: vendor.totalOrders,
  };
};

/**
 * Emit real-time score update over Socket.IO
 */
function emitScoreUpdate(vendor, previousScore, event, delta) {
  try {
    const io = getSocket();
    io.emit('vendor:score-updated', {
      id: vendor._id,
      name: vendor.name,
      previousScore,
      reliabilityScore: vendor.reliabilityScore,
      event,
      delta,
    });
  } catch {
    // Socket may not be initialized in tests
  }
}

module.exports = {
  updateVendorScore,
  recalculateReliabilityScore,
  SCORE,
};
