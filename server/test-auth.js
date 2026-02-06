#!/usr/bin/env node

/**
 * Authentication API Test Script
 * Tests signup, login, and token verification
 */

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 ChainMind Authentication Tests\n');

  try {
    // Test 1: Health Check
    console.log('0️⃣  Testing Health Check...');
    const healthResponse = await request('GET', '/health');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Service: ${healthResponse.data.service}`);

    // Test 1: Signup
    console.log('\n1️⃣  Testing Signup...');
    const signupResponse = await request('POST', '/api/auth/signup', {
      name: 'Test Owner',
      email: 'testowner@example.com',
      password: 'password123',
      role: 'OWNER',
    });

    console.log(`   Status: ${signupResponse.status}`);
    console.log(`   Success: ${signupResponse.data.success}`);
    
    if (signupResponse.data.success) {
      console.log(`   Token: ${signupResponse.data.token.substring(0, 20)}...`);
      console.log(`   User: ${signupResponse.data.user.name} (${signupResponse.data.user.role})`);
    } else {
      console.log(`   Error: ${signupResponse.data.message}`);
      return;
    }

    const token = signupResponse.data.token;
    const email = signupResponse.data.user.email;

    // Test 2: Login
    console.log('\n2️⃣  Testing Login...');
    const loginResponse = await request('POST', '/api/auth/login', {
      email: email,
      password: 'password123',
    });

    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Success: ${loginResponse.data.success}`);
    if (loginResponse.data.success) {
      console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
      console.log(`   User: ${loginResponse.data.user.name}`);
    }

    // Test 3: Verify Token
    console.log('\n3️⃣  Testing Token Verification...');
    const verifyOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const verifyResponse = await new Promise((resolve, reject) => {
      const req = http.request(verifyOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log(`   Status: ${verifyResponse.status}`);
    console.log(`   Success: ${verifyResponse.data.success}`);
    if (verifyResponse.data.success) {
      console.log(`   User: ${verifyResponse.data.user.name}`);
    }

    // Test 4: Invalid Token
    console.log('\n4️⃣  Testing Invalid Token...');
    const invalidTokenOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_token_123',
        'Content-Type': 'application/json',
      },
    };

    const invalidTokenResponse = await new Promise((resolve, reject) => {
      const req = http.request(invalidTokenOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log(`   Status: ${invalidTokenResponse.status}`);
    console.log(`   Message: ${invalidTokenResponse.data.message}`);

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error(error);
  }
}

runTests();
