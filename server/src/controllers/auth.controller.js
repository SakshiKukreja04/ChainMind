/**
 * Authentication Controller
 * Handles user signup, login, and token generation
 */

const bcrypt = require('bcrypt');
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

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: role,
      businessId: businessId || null,
      isActive: true,
    });

    await newUser.save();

    // If OWNER, create associated business
    let business = null;
    if (role === 'OWNER') {
      business = new Business({
        businessName: `${name}'s Business`,
        industry: 'Not specified',
        location: 'Not specified',
        currency: 'USD',
        ownerId: newUser._id,
        isActive: true,
      });
      await business.save();

      // Link business to user
      newUser.businessId = business._id;
      await newUser.save();
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

module.exports = {
  signup,
  login,
  verify,
};
