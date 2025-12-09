#!/usr/bin/env node
/**
 * Generate a secure encryption key for Microsoft token storage
 * Run with: node generate-encryption-key.js
 */

const crypto = require('crypto')

console.log('\n==============================================')
console.log('  Encryption Key Generator')
console.log('==============================================\n')

// Generate a secure random 32-byte key
const key = crypto.randomBytes(32).toString('hex')

console.log('Your new encryption key:')
console.log('\n  ' + key + '\n')

console.log('Add this to your .env file:')
console.log('\n  ENCRYPTION_KEY=' + key + '\n')

console.log('==============================================\n')
