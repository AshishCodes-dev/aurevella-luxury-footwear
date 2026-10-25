/**
 * AUREVELLA — Payment ID Unique Index Migration Tool
 *
 * PURPOSE:
 * Safely replaces the legacy non-unique sparse index ('paymentDetails.razorpayPaymentId_1')
 * on the MongoDB Atlas `orders` collection with a partial unique index:
 *   Key: { 'paymentDetails.razorpayPaymentId': 1 }
 *   Options: { unique: true, partialFilterExpression: { 'paymentDetails.razorpayPaymentId': { $type: 'string' } } }
 *
 * SAFETY GUARANTEES:
 * 1. Default mode is DRY-RUN / PREFLIGHT. Does NOT modify any indexes unless `--execute` is explicitly passed.
 * 2. Scans the entire `orders` collection for duplicate payment IDs before touching any index.
 * 3. Never deletes, overwrites, or alters order documents to force index creation.
 * 4. Aborts immediately if any duplicate non-empty payment IDs exist.
 * 5. Verifies the newly created unique index post-migration.
 *
 * USAGE:
 * - Preflight check only (safe, read-only):
 *     node scripts/migratePaymentIdIndex.js
 *     node scripts/migratePaymentIdIndex.js --dry-run
 *
 * - Live execution (requires explicit confirmation flag, separately approved):
 *     node scripts/migratePaymentIdIndex.js --execute
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Order from '../src/models/Order.js';

async function runIndexMigration() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute') || args.includes('--apply');
  const isDryRun = !isExecute || args.includes('--dry-run');

  console.log('====================================================================');
  console.log('   AUREVELLA — Payment ID Index Migration Tool');
  console.log(`   Mode: ${isExecute ? 'EXECUTE (LIVE MODIFICATION)' : 'DRY-RUN / PREFLIGHT (READ-ONLY)'}`);
  console.log('====================================================================\n');

  try {
    await connectDB();
    const host = mongoose.connection.host || 'unknown';
    console.log(`[Database] Connected to ${host}`);

    // ------------------------------------------------------------------
    // Step 1: Inspect Live Indexes on `orders` Collection
    // ------------------------------------------------------------------
    console.log('\n[Step 1] Inspecting existing indexes on "orders" collection...');
    const indexes = await Order.collection.indexes();

    const targetKey = 'paymentDetails.razorpayPaymentId';
    const existingIndex = indexes.find(
      (idx) => idx.key && idx.key[targetKey] === 1
    );

    if (existingIndex) {
      console.log(`  Found existing index on "${targetKey}":`);
      console.log(`    - Name: "${existingIndex.name}"`);
      console.log(`    - Unique: ${Boolean(existingIndex.unique)}`);
      console.log(`    - Sparse: ${Boolean(existingIndex.sparse)}`);
      console.log(`    - PartialFilter: ${JSON.stringify(existingIndex.partialFilterExpression || null)}`);

      if (existingIndex.unique && existingIndex.partialFilterExpression) {
        console.log('\n[Notice]: The target partial unique index is ALREADY active on this collection.');
        if (isExecute) {
          console.log('[Migration]: No index changes needed. Exiting safely.');
          await mongoose.disconnect();
          process.exit(0);
        }
      }
    } else {
      console.log(`  No existing index found matching key "${targetKey}".`);
    }

    // ------------------------------------------------------------------
    // Step 2: Audit Collection for Duplicate Payment IDs
    // ------------------------------------------------------------------
    console.log('\n[Step 2] Auditing "orders" collection for duplicate payment IDs...');
    const duplicatePaymentIds = await Order.aggregate([
      {
        $match: {
          'paymentDetails.razorpayPaymentId': {
            $exists: true,
            $type: 'string',
            $ne: '',
          },
        },
      },
      {
        $group: {
          _id: '$paymentDetails.razorpayPaymentId',
          count: { $sum: 1 },
          orderNumbers: { $push: '$orderNumber' },
          orderIds: { $push: '$_id' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicatePaymentIds.length > 0) {
      console.error('\n[CRITICAL ERROR]: Duplicate payment IDs detected in database:');
      duplicatePaymentIds.forEach((dup) => {
        console.error(
          `  - Payment ID "${dup._id}" appears ${dup.count} times in Orders: ${dup.orderNumbers.join(', ')}`
        );
      });
      console.error('\n[ABORT]: Cannot create unique index because duplicate payment IDs exist.');
      console.error('Safety Policy: Migration script will NEVER delete or modify customer orders.');
      console.error('Please manually review and reconcile conflicting orders before retrying.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('  [PASS]: Zero duplicate payment IDs found across all orders.');

    // Count how many orders currently have a valid payment ID
    const populatedCount = await Order.countDocuments({
      'paymentDetails.razorpayPaymentId': { $exists: true, $type: 'string', $ne: '' },
    });
    console.log(`  [Stats]: ${populatedCount} order(s) currently possess a recorded Razorpay payment ID.`);

    // ------------------------------------------------------------------
    // Step 3: Execution Decision Guard
    // ------------------------------------------------------------------
    if (isDryRun) {
      console.log('\n====================================================================');
      console.log('  [PREFLIGHT RESULT]: ALL PREFLIGHT CHECKS PASSED.');
      console.log('  No database indexes were modified or dropped.');
      console.log('  ');
      console.log('  To apply this migration against live MongoDB Atlas when approved, run:');
      console.log('    node scripts/migratePaymentIdIndex.js --execute');
      console.log('====================================================================\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // ------------------------------------------------------------------
    // Step 4: Execute Live Index Migration (Only with --execute)
    // ------------------------------------------------------------------
    console.log('\n[Step 4] Proceeding with live index replacement...');

    // 4A. Drop existing legacy index if present
    if (existingIndex) {
      console.log(`  Dropping legacy index "${existingIndex.name}"...`);
      await Order.collection.dropIndex(existingIndex.name);
      console.log(`  [Done]: Dropped legacy index "${existingIndex.name}".`);
    }

    // 4B. Create new partial unique index
    console.log('  Creating partial unique index on "paymentDetails.razorpayPaymentId"...');
    const indexResult = await Order.collection.createIndex(
      { 'paymentDetails.razorpayPaymentId': 1 },
      {
        unique: true,
        partialFilterExpression: {
          'paymentDetails.razorpayPaymentId': { $type: 'string' },
        },
        name: 'paymentDetails.razorpayPaymentId_1',
      }
    );
    console.log(`  [Done]: Created index "${indexResult}".`);

    // 4C. Post-migration verification
    console.log('\n[Step 5] Verifying post-migration indexes...');
    const postIndexes = await Order.collection.indexes();
    const verifiedIndex = postIndexes.find(
      (idx) => idx.key && idx.key[targetKey] === 1
    );

    if (
      verifiedIndex &&
      verifiedIndex.unique === true &&
      verifiedIndex.partialFilterExpression?.['paymentDetails.razorpayPaymentId']?.$type === 'string'
    ) {
      console.log('\n====================================================================');
      console.log('  [MIGRATION SUCCESS]: Partial unique index successfully verified!');
      console.log(`  Index Name: ${verifiedIndex.name}`);
      console.log(`  Unique: ${verifiedIndex.unique}`);
      console.log(`  PartialFilter: ${JSON.stringify(verifiedIndex.partialFilterExpression)}`);
      console.log('====================================================================\n');
    } else {
      throw new Error(
        `Index verification failed! Unexpected index definition: ${JSON.stringify(verifiedIndex)}`
      );
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[MIGRATION ERROR]:', error.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runIndexMigration();
