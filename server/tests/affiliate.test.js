/**
 * Affiliate System Automated Tests
 * Tests the affiliate engine directly against an in-memory SQLite database.
 *
 * Run from server dir: node tests/affiliate.test.js
 */
import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "test-affiliate.db");

/* ─── Test Helpers ─── */

let db = null;
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    results.push({ name: testName, status: "PASS" });
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: "FAIL", details });
    console.log(`  ❌ ${testName}${details ? ` — ${details}` : ""}`);
  }
}

function assertEqual(actual, expected, testName) {
  const ok = actual === expected;
  assert(ok, testName, ok ? "" : `expected ${expected}, got ${actual}`);
}

function assertApprox(actual, expected, testName, tolerance = 0.001) {
  const ok = Math.abs(actual - expected) < tolerance;
  assert(ok, testName, ok ? "" : `expected ~${expected}, got ${actual}`);
}

async function initTestDb() {
  const SQL = await initSqlJs();
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  // Create all tables (mirrors db.js)
  db.run(`CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL,
    network TEXT NOT NULL, tx_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'completed',
    confirmed_by TEXT NOT NULL, confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_players (
    player_name TEXT PRIMARY KEY, affiliate_code TEXT NOT NULL UNIQUE,
    referred_by TEXT, status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_code ON affiliate_players(affiliate_code)`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_commission_transactions (
    id TEXT PRIMARY KEY, beneficiary_user_id TEXT NOT NULL, source_user_id TEXT NOT NULL,
    source_profit_tx_id TEXT NOT NULL, affiliate_level INTEGER NOT NULL,
    commission_rate REAL NOT NULL, eligible_profit REAL NOT NULL,
    commission_amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending', description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), settled_at TEXT
  )`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_idempotency
    ON affiliate_commission_transactions(source_profit_tx_id, beneficiary_user_id, affiliate_level)`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_profit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_player TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE, eligible_profit REAL NOT NULL,
    description TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL,
    user_name TEXT NOT NULL, details TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  return db;
}

/* ─── Import Engine (needs db.js first) ─── */
// We'll import the engine functions directly
import {
  ensurePlayer, registerReferral, processProfitEvent,
  reverseProfitCommissions, getAncestors,
} from "../services/affiliateEngine.js";
import { AFFILIATE_CONFIG as CFG } from "../config/affiliate.js";

/* ═══════════════════════════════════════
   TEST SUITE
   ═══════════════════════════════════════ */

async function runTests() {
  console.log("\n🔗 AFFILIATE SYSTEM — AUTOMATED TESTS\n");

  await initTestDb();

  // ─── TEST 1: Player Registration ───
  console.log("📋 Player Registration");
  const playerA = ensurePlayer(db, "Alice");
  assert(playerA !== null && playerA.affiliate_code, "T01: Player registration creates entry");
  assert(playerA.affiliate_code.startsWith("FARM-"), "T01b: Affiliate code has correct format");

  const playerA2 = ensurePlayer(db, "Alice");
  assertEqual(playerA.affiliate_code, playerA2.affiliate_code, "T01c: Idempotent registration returns same code");

  // ─── TEST 2: Referral Registration ───
  console.log("\n📋 Referral Registration");
  ensurePlayer(db, "Bob");
  ensurePlayer(db, "Charlie");
  ensurePlayer(db, "Dave");
  ensurePlayer(db, "Eve");

  const codeA = ensurePlayer(db, "Alice").affiliate_code;
  const codeB = ensurePlayer(db, "Bob").affiliate_code;
  const codeC = ensurePlayer(db, "Charlie").affiliate_code;
  const codeD = ensurePlayer(db, "Dave").affiliate_code;

  const regB = registerReferral(db, "Bob", codeA);
  assert(regB.ok, "T02: Bob registers with Alice's code");

  const regC = registerReferral(db, "Charlie", codeC);
  // Charlie tries to use his own code — should fail
  // Actually let's use Bob's code for Charlie
  const regC2 = registerReferral(db, "Charlie", codeB);
  assert(regC2.ok, "T03: Charlie registers with Bob's code");

  const regD = registerReferral(db, "Dave", codeC);
  assert(regD.ok, "T04: Dave registers with Charlie's code");

  const regE = registerReferral(db, "Eve", codeD);
  assert(regE.ok, "T05: Eve registers with Dave's code");

  // ─── TEST 3: Self-Referral Prevention ───
  console.log("\n📋 Self-Referral Prevention");
  const selfReg = registerReferral(db, "NewGuy", ensurePlayer(db, "NewGuy").affiliate_code);
  assertEqual(selfReg.ok, false, "T06: Self-referral rejected");
  assertEqual(selfReg.error, "self_referral", "T06b: Error is 'self_referral'");

  // ─── TEST 4: Cycle Prevention ───
  console.log("\n📋 Cycle Prevention");
  const cycleReg = registerReferral(db, "Alice", codeD);
  // Alice is ancestor of Dave, so this would create A→B→C→D→A
  assertEqual(cycleReg.ok, false, "T07: Cycle detected (Alice under Eve)");
  assertEqual(cycleReg.error, "cycle_detected", "T07b: Error is 'cycle_detected'");

  // ─── TEST 5: Invalid Code ───
  console.log("\n📋 Invalid Code");
  const invalidReg = registerReferral(db, "NewUser", "FAKE-CODE");
  assertEqual(invalidReg.ok, false, "T08: Invalid code rejected");
  assertEqual(invalidReg.error, "invalid_code", "T08b: Error is 'invalid_code'");

  // ─── TEST 6: Already Referred ───
  console.log("\n📋 Already Referred");
  const doubleRef = registerReferral(db, "Bob", codeA);
  assertEqual(doubleRef.ok, false, "T09: Double referral rejected");
  assertEqual(doubleRef.error, "already_referred", "T09b: Error is 'already_referred'");

  // ─── TEST 7: Ancestry Chain ───
  console.log("\n📋 Ancestry Chain");
  const ancestorsEve = getAncestors(db, "Eve");
  assertEqual(ancestorsEve.length, 4, "T10: Eve has 4 ancestors");
  assertEqual(ancestorsEve[0].player_name, "Dave", "T10b: Level 1 ancestor = Dave");
  assertEqual(ancestorsEve[1].player_name, "Charlie", "T10c: Level 2 ancestor = Charlie");
  assertEqual(ancestorsEve[2].player_name, "Bob", "T10d: Level 3 ancestor = Bob");
  assertEqual(ancestorsEve[3].player_name, "Alice", "T10e: Level 4 ancestor = Alice");

  // ─── TEST 8: Commission Calculations ───
  console.log("\n📋 Commission Calculations — $1,000 from Eve");

  const result1000 = processProfitEvent(db, "Eve", "TX-PROFIT-001", 1000, "Test profit $1000");
  assert(result1000.ok, "T11: Profit event processed");
  assertEqual(result1000.commissions.length, 4, "T11b: 4 commissions created");

  // Level 1 (Dave): 1% of 1000 = $10
  const daveCommission = result1000.commissions.find(c => c.beneficiaryUserId === "Dave");
  assert(daveCommission !== undefined, "T11c: Dave has commission");
  assertApprox(daveCommission.commissionAmount, 10, "T11d: Dave (L1) = $10", 0.01);

  // Level 2 (Charlie): 0.8% of 1000 = $8
  const charlieCommission = result1000.commissions.find(c => c.beneficiaryUserId === "Charlie");
  assert(charlieCommission !== undefined, "T11e: Charlie has commission");
  assertApprox(charlieCommission.commissionAmount, 8, "T11f: Charlie (L2) = $8", 0.01);

  // Level 3 (Bob): 0.4% of 1000 = $4
  const bobCommission = result1000.commissions.find(c => c.beneficiaryUserId === "Bob");
  assert(bobCommission !== undefined, "T11g: Bob has commission");
  assertApprox(bobCommission.commissionAmount, 4, "T11h: Bob (L3) = $4", 0.01);

  // Level 4 (Alice): 0.05% of 1000 = $0.50
  const aliceCommission = result1000.commissions.find(c => c.beneficiaryUserId === "Alice");
  assert(aliceCommission !== undefined, "T11i: Alice has commission");
  assertApprox(aliceCommission.commissionAmount, 0.50, "T11j: Alice (L4) = $0.50", 0.01);

  // Total distributed
  assertApprox(result1000.totalDistributed, 22.50, "T11k: Total distributed = $22.50", 0.01);

  // ─── TEST 9: $0 Profit ───
  console.log("\n📋 Zero / Negative Profit");
  const resultZero = processProfitEvent(db, "Eve", "TX-PROFIT-002", 0, "Zero profit");
  assert(resultZero.ok, "T12: $0 profit processed without error");
  assertEqual(resultZero.commissions.length, 0, "T12b: No commissions for $0");

  const resultNegative = processProfitEvent(db, "Eve", "TX-PROFIT-003", -500, "Negative profit");
  assert(resultNegative.ok, "T13: Negative profit processed without error");
  assertEqual(resultNegative.commissions.length, 0, "T13b: No commissions for negative profit");

  // ─── TEST 10: Idempotency (double payment prevention) ───
  console.log("\n📋 Idempotency — Duplicate Prevention");
  const resultDuplicate = processProfitEvent(db, "Eve", "TX-PROFIT-001", 1000, "Duplicate attempt");
  assert(resultDuplicate.ok, "T14: Duplicate processing doesn't error");
  assertEqual(resultDuplicate.commissions.length, 0, "T14b: No new commissions created");

  // Verify DB still has exactly 4 commissions for TX-PROFIT-001
  const stmt = db.prepare("SELECT COUNT(*) as cnt FROM affiliate_commission_transactions WHERE source_profit_tx_id = 'TX-PROFIT-001'");
  stmt.bind([]);
  stmt.step();
  const count = stmt.get()[0];
  stmt.free();
  assertEqual(count, 4, "T14c: DB has exactly 4 commissions for TX-PROFIT-001");

  // ─── TEST 11: No commission for user without sponsor ───
  console.log("\n📋 User Without Sponsor");
  ensurePlayer(db, "Lonely");
  const resultLonely = processProfitEvent(db, "Lonely", "TX-PROFIT-LONELY", 1000, "No sponsor");
  assert(resultLonely.ok, "T15: No-sponsor profit processed");
  assertEqual(resultLonely.commissions.length, 0, "T15b: No commissions generated");

  // ─── TEST 12: Partial / non-round amounts ───
  console.log("\n📋 Financial Precision — $127.43");
  const resultPartial = processProfitEvent(db, "Eve", "TX-PROFIT-PARTIAL", 127.43, "Partial amount");
  assert(resultPartial.ok, "T16: Partial amount processed");
  const alicePartial = resultPartial.commissions.find(c => c.beneficiaryUserId === "Alice");
  assert(alicePartial !== undefined, "T16b: Alice (L4) has commission on partial");
  // 127.43 * 0.0005 = 0.063715 → rounded to 0.06
  assertApprox(alicePartial.commissionAmount, 0.06, "T16c: Alice (L4) partial = $0.06", 0.01);
  assertApprox(alicePartial.eligibleProfit, 127.43, "T16d: Eligible profit stored precisely", 0.01);

  // ─── TEST 13: Commission rate snapshot ───
  console.log("\n📋 Rate Snapshot");
  assertEqual(daveCommission.commissionRate, CFG.rates.level1, "T17: L1 rate stored as snapshot");
  assertEqual(charlieCommission.commissionRate, CFG.rates.level2, "T17b: L2 rate stored as snapshot");
  assertEqual(bobCommission.commissionRate, CFG.rates.level3, "T17c: L3 rate stored as snapshot");
  assertEqual(aliceCommission.commissionRate, CFG.rates.level4Plus, "T17d: L4+ rate stored as snapshot");

  // ─── TEST 14: Reversal ───
  console.log("\n📋 Reversal");
  const revResult = reverseProfitCommissions(db, "TX-PROFIT-001");
  assert(revResult.ok, "T18: Reversal processed");
  assertEqual(revResult.reversedCount, 4, "T18b: 4 commissions reversed");

  // Verify status
  const revStmt = db.prepare("SELECT status FROM affiliate_commission_transactions WHERE source_profit_tx_id = 'TX-PROFIT-001'");
  revStmt.bind([]);
  let allReversed = true;
  while (revStmt.step()) {
    if (revStmt.get()[0] !== "reversed") allReversed = false;
  }
  revStmt.free();
  assert(allReversed, "T18c: All commissions have 'reversed' status");

  // ─── TEST 15: Reversal is idempotent ───
  console.log("\n📋 Reversal Idempotency");
  const revAgain = reverseProfitCommissions(db, "TX-PROFIT-001");
  assert(revAgain.ok, "T19: Double reversal doesn't error");
  assertEqual(revAgain.reversedCount, 0, "T19b: No additional commissions reversed");

  // ─── TEST 16: Full chain math (A→B→C→D→E, $10,000) ───
  console.log("\n📋 Full Chain Math — $10,000");
  const result10k = processProfitEvent(db, "Eve", "TX-PROFIT-10K", 10000, "Full chain test");
  assert(result10k.ok, "T20: $10K profit processed");
  assertEqual(result10k.commissions.length, 4, "T20b: 4 commissions");

  const d10k = result10k.commissions.find(c => c.beneficiaryUserId === "Dave");
  const c10k = result10k.commissions.find(c => c.beneficiaryUserId === "Charlie");
  const b10k = result10k.commissions.find(c => c.beneficiaryUserId === "Bob");
  const a10k = result10k.commissions.find(c => c.beneficiaryUserId === "Alice");

  assertApprox(d10k.commissionAmount, 100, "T20c: Dave L1 = $100", 0.01);
  assertApprox(c10k.commissionAmount, 80, "T20d: Charlie L2 = $80", 0.01);
  assertApprox(b10k.commissionAmount, 40, "T20e: Bob L3 = $40", 0.01);
  assertApprox(a10k.commissionAmount, 5, "T20f: Alice L4 = $5", 0.01);
  assertApprox(result10k.totalDistributed, 225, "T20g: Total distributed = $225", 0.01);

  // ─── TEST 17: Short chain (only 2 ancestors) ───
  console.log("\n📋 Short Chain — 2 ancestors only");
  ensurePlayer(db, "Frank");
  ensurePlayer(db, "Grace");
  const codeF = ensurePlayer(db, "Frank").affiliate_code;
  registerReferral(db, "Grace", codeF);

  const resultGrace = processProfitEvent(db, "Grace", "TX-PROFIT-SHORT", 1000);
  assert(resultGrace.ok, "T21: Short chain processed");
  assertEqual(resultGrace.commissions.length, 1, "T21b: Only 1 commission (no fake levels)");

  const frankComm = resultGrace.commissions.find(c => c.beneficiaryUserId === "Frank");
  assertApprox(frankComm.commissionAmount, 10, "T21c: Frank L1 = $10", 0.01);

  // ─── TEST 18: Commission status lifecycle ───
  console.log("\n📋 Commission Status Lifecycle");
  const comm10k = result10k.commissions[0];
  assertEqual(comm10k.status, "pending", "T22: New commission is 'pending'");

  // ─── TEST 19: Max depth cap ───
  console.log("\n📋 Max Depth Cap");
  const ancestors = getAncestors(db, "Eve");
  assert(ancestors.length <= CFG.maxDepth, "T23: Ancestors within maxDepth limit");

  // ─── TEST 20: Missing fields ───
  console.log("\n📋 Missing Fields Validation");
  const missingResult = processProfitEvent(db, null, "TX-MISSING", 1000);
  assertEqual(missingResult.ok, false, "T24: Missing player name rejected");

  const missingTx = processProfitEvent(db, "Eve", null, 1000);
  assertEqual(missingTx.ok, false, "T25: Missing transaction ID rejected");

  // ─── Summary ───
  console.log(`\n${"═".repeat(50)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"═".repeat(50)}`);

  if (failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`   ${r.name}${r.details ? ` — ${r.details}` : ""}`);
    });
  }

  console.log("");

  // Clean up
  db.close();

  return failed === 0;
}

runTests()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
