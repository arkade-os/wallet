#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push
 * Run: npm run generate-vapid
 */

const webpush = require('web-push');

console.log('Generating VAPID keys for Web Push...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);

console.log('\n\nSet these as secrets in Cloudflare Worker:');
console.log('wrangler secret put VAPID_PUBLIC_KEY');
console.log('wrangler secret put VAPID_PRIVATE_KEY');
console.log('wrangler secret put VAPID_SUBJECT');
console.log('\nVAPID_SUBJECT should be a mailto: or https: URL');
console.log('Example: mailto:admin@example.com');
