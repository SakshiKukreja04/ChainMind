/**
 * Vendor Controller
 * Onboarding workflow, approval, listing, and scoring
 */

const { Vendor, User, Business } = require('../models');
const { getSocket } = require('../sockets');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVendorCredentials } = require('../services/emailService');

/**
 * POST /api/vendors
 * Inventory Manager submits a new vendor request
 * Access: MANAGER only
 */
const submitVendor = async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { name, contact, email, leadTimeDays, productsSupplied } = req.body;

    if (!name || !contact) {
      return res.status(400).json({
        success: false,
        message: '"name" and "contact" are required',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid vendor email address is required',
      });
    }

    const vendor = await Vendor.create({
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim().toLowerCase(),
      leadTimeDays: leadTimeDays || 7,
      productsSupplied: productsSupplied || [],
      businessId,
      submittedBy: userId,
      status: 'PENDING',
      reliabilityScore: 0,
      isApproved: false,
    });

    await vendor.populate('submittedBy', 'name email');

    const payload = {
      id: vendor._id,
      name: vendor.name,
      contact: vendor.contact,
      email: vendor.email,
      leadTimeDays: vendor.leadTimeDays,
      productsSupplied: vendor.productsSupplied,
      status: vendor.status,
      reliabilityScore: vendor.reliabilityScore,
      submittedBy: {
        id: vendor.submittedBy?._id,
        name: vendor.submittedBy?.name,
        email: vendor.submittedBy?.email,
      },
      businessId: vendor.businessId,
      createdAt: vendor.createdAt,
    };

    // Real-time notification to Owner dashboard
    const io = getSocket();
    io.emit('vendor:pending-approval', payload);

    console.log(`✓ Vendor request submitted: ${vendor.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Vendor request submitted for approval',
      vendor: payload,
    });
  } catch (error) {
    console.error('Submit Vendor Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit vendor', error: error.message });
  }
};

/**
 * GET /api/vendors/pending
 * List vendors awaiting approval
 * Access: OWNER only
 */
const getPendingVendors = async (req, res) => {
  try {
    const { businessId } = req.user;

    const vendors = await Vendor.find({ businessId, status: 'PENDING' })
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors: vendors.map((v) => ({
        id: v._id,
        name: v.name,
        contact: v.contact,
        email: v.email,
        leadTimeDays: v.leadTimeDays,
        productsSupplied: v.productsSupplied,
        status: v.status,
        reliabilityScore: v.reliabilityScore,
        submittedBy: {
          id: v.submittedBy?._id,
          name: v.submittedBy?.name,
          email: v.submittedBy?.email,
        },
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get Pending Vendors Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pending vendors', error: error.message });
  }
};

/**
 * GET /api/vendors
 * List all vendors for the business (any status)
 * Access: OWNER or MANAGER
 */
const getVendors = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { status } = req.query;

    const filter = { businessId, isActive: true };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      filter.status = status;
    }

    const vendors = await Vendor.find(filter)
      .populate('submittedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors: vendors.map((v) => ({
        id: v._id,
        name: v.name,
        contact: v.contact,
        email: v.email,
        leadTimeDays: v.leadTimeDays,
        productsSupplied: v.productsSupplied,
        status: v.status,
        reliabilityScore: v.reliabilityScore,
        totalOrders: v.totalOrders,
        paymentTerms: v.paymentTerms,
        rating: v.rating,
        isApproved: v.isApproved,
        submittedBy: {
          id: v.submittedBy?._id,
          name: v.submittedBy?.name,
          email: v.submittedBy?.email,
        },
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get Vendors Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch vendors', error: error.message });
  }
};

/**
 * GET /api/vendors/:id
 * Get single vendor details
 * Access: OWNER or MANAGER
 */
const getVendor = async (req, res) => {
  try {
    const { businessId } = req.user;
    const vendor = await Vendor.findOne({ _id: req.params.id, businessId })
      .populate('submittedBy', 'name email');

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        contact: vendor.contact,
        email: vendor.email,
        leadTimeDays: vendor.leadTimeDays,
        productsSupplied: vendor.productsSupplied,
        status: vendor.status,
        reliabilityScore: vendor.reliabilityScore,
        totalOrders: vendor.totalOrders,
        paymentTerms: vendor.paymentTerms,
        rating: vendor.rating,
        isApproved: vendor.isApproved,
        performanceMetrics: vendor.performanceMetrics,
        submittedBy: {
          id: vendor.submittedBy?._id,
          name: vendor.submittedBy?.name,
          email: vendor.submittedBy?.email,
        },
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get Vendor Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor', error: error.message });
  }
};

/**
 * PUT /api/vendors/:id/approve
 * SME Owner approves a vendor
 * → Auto-creates a VENDOR user account
 * → Emails login credentials to the vendor
 * Access: OWNER only
 */
const approveVendor = async (req, res) => {
  try {
    const { businessId } = req.user;

    const vendor = await Vendor.findOne({ _id: req.params.id, businessId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Vendor is already ${vendor.status.toLowerCase()}`,
      });
    }

    // Use the email stored during vendor submission
    const vendorEmail = vendor.email;
    if (!vendorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Vendor has no valid email on file. Cannot create login credentials.',
      });
    }

    vendor.status = 'APPROVED';
    vendor.isApproved = true;
    vendor.reliabilityScore = 100; // Initial trust score
    await vendor.save();

    // ── Auto-create VENDOR user account ─────────────────────────
    let vendorUser = null;
    let tempPassword = null;

    // Check if a user with this email already exists
    {
      const existingUser = await User.findOne({ email: vendorEmail.toLowerCase() });

      if (!existingUser) {
        // Generate strong random 12-char password
        tempPassword = crypto.randomBytes(9).toString('base64url'); // ~12 chars
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        vendorUser = await User.create({
          name: vendor.name,
          email: vendorEmail.toLowerCase(),
          passwordHash,
          role: 'VENDOR',
          businessId,
          vendorEntityId: vendor._id,
          isActive: true,
          mustChangePassword: true,
        });

        console.log(`✓ Vendor user auto-created: ${vendorUser.email} (vendorEntityId: ${vendor._id})`);

        // Send credentials by email (non-blocking, don't fail approval if email fails)
        const loginUrl = `${req.protocol}://${req.get('host')}`.replace(':5000', ':8080') + '/login';
        sendVendorCredentials(vendorEmail, vendor.name, tempPassword, loginUrl).catch((err) => {
          console.error(`⚠ Failed to email credentials to ${vendorEmail}:`, err.message);
          // Log credentials as fallback when email fails (for manual sharing)
          console.log(`📋 MANUAL CREDENTIAL FALLBACK for ${vendor.name}:`);
          console.log(`   Email: ${vendorEmail}`);
          console.log(`   Temporary Password: ${tempPassword}`);
          console.log(`   Login URL: ${loginUrl}`);
        });
      } else {
        // Link existing user to vendor entity if not already linked
        if (!existingUser.vendorEntityId) {
          existingUser.vendorEntityId = vendor._id;
          await existingUser.save();
        }
        vendorUser = existingUser;
        console.log(`✓ Existing user ${vendorEmail} linked to vendor ${vendor.name}`);
      }
    }

    await vendor.populate('submittedBy', 'name email');

    const payload = {
      id: vendor._id,
      name: vendor.name,
      contact: vendor.contact,
      email: vendor.email,
      status: vendor.status,
      reliabilityScore: vendor.reliabilityScore,
      submittedBy: {
        id: vendor.submittedBy?._id,
        name: vendor.submittedBy?.name,
      },
      vendorUserId: vendorUser?._id || null,
    };

    const io = getSocket();
    io.emit('vendor:approved', payload);

    console.log(`✓ Vendor approved: ${vendor.name}`);

    res.status(200).json({
      success: true,
      message: `Vendor "${vendor.name}" approved` +
        (vendorUser ? '. Login credentials sent to ' + vendorEmail : ''),
      vendor: payload,
    });
  } catch (error) {
    console.error('Approve Vendor Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to approve vendor', error: error.message });
  }
};

