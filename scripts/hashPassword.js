const bcrypt = require('bcryptjs');

/**
 * Generate password hash for environment variable
 * Run: node scripts/hashPassword.js your_password
 */

const password = process.argv[2];

if (!password) {
  console.error('❌ Please provide a password');
  console.log('\nUsage: node scripts/hashPassword.js your_password');
  console.log('\nExample: node scripts/hashPassword.js MySecurePassword123');
  process.exit(1);
}

async function hashPassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('\n✅ Password hash generated successfully!\n');
    console.log('📋 Add this to your .env file:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\n💡 For Render, add this in Environment Variables section');
    console.log('\n⚠️  Keep this hash secret and secure!\n');
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

hashPassword();