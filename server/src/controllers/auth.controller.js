/**
 * Authentication Controller
 * Handles user signup, login, and token generation
 */

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { User, Business } = require('../models');
const { generateToken, verifyToken } = require('../utils/jwt');

/**
 * SIGNUP - Create new user account
 * POST /api/auth/signup
 *
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123",
 *   "role": "OWNER" | "MANAGER" | "VENDOR",
 *   "businessId": "optional" (required for MANAGER/VENDOR)
 * }
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, role, businessId } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    // Validate role
    if (!['OWNER', 'MANAGER', 'VENDOR'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be OWNER, MANAGER, or VENDOR',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // MANAGER and VENDOR need existing businessId
    if (['MANAGER', 'VENDOR'].includes(role)) {
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: `${role} role requires existing businessId`,
        });
      }

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found',
        });
      }
    }

    // Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // For OWNER role, create the Business FIRST, then create the User with businessId
    let business = null;
    let userBusinessId = businessId || null;

    if (role === 'OWNER') {
      // Extract business details from request (frontend sends these)
      const { businessName, industry, location, currency } = req.body;

      // Create a temporary ObjectId for the owner (will be updated after user creation)
      const tempOwnerId = new mongoose.Types.ObjectId();

      business = new Business({
        businessName: businessName || `${name}'s Business`,
        industry: industry || 'Not specified',
        location: location || 'Not specified',
        currency: currency || 'USD',
        ownerId: tempOwnerId, // Temporary, will be updated
        isActive: true,
      });
      await business.save();
      userBusinessId = business._id;
    }

    // Create new user with businessId already set
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: role,
      businessId: userBusinessId,
      isActive: true,
    });

    await newUser.save();

    // If OWNER, update the business with the correct ownerId
    if (role === 'OWNER' && business) {
      business.ownerId = newUser._id;
      await business.save();
    }

    // Generate JWT token
    const token = generateToken({
      userId: newUser._id,
      role: newUser.role,
      businessId: newUser.businessId,
    });

    console.log(`✓ User registered: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        businessId: newUser.businessId,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

/**
 * LOGIN - Authenticate user and return JWT
 * POST /api/auth/login
 *
 * Request body:
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      });
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      role: user.role,
      businessId: user.businessId,
    });

    console.log(`✓ User logged in: ${email} (${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      mustChangePassword: !!user.mustChangePassword,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * VERIFY - Verify JWT token (optional endpoint for frontend)
 * GET /api/auth/verify
 * Headers: Authorization: Bearer <token>
 */
const verify = async (req, res) => {
  try {
    // User is already verified by middleware
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (error) {
    console.error('Verify Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message,
    });
  }
};

/**
 * INVITE TEAM MEMBER - Create a new team member (MANAGER or VENDOR)
 * POST /api/auth/invite
 * Headers: Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   "name": "Team Member Name",
 *   "email": "member@example.com",
 *   "password": "tempPassword123",
 *   "role": "MANAGER" | "VENDOR"
 * }
 * 
 * Only OWNER can invite team members
 */
const inviteTeamMember = async (req, res) => {
  try {
    const { name, email, password, role, vendorEntityId } = req.body;
    const inviterId = req.user.userId;

    // Get the inviter (must be OWNER)
    const inviter = await User.findById(inviterId);
    if (!inviter) {
      return res.status(404).json({
        success: false,
        message: 'Inviter not found',
      });
    }

    if (inviter.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can invite team members',
      });
    }

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    // Validate role (only MANAGER or VENDOR can be invited)
    if (!['MANAGER', 'VENDOR'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Can only invite MANAGER or VENDOR',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new team member with inviter's businessId
    const newMember = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: role,
      businessId: inviter.businessId,
      isActive: true,
      ...(role === 'VENDOR' && vendorEntityId ? { vendorEntityId } : {}),
    });

    await newMember.save();

    console.log(`✓ Team member invited: ${email} (${role}) by ${inviter.email}`);

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      member: {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        businessId: newMember.businessId,
      },
    });
  } catch (error) {
    console.error('Invite Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to invite team member',
      error: error.message,
    });
  }
};

/**
 * GET TEAM MEMBERS - Get all team members for a business
 * GET /api/auth/team
 * Headers: Authorization: Bearer <token>
 * 
 * Only OWNER can view team members
 */
const getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can view team members',
      });
    }

    // Get all team members with same businessId
    const teamMembers = await User.find({ 
      businessId: user.businessId,
      isActive: true 
    }).select('-passwordHash');

    res.status(200).json({
      success: true,
      members: teamMembers.map(member => ({
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get Team Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get team members',
      error: error.message,
    });
  }
};

/**
 * CHANGE PASSWORD
 * POST /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 *
 * Request body:
 * {
 *   "currentPassword": "...",
 *   "newPassword": "..."
 * }
 *
 * Clears mustChangePassword flag on success.
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    console.log(`✓ Password changed: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/profile
 * Get current user's profile data
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        phone: user.phone || '',
        department: user.department || '',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * PUT /api/auth/profile
 * Update current user's profile (name, phone, department)
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, department } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department !== undefined) user.department = department.trim();
    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        phone: user.phone || '',
        department: user.department || '',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

module.exports = {
  signup,
  login,
  verify,
  inviteTeamMember,
  getTeamMembers,
  changePassword,
  getProfile,
  updateProfile,
};