/**
 * PUT /api/vendors/:id/reject
 * SME Owner rejects a vendor
 * Access: OWNER only
 */
const rejectVendor = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { reason } = req.body;

    const vendor = await Vendor.findOne({ _id: req.params.id, businessId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Vendor is already ${vendor.status.toLowerCase()}`,
      });
    }

    vendor.status = 'REJECTED';
    vendor.isApproved = false;
    await vendor.save();

    await vendor.populate('submittedBy', 'name email');

    const payload = {
      id: vendor._id,
      name: vendor.name,
      contact: vendor.contact,
      status: vendor.status,
      reason: reason || 'No reason provided',
      submittedBy: {
        id: vendor.submittedBy?._id,
        name: vendor.submittedBy?.name,
      },
    };

    const io = getSocket();
    io.emit('vendor:rejected', payload);

    console.log(`✗ Vendor rejected: ${vendor.name}`);

    res.status(200).json({
      success: true,
      message: `Vendor "${vendor.name}" rejected`,
      vendor: payload,
    });
  } catch (error) {
    console.error('Reject Vendor Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject vendor', error: error.message });
  }
};

/**
 * POST /api/vendors/:id/resend-credentials
 * Resend/reset vendor login credentials
 * → Generates new temporary password
 * → Emails it (or logs to console if email fails)
 * Access: OWNER only
 */
const resendVendorCredentials = async (req, res) => {
  try {
    const { businessId } = req.user;

    const vendor = await Vendor.findOne({ _id: req.params.id, businessId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Can only resend credentials for approved vendors',
      });
    }

    // Find the vendor's user account
    const vendorUser = await User.findOne({
      email: vendor.email.toLowerCase(),
      vendorEntityId: vendor._id,
    });

    if (!vendorUser) {
      return res.status(404).json({
        success: false,
        message: 'No user account found for this vendor',
      });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    vendorUser.passwordHash = passwordHash;
    vendorUser.mustChangePassword = true;
    await vendorUser.save();

    // Build login URL
    const loginUrl = `${req.protocol}://${req.get('host')}`.replace(':5000', ':8080') + '/login';

    // Try to email, with console fallback
    let emailSent = false;
    try {
      await sendVendorCredentials(vendor.email, vendor.name, tempPassword, loginUrl);
      emailSent = true;
      console.log(`✓ Credentials resent to ${vendor.email}`);
    } catch (err) {
      console.error(`⚠ Failed to email credentials to ${vendor.email}:`, err.message);
      console.log(`📋 MANUAL CREDENTIAL FALLBACK for ${vendor.name}:`);
      console.log(`   Email: ${vendor.email}`);
      console.log(`   Temporary Password: ${tempPassword}`);
      console.log(`   Login URL: ${loginUrl}`);
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? `Credentials sent to ${vendor.email}`
        : `Password reset. Email failed - check server logs for credentials.`,
      emailSent,
      // Include credentials in response for admin to share manually
      credentials: {
        email: vendor.email,
        temporaryPassword: tempPassword,
        loginUrl,
        note: 'Share these securely with the vendor',
      },
    });
  } catch (error) {
    console.error('Resend Vendor Credentials Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to resend credentials', error: error.message });
  }
};

