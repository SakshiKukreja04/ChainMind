require('../src/config/env');
const { connectDB } = require('../src/config/db');
const Order = require('../src/models/Order.model');

connectDB().then(async () => {
  const result = await Order.updateMany(
    { status: 'DELIVERED', deliveredAt: null },
    [{ $set: { deliveredAt: { $ifNull: ['$actualDeliveryDate', '$updatedAt'] } } }]
  );
  console.log('Backfilled', result.modifiedCount, 'orders');
  process.exit(0);
});
