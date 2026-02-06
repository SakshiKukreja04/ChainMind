import type { Product, Vendor, Order, Approval, BlockchainRecord, AIInsight, Alert } from '@/types';

export const mockProducts: Product[] = [
  { id: '1', name: 'Paracetamol 500mg', sku: 'PHR-001', stock: 45, minStock: 100, vendorId: '1', vendorName: 'MediSupply Co', status: 'low-stock', price: 5.99, category: 'Pain Relief' },
  { id: '2', name: 'Amoxicillin 250mg', sku: 'PHR-002', stock: 200, minStock: 50, vendorId: '2', vendorName: 'PharmaDirect', status: 'in-stock', price: 12.50, category: 'Antibiotics' },
  { id: '3', name: 'Vitamin D3 1000IU', sku: 'PHR-003', stock: 0, minStock: 30, vendorId: '1', vendorName: 'MediSupply Co', status: 'out-of-stock', price: 8.99, category: 'Vitamins' },
  { id: '4', name: 'Ibuprofen 400mg', sku: 'PHR-004', stock: 150, minStock: 80, vendorId: '3', vendorName: 'HealthPlus Dist', status: 'in-stock', price: 6.49, category: 'Pain Relief' },
  { id: '5', name: 'Omeprazole 20mg', sku: 'PHR-005', stock: 25, minStock: 40, vendorId: '2', vendorName: 'PharmaDirect', status: 'low-stock', price: 15.00, category: 'Digestive' },
  { id: '6', name: 'Cetirizine 10mg', sku: 'PHR-006', stock: 300, minStock: 100, vendorId: '3', vendorName: 'HealthPlus Dist', status: 'in-stock', price: 4.99, category: 'Allergy' },
  { id: '7', name: 'Metformin 500mg', sku: 'PHR-007', stock: 180, minStock: 60, vendorId: '1', vendorName: 'MediSupply Co', status: 'in-stock', price: 9.99, category: 'Diabetes' },
  { id: '8', name: 'Aspirin 100mg', sku: 'PHR-008', stock: 15, minStock: 50, vendorId: '2', vendorName: 'PharmaDirect', status: 'low-stock', price: 3.99, category: 'Pain Relief' },
];

export const mockVendors: Vendor[] = [
  { id: '1', name: 'MediSupply Co', email: 'orders@medisupply.com', phone: '+1 555-0101', reliabilityScore: 94, leadTime: 3, status: 'active', productsCount: 156 },
  { id: '2', name: 'PharmaDirect', email: 'sales@pharmadirect.com', phone: '+1 555-0102', reliabilityScore: 88, leadTime: 5, status: 'active', productsCount: 234 },
  { id: '3', name: 'HealthPlus Dist', email: 'info@healthplus.com', phone: '+1 555-0103', reliabilityScore: 91, leadTime: 4, status: 'active', productsCount: 189 },
  { id: '4', name: 'Global Pharma Inc', email: 'orders@globalpharma.com', phone: '+1 555-0104', reliabilityScore: 76, leadTime: 7, status: 'pending', productsCount: 0 },
];

export const mockOrders: Order[] = [
  { id: 'ORD-001', productId: '1', productName: 'Paracetamol 500mg', vendorId: '1', vendorName: 'MediSupply Co', quantity: 500, status: 'pending', createdAt: '2024-01-15', estimatedDelivery: '2024-01-18', totalAmount: 2995.00 },
  { id: 'ORD-002', productId: '3', productName: 'Vitamin D3 1000IU', vendorId: '1', vendorName: 'MediSupply Co', quantity: 200, status: 'approved', createdAt: '2024-01-14', estimatedDelivery: '2024-01-17', totalAmount: 1798.00 },
  { id: 'ORD-003', productId: '5', productName: 'Omeprazole 20mg', vendorId: '2', vendorName: 'PharmaDirect', quantity: 100, status: 'dispatched', createdAt: '2024-01-13', estimatedDelivery: '2024-01-18', totalAmount: 1500.00 },
  { id: 'ORD-004', productId: '8', productName: 'Aspirin 100mg', vendorId: '2', vendorName: 'PharmaDirect', quantity: 300, status: 'in-transit', createdAt: '2024-01-12', estimatedDelivery: '2024-01-16', totalAmount: 1197.00 },
  { id: 'ORD-005', productId: '2', productName: 'Amoxicillin 250mg', vendorId: '2', vendorName: 'PharmaDirect', quantity: 150, status: 'delivered', createdAt: '2024-01-10', estimatedDelivery: '2024-01-14', totalAmount: 1875.00 },
];

export const mockApprovals: Approval[] = [
  { id: 'APR-001', type: 'reorder', title: 'Urgent Reorder: Paracetamol 500mg', description: 'Stock below minimum threshold. Recommended order: 500 units', costImpact: 2995.00, riskLevel: 'high', requestedBy: 'John Smith', createdAt: '2024-01-15', status: 'pending' },
  { id: 'APR-002', type: 'vendor-onboarding', title: 'New Vendor: Global Pharma Inc', description: 'Bulk supplier with competitive pricing for generic medications', costImpact: 0, riskLevel: 'medium', requestedBy: 'Sarah Johnson', createdAt: '2024-01-14', status: 'pending' },
  { id: 'APR-003', type: 'cooperative-buy', title: 'Cooperative Buy: Vitamin D3 Bulk', description: 'Joint purchase with 3 other pharmacies for 20% discount', costImpact: -1500.00, riskLevel: 'low', requestedBy: 'Mike Chen', createdAt: '2024-01-13', status: 'pending' },
  { id: 'APR-004', type: 'reorder', title: 'Restock: Omeprazole 20mg', description: 'Approaching minimum stock level. Suggested order: 100 units', costImpact: 1500.00, riskLevel: 'medium', requestedBy: 'John Smith', createdAt: '2024-01-12', status: 'pending' },
];