/**
 * GET /api/vendor/my-profile
 * Get the logged-in vendor's own profile
 * Access: VENDOR only
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user || !user.vendorEntityId) {
      return res.status(404).json({ success: false, message: 'Vendor entity not linked to your account' });
    }

    const vendor = await Vendor.findById(user.vendorEntityId)
      .populate('businessId', 'businessName location industry currency')
      .lean();

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor record not found' });
    }

    res.json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        contact: vendor.contact,
        email: vendor.email || user.email,
        phone: user.phone || vendor.contact,
        address: vendor.address || null,
        leadTimeDays: vendor.leadTimeDays,
        productsSupplied: vendor.productsSupplied,
        status: vendor.status,
        reliabilityScore: vendor.reliabilityScore,
        totalOrders: vendor.totalOrders || 0,
        paymentTerms: vendor.paymentTerms,
        rating: vendor.rating,
        performanceMetrics: vendor.performanceMetrics,
        business: vendor.businessId ? {
          id: vendor.businessId._id,
          name: vendor.businessId.businessName,
          location: vendor.businessId.location,
          industry: vendor.businessId.industry,
        } : null,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
      },
    });
  } catch (error) {
    console.error('Get My Vendor Profile Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor profile', error: error.message });
  }
};

/**
 * PUT /api/vendor/my-profile
 * Update the logged-in vendor's own profile fields
 * Access: VENDOR only
 */
const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.vendorEntityId) {
      return res.status(404).json({ success: false, message: 'Vendor entity not linked to your account' });
    }

    const vendor = await Vendor.findById(user.vendorEntityId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor record not found' });
    }

    const { name, contact, email, phone, address, productsSupplied, paymentTerms } = req.body;

    if (name) vendor.name = name.trim();
    if (contact) vendor.contact = contact.trim();
    if (email) vendor.email = email.trim().toLowerCase();
    if (address !== undefined) vendor.address = address;
    if (productsSupplied) vendor.productsSupplied = productsSupplied;
    if (paymentTerms) vendor.paymentTerms = paymentTerms;

    await vendor.save();

    // Also update user fields if changed
    if (name) user.name = name.trim();
    if (phone) user.phone = phone;
    if (email) user.email = email.trim().toLowerCase();
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        contact: vendor.contact,
        email: vendor.email,
        address: vendor.address,
        leadTimeDays: vendor.leadTimeDays,
        productsSupplied: vendor.productsSupplied,
        reliabilityScore: vendor.reliabilityScore,
        totalOrders: vendor.totalOrders,
        paymentTerms: vendor.paymentTerms,
        rating: vendor.rating,
      },
    });
  } catch (error) {
    console.error('Update Vendor Profile Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update vendor profile', error: error.message });
  }
};

module.exports = {
  submitVendor,
  getPendingVendors,
  getVendors,
  getVendor,
  approveVendor,
  rejectVendor,
  resendVendorCredentials,
  getMyProfile,
  updateMyProfile,
};