export const mockBlockchainRecords: BlockchainRecord[] = [
  { id: 'BC-001', orderId: 'ORD-005', hash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', timestamp: '2024-01-14 14:32:00', status: 'verified', action: 'Order Delivered' },
  { id: 'BC-002', orderId: 'ORD-004', hash: '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658', timestamp: '2024-01-13 09:15:00', status: 'verified', action: 'Order Dispatched' },
  { id: 'BC-003', orderId: 'ORD-003', hash: '0x3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d', timestamp: '2024-01-13 08:45:00', status: 'verified', action: 'Order Dispatched' },
  { id: 'BC-004', orderId: 'ORD-002', hash: '0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', timestamp: '2024-01-14 16:00:00', status: 'verified', action: 'Order Approved' },
  { id: 'BC-005', orderId: 'ORD-001', hash: '0x5d5b09f6dcb2d53a5fffc60c4ac0d55fabdf556069d6631545f42aa6e3500f2e', timestamp: '2024-01-15 10:30:00', status: 'pending', action: 'Order Created' },
];

export const mockAIInsights: AIInsight[] = [
  { id: 'AI-001', type: 'warning', title: 'Stock-out Risk: Vitamin D3', description: 'Based on current sales velocity, stock will be depleted in 3 days. Recommend immediate reorder.', impact: 'Potential revenue loss of $2,400', priority: 'high' },
  { id: 'AI-002', type: 'opportunity', title: 'Cost Saving: Bulk Purchase', description: 'Paracetamol pricing 15% lower if ordered in quantities of 1000+. 3 nearby pharmacies interested in cooperative buy.', impact: 'Potential savings of $450/month', priority: 'medium' },
  { id: 'AI-003', type: 'risk', title: 'Vendor Risk: PharmaDirect', description: 'Recent delivery delays (avg 2 days late). Consider diversifying critical medication suppliers.', impact: 'May affect 12 product lines', priority: 'medium' },
  { id: 'AI-004', type: 'opportunity', title: 'Demand Forecast: Allergy Season', description: 'Predicted 40% increase in antihistamine demand next month. Current stock may be insufficient.', impact: 'Opportunity to capture $5,200 additional sales', priority: 'high' },
  { id: 'AI-005', type: 'warning', title: 'Overstock Alert: Cetirizine', description: 'Current stock exceeds 90-day supply. Consider promotional pricing to reduce inventory holding costs.', impact: '$890 tied up in excess inventory', priority: 'low' },
];

export const mockAlerts: Alert[] = [
  { id: 'ALT-001', type: 'stock', title: 'Low Stock Alert', message: 'Paracetamol 500mg stock is below minimum threshold', severity: 'warning', createdAt: '2024-01-15 08:00:00', read: false },
  { id: 'ALT-002', type: 'delivery', title: 'Delivery Delayed', message: 'ORD-004 delivery delayed by 1 day', severity: 'info', createdAt: '2024-01-15 07:30:00', read: false },
  { id: 'ALT-003', type: 'stock', title: 'Out of Stock', message: 'Vitamin D3 1000IU is now out of stock', severity: 'error', createdAt: '2024-01-14 16:00:00', read: true },
  { id: 'ALT-004', type: 'vendor', title: 'New Vendor Application', message: 'Global Pharma Inc has applied for vendor registration', severity: 'info', createdAt: '2024-01-14 10:00:00', read: true },
];

export const dashboardStats = {
  smeOwner: {
    totalProducts: 156,
    totalVendors: 12,
    stockAtRisk: 8,
    todaysSales: 4250.00,
    pendingApprovals: 4,
    inventoryHealth: 78,
    overstockValue: 12500,
    requiredStock: 8900,
    cashTiedUp: 45000,
  },
  inventoryManager: {
    productsBelowThreshold: 4,
    ordersPending: 3,
    deliveriesToday: 2,
    activeAlerts: 5,
  },
  vendor: {
    activeOrders: 8,
    pendingDeliveries: 3,
    totalProducts: 45,
    performanceScore: 92,
  },
};

export const salesData = [
  { month: 'Jan', sales: 4000, forecast: 4200 },
  { month: 'Feb', sales: 3000, forecast: 3500 },
  { month: 'Mar', sales: 5000, forecast: 4800 },
  { month: 'Apr', sales: 4500, forecast: 4600 },
  { month: 'May', sales: 6000, forecast: 5500 },
  { month: 'Jun', sales: 5500, forecast: 5800 },
];

export const inventoryTurnoverData = [
  { category: 'Pain Relief', turnover: 8.5 },
  { category: 'Antibiotics', turnover: 6.2 },
  { category: 'Vitamins', turnover: 4.8 },
  { category: 'Digestive', turnover: 5.5 },
  { category: 'Allergy', turnover: 7.2 },
];

export const vendorComparisonData = [
  { name: 'MediSupply Co', reliability: 94, leadTime: 3, pricing: 85 },
  { name: 'PharmaDirect', reliability: 88, leadTime: 5, pricing: 90 },
  { name: 'HealthPlus Dist', reliability: 91, leadTime: 4, pricing: 82 },
];
