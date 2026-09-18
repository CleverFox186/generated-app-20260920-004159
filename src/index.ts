import { DurableObject } from "cloudflare:workers";

interface ServiceRecord {
	id: string;
	title: string;
	subtitle: string;
	category: string;
	duration: string;
	full_price: number;
	deposit_amount: number;
	description: string;
	features: string[]; // parsed from JSON
	active: number;
	badge?: string;
}

export class App extends DurableObject {
	private initialized = false;

	private initDb() {
		if (this.initialized) return;

		this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS services (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				subtitle TEXT NOT NULL,
				category TEXT NOT NULL,
				duration TEXT NOT NULL,
				full_price REAL NOT NULL,
				deposit_amount REAL NOT NULL,
				description TEXT NOT NULL,
				features_json TEXT NOT NULL,
				badge TEXT,
				active INTEGER NOT NULL DEFAULT 1,
				sort_order INTEGER NOT NULL DEFAULT 0
			);

			CREATE TABLE IF NOT EXISTS bookings (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				ref_code TEXT UNIQUE NOT NULL,
				service_id TEXT NOT NULL,
				service_title TEXT NOT NULL,
				client_name TEXT NOT NULL,
				client_email TEXT NOT NULL,
				client_phone TEXT NOT NULL,
				client_company TEXT,
				client_role TEXT,
				linkedin TEXT,
				intake_goals TEXT,
				intake_biggest_hurdle TEXT,
				booking_date TEXT NOT NULL,
				booking_time TEXT NOT NULL,
				timezone TEXT NOT NULL,
				full_price REAL NOT NULL,
				deposit_amount REAL NOT NULL,
				balance_amount REAL NOT NULL,
				deposit_status TEXT NOT NULL DEFAULT 'captured', -- 'captured', 'refunded', 'held'
				balance_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'waived'
				booking_status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'completed', 'rescheduled', 'cancelled'
				stripe_charge_id TEXT NOT NULL,
				card_last4 TEXT NOT NULL DEFAULT '4242',
				card_brand TEXT NOT NULL DEFAULT 'visa',
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				coach_notes TEXT
			);

			CREATE TABLE IF NOT EXISTS blocked_slots (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				block_date TEXT NOT NULL,
				block_time TEXT, -- NULL means entire day blocked
				reason TEXT
			);

			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
		`);

		// Seed initial services if none exist
		const countRows = this.ctx.storage.sql
			.exec("SELECT COUNT(*) as c FROM services")
			.toArray();
		const count = Number(countRows[0]?.c ?? 0);

		if (count === 0) {
			const initialServices = [
				{
					id: "exec-intensive",
					title: "Executive Strategy & 90-Min Clarity Intensive",
					subtitle: "High-leverage strategic alignment for VPs, C-Suite & Founders",
					category: "Strategy Intensive",
					duration: "90 Minutes",
					full_price: 850,
					deposit_amount: 150,
					badge: "Most Popular",
					description:
						"A deep-dive tactical session to unblock strategic bottlenecks, clarify executive vision, resolve team friction, and establish an actionable 90-day operational roadmap.",
					features: JSON.stringify([
						"Comprehensive Pre-Call Diagnostic Audit",
						"90-Minute Live 1-on-1 Strategic Deep Dive",
						"Complete Audio & AI-Synthesized Action Transcript",
						"Custom 90-Day Execution Roadmap & OKRs",
						"14 Days of Asynchronous Loom & WhatsApp Support",
					]),
					sort_order: 1,
				},
				{
					id: "leadership-mastery-12w",
					title: "12-Week Leadership & Scale Advisory",
					subtitle: "Holistic 1-on-1 executive mentorship & organizational leverage",
					category: "Comprehensive Retainer",
					duration: "12 Weeks (Bi-weekly)",
					full_price: 4500,
					deposit_amount: 500,
					badge: "Signature Program",
					description:
						"Private advisory for leaders navigating company inflection points, Series A/B scaling, board management, executive presence, and organizational culture.",
					features: JSON.stringify([
						"6x 60-Minute Bi-Weekly Deep Coaching Sessions",
						"360-Degree Leadership Assessment & Stakeholder Feedback",
						"Direct Private Slack/WhatsApp VIP Access (Same-Day Response)",
						"Hiring & Organizational Architecture Review",
						"Board Meeting & Investor Pitch Deck Dry-Runs",
					]),
					sort_order: 2,
				},
				{
					id: "founder-pivot-advisory",
					title: "Founder & Scale Retainer (Monthly)",
					subtitle: "Continuous strategic sparring partner for venture-backed founders",
					category: "Monthly Advisory",
					duration: "Monthly Retainer",
					full_price: 2800,
					deposit_amount: 350,
					badge: "High-Touch",
					description:
						"Ongoing high-impact advisory designed to keep fast-moving founders accountable, focused on high-leverage decisions, and calm under high stress.",
					features: JSON.stringify([
						"2x Dedicated Strategy Calls Monthly",
						"Unlimited Async Voice/Text Advisory",
						"Crisis Decision Support (2-hour SLA)",
						"Executive Hiring & Compensation Calibration",
					]),
					sort_order: 3,
				},
				{
					id: "discovery-consultation",
					title: "Discovery & Advisory Fit Session",
					subtitle: "30-Minute Chemistry & Diagnostic Consultation",
					category: "Diagnostic Session",
					duration: "30 Minutes",
					full_price: 95,
					deposit_amount: 50,
					badge: "100% Credited",
					description:
						"Evaluate coaching fit, review your top 3 current leadership bottlenecks, and determine if an intensive or retainer track is optimal. Deposit credited 100% toward any program.",
					features: JSON.stringify([
						"30-Minute Rapid Diagnostic Session",
						"Clarity on Leadership Blind Spots",
						"$50 Deposit credited 100% toward any selected coaching package",
					]),
					sort_order: 4,
				},
			];

			for (const svc of initialServices) {
				this.ctx.storage.sql.exec(
					`INSERT INTO services (id, title, subtitle, category, duration, full_price, deposit_amount, description, features_json, badge, active, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
					svc.id,
					svc.title,
					svc.subtitle,
					svc.category,
					svc.duration,
					svc.full_price,
					svc.deposit_amount,
					svc.description,
					svc.features,
					svc.badge,
					svc.sort_order
				);
			}

			// Seed sample booking for immediate demonstration
			const sampleDate = new Date();
			sampleDate.setDate(sampleDate.getDate() + 4);
			const formattedSampleDate = sampleDate.toISOString().split("T")[0];

			this.ctx.storage.sql.exec(
				`INSERT INTO bookings (ref_code, service_id, service_title, client_name, client_email, client_phone, client_company, client_role, linkedin, intake_goals, intake_biggest_hurdle, booking_date, booking_time, timezone, full_price, deposit_amount, balance_amount, deposit_status, balance_status, booking_status, stripe_charge_id, card_last4, card_brand)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				"VG-88412",
				"exec-intensive",
				"Executive Strategy & 90-Min Clarity Intensive",
				"Elena Rostova",
				"elena.rostova@acmevc.io",
				"+1 (415) 890-2341",
				"Acme FinTech",
				"VP of Engineering",
				"https://linkedin.com/in/elena-rostova-demo",
				"Scaling engineering org from 25 to 70 while maintaining velocity and resolving friction with product leadership.",
				"Need concrete delegation framework and executive presence in board presentations.",
				formattedSampleDate,
				"14:00",
				"America/New_York (EST)",
				850,
				150,
				700,
				"captured",
				"pending",
				"confirmed",
				"ch_3N84x9Kj9310La09",
				"4242",
				"visa"
			);
		}

		this.initialized = true;
	}

	async fetch(request: Request): Promise<Response> {
		this.initDb();
		const url = new URL(request.url);

		// Handle CORS headers if needed (though same origin in SpaceDO)
		const headers = {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers });
		}

		// 1. PUBLIC: Get coaching packages
		if (url.pathname === "/api/services" && request.method === "GET") {
			const rows = this.ctx.storage.sql
				.exec(
					`SELECT id, title, subtitle, category, duration, full_price, deposit_amount, description, features_json, badge, active, sort_order
					 FROM services WHERE active = 1 ORDER BY sort_order ASC`
				)
				.toArray();

			const formatted = rows.map((r: any) => ({
				...r,
				features: JSON.parse(r.features_json || "[]"),
			}));

			return new Response(JSON.stringify(formatted), { headers });
		}

		// 2. PUBLIC: Get availability for calendar
		if (url.pathname === "/api/availability" && request.method === "GET") {
			const yearMonth =
				url.searchParams.get("month") ||
				new Date().toISOString().substring(0, 7); // e.g. "2026-09"

			// Get all booked slots for the month
			const bookedRows = this.ctx.storage.sql
				.exec(
					`SELECT booking_date, booking_time FROM bookings
					 WHERE booking_date LIKE ? AND booking_status != 'cancelled'`,
					`${yearMonth}%`
				)
				.toArray();

			// Get all blocked slots
			const blockedRows = this.ctx.storage.sql
				.exec(
					`SELECT block_date, block_time, reason FROM blocked_slots
					 WHERE block_date LIKE ?`,
					`${yearMonth}%`
				)
				.toArray();

			// Working hours daily available time slots (coach availability)
			const standardSlots = [
				"09:00",
				"10:30",
				"13:00",
				"14:30",
				"16:00",
				"17:30",
			];

			return new Response(
				JSON.stringify({
					yearMonth,
					standardSlots,
					booked: bookedRows,
					blocked: blockedRows,
				}),
				{ headers }
			);
		}

		// 3. PUBLIC: Stripe Deposit Checkout / Booking Submission
		if (
			url.pathname === "/api/bookings/checkout-deposit" &&
			request.method === "POST"
		) {
			try {
				const body = await request.json<any>();
				const {
					service_id,
					client_name,
					client_email,
					client_phone,
					client_company,
					client_role,
					linkedin,
					intake_goals,
					intake_biggest_hurdle,
					booking_date,
					booking_time,
					timezone,
					card_last4,
					card_brand,
					simulated_card_type, // 'success', 'declined', etc.
				} = body;

				if (
					!service_id ||
					!client_name ||
					!client_email ||
					!booking_date ||
					!booking_time
				) {
					return new Response(
						JSON.stringify({
							error: "Missing required booking and intake fields.",
						}),
						{ status: 400, headers }
					);
				}

				// Check if slot is already taken
				const existing = this.ctx.storage.sql
					.exec(
						`SELECT id FROM bookings
						 WHERE booking_date = ? AND booking_time = ? AND booking_status != 'cancelled'`,
						booking_date,
						booking_time
					)
					.toArray();

				if (existing.length > 0) {
					return new Response(
						JSON.stringify({
							error:
								"This time slot was just reserved by another client. Please select another time.",
						}),
						{ status: 409, headers }
					);
				}

				// Check if service exists
				const svcRows = this.ctx.storage.sql
					.exec(
						`SELECT title, full_price, deposit_amount FROM services WHERE id = ?`,
						service_id
					)
					.toArray();

				if (svcRows.length === 0) {
					return new Response(
						JSON.stringify({ error: "Invalid coaching service selected." }),
						{ status: 404, headers }
					);
				}

				const svc = svcRows[0] as any;
				const fullPrice = Number(svc.full_price);
				const depositAmount = Number(svc.deposit_amount);
				const balanceAmount = fullPrice - depositAmount;

				// Simulate Stripe Payment Intent Processing
				if (simulated_card_type === "declined") {
					return new Response(
						JSON.stringify({
							error:
								"Your card was declined by your financial institution (Test Card Simulation). Please try another payment method.",
						}),
						{ status: 402, headers }
					);
				}

				const randomHex = Math.floor(10000 + Math.random() * 90000);
				const refCode = `VG-${randomHex}`;
				const stripeChargeId = `ch_stripe_dep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

				this.ctx.storage.sql.exec(
					`INSERT INTO bookings (
						ref_code, service_id, service_title, client_name, client_email,
						client_phone, client_company, client_role, linkedin, intake_goals,
						intake_biggest_hurdle, booking_date, booking_time, timezone,
						full_price, deposit_amount, balance_amount, deposit_status,
						balance_status, booking_status, stripe_charge_id, card_last4, card_brand
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'captured', 'pending', 'confirmed', ?, ?, ?)`,
					refCode,
					service_id,
					svc.title,
					client_name.trim(),
					client_email.trim().toLowerCase(),
					client_phone || "",
					client_company || "",
					client_role || "",
					linkedin || "",
					intake_goals || "",
					intake_biggest_hurdle || "",
					booking_date,
					booking_time,
					timezone || "America/New_York (EST)",
					fullPrice,
					depositAmount,
					balanceAmount,
					stripeChargeId,
					card_last4 || "4242",
					card_brand || "visa"
				);

				const newBooking = this.ctx.storage.sql
					.exec(`SELECT * FROM bookings WHERE ref_code = ?`, refCode)
					.toArray()[0];

				return new Response(
					JSON.stringify({
						success: true,
						booking: newBooking,
						receipt: {
							ref_code: refCode,
							charge_id: stripeChargeId,
							deposit_paid: depositAmount,
							balance_remaining: balanceAmount,
							date: booking_date,
							time: booking_time,
							service: svc.title,
							client_name: client_name,
							client_email: client_email,
							timestamp: new Date().toISOString(),
						},
					}),
					{ status: 201, headers }
				);
			} catch (err: any) {
				return new Response(
					JSON.stringify({
						error: err.message || "Failed to process booking deposit.",
					}),
					{ status: 500, headers }
				);
			}
		}

		// 4. PUBLIC: Client self-service booking lookup (by Ref code and email)
		if (url.pathname === "/api/bookings/lookup" && request.method === "GET") {
			const ref = url.searchParams.get("ref")?.trim().toUpperCase();
			const email = url.searchParams.get("email")?.trim().toLowerCase();

			if (!ref || !email) {
				return new Response(
					JSON.stringify({
						error: "Both Reference Code and Email are required.",
					}),
					{ status: 400, headers }
				);
			}

			const bookingRows = this.ctx.storage.sql
				.exec(
					`SELECT * FROM bookings WHERE ref_code = ? AND LOWER(client_email) = ?`,
					ref,
					email
				)
				.toArray();

			if (bookingRows.length === 0) {
				return new Response(
					JSON.stringify({
						error:
							"No matching booking found. Please check your reference code and email.",
					}),
					{ status: 404, headers }
				);
			}

			return new Response(JSON.stringify(bookingRows[0]), { headers });
		}

		// 5. PUBLIC: Reschedule booking
		if (
			url.pathname === "/api/bookings/reschedule" &&
			request.method === "POST"
		) {
			const body = await request.json<any>();
			const { ref_code, email, new_date, new_time, new_timezone } = body;

			if (!ref_code || !email || !new_date || !new_time) {
				return new Response(
					JSON.stringify({ error: "Missing reschedule details." }),
					{ status: 400, headers }
				);
			}

			const existing = this.ctx.storage.sql
				.exec(
					`SELECT id FROM bookings WHERE ref_code = ? AND LOWER(client_email) = ?`,
					ref_code.trim().toUpperCase(),
					email.trim().toLowerCase()
				)
				.toArray();

			if (existing.length === 0) {
				return new Response(
					JSON.stringify({ error: "Booking not found or unauthorized." }),
					{ status: 404, headers }
				);
			}

			// Check conflict
			const conflict = this.ctx.storage.sql
				.exec(
					`SELECT id FROM bookings WHERE booking_date = ? AND booking_time = ? AND ref_code != ? AND booking_status != 'cancelled'`,
					new_date,
					new_time,
					ref_code
				)
				.toArray();

			if (conflict.length > 0) {
				return new Response(
					JSON.stringify({
						error: "The newly selected slot is unavailable.",
					}),
					{ status: 409, headers }
				);
			}

			this.ctx.storage.sql.exec(
				`UPDATE bookings SET booking_date = ?, booking_time = ?, timezone = coalesce(?, timezone), booking_status = 'rescheduled'
				 WHERE ref_code = ?`,
				new_date,
				new_time,
				new_timezone || null,
				ref_code
			);

			const updated = this.ctx.storage.sql
				.exec(`SELECT * FROM bookings WHERE ref_code = ?`, ref_code)
				.toArray()[0];

			return new Response(
				JSON.stringify({ success: true, booking: updated }),
				{ headers }
			);
		}

		// 6. ADMIN AUTH & PORTAL ENDPOINTS
		const adminToken =
			request.headers.get("X-Admin-Token") || url.searchParams.get("token");
		const ADMIN_SECRET = "vanguard2026"; // Default coach master pass

		if (url.pathname === "/api/admin/auth" && request.method === "POST") {
			const body = await request.json<any>();
			if (body.pin === ADMIN_SECRET || body.password === "coach") {
				return new Response(
					JSON.stringify({
						success: true,
						token: ADMIN_SECRET,
						coach: {
							name: "Marcus Vance",
							title: "Executive Leadership & Scale Coach",
							email: "marcus@vanguardcoach.io",
						},
					}),
					{ headers }
				);
			}
			return new Response(
				JSON.stringify({
					error: "Incorrect Coach PIN. (Demo default is vanguard2026)",
				}),
				{ status: 401, headers }
			);
		}

		// Check admin authorization for all /api/admin routes
		if (url.pathname.startsWith("/api/admin")) {
			if (adminToken !== ADMIN_SECRET) {
				return new Response(
					JSON.stringify({
						error: "Unauthorized coach access. Please enter coach PIN.",
					}),
					{ status: 401, headers }
				);
			}

			// Admin Dashboard Stats & All Bookings
			if (
				url.pathname === "/api/admin/dashboard" &&
				request.method === "GET"
			) {
				const bookings = this.ctx.storage.sql
					.exec(`SELECT * FROM bookings ORDER BY id DESC`)
					.toArray();
				const services = this.ctx.storage.sql
					.exec(`SELECT * FROM services ORDER BY sort_order ASC`)
					.toArray();
				const blocked = this.ctx.storage.sql
					.exec(`SELECT * FROM blocked_slots ORDER BY block_date DESC`)
					.toArray();

				let totalDeposits = 0;
				let totalProjected = 0;
				let pendingBalance = 0;
				let activeBookings = 0;

				for (const b of bookings as any[]) {
					if (b.deposit_status === "captured") {
						totalDeposits += Number(b.deposit_amount || 0);
					}
					if (b.booking_status !== "cancelled") {
						totalProjected += Number(b.full_price || 0);
						activeBookings++;
						if (b.balance_status === "pending") {
							pendingBalance += Number(b.balance_amount || 0);
						}
					}
				}

				return new Response(
					JSON.stringify({
						stats: {
							totalDeposits,
							totalProjected,
							pendingBalance,
							activeBookings,
							totalClientsCount: bookings.length,
						},
						bookings,
						services: services.map((s: any) => ({
							...s,
							features: JSON.parse(s.features_json || "[]"),
						})),
						blocked,
					}),
					{ headers }
				);
			}

			// Update booking status (e.g. mark balance paid, refund deposit, add coach notes)
			if (
				url.pathname === "/api/admin/bookings/update" &&
				request.method === "POST"
			) {
				const body = await request.json<any>();
				const {
					id,
					deposit_status,
					balance_status,
					booking_status,
					coach_notes,
				} = body;

				this.ctx.storage.sql.exec(
					`UPDATE bookings SET
						deposit_status = COALESCE(?, deposit_status),
						balance_status = COALESCE(?, balance_status),
						booking_status = COALESCE(?, booking_status),
						coach_notes = COALESCE(?, coach_notes)
					 WHERE id = ?`,
					deposit_status || null,
					balance_status || null,
					booking_status || null,
					coach_notes || null,
					id
				);

				const updated = this.ctx.storage.sql
					.exec(`SELECT * FROM bookings WHERE id = ?`, id)
					.toArray()[0];

				return new Response(
					JSON.stringify({ success: true, booking: updated }),
					{ headers }
				);
			}

			// Block or Unblock calendar slot / day
			if (
				url.pathname === "/api/admin/slots/block" &&
				request.method === "POST"
			) {
				const body = await request.json<any>();
				const { block_date, block_time, reason } = body;
				if (!block_date) {
					return new Response(
						JSON.stringify({ error: "Date is required" }),
						{ status: 400, headers }
					);
				}

				this.ctx.storage.sql.exec(
					`INSERT INTO blocked_slots (block_date, block_time, reason) VALUES (?, ?, ?)`,
					block_date,
					block_time || null,
					reason || "Coach Blocked / Personal"
				);

				const blocked = this.ctx.storage.sql
					.exec(`SELECT * FROM blocked_slots ORDER BY block_date DESC`)
					.toArray();
				return new Response(JSON.stringify({ success: true, blocked }), {
					headers,
				});
			}

			if (
				url.pathname === "/api/admin/slots/unblock" &&
				request.method === "POST"
			) {
				const body = await request.json<any>();
				const { id } = body;
				this.ctx.storage.sql.exec(
					`DELETE FROM blocked_slots WHERE id = ?`,
					id
				);
				const blocked = this.ctx.storage.sql
					.exec(`SELECT * FROM blocked_slots ORDER BY block_date DESC`)
					.toArray();
				return new Response(JSON.stringify({ success: true, blocked }), {
					headers,
				});
			}

			// Update package details (e.g. adjust pricing or deposit)
			if (
				url.pathname === "/api/admin/services/update" &&
				request.method === "POST"
			) {
				const body = await request.json<any>();
				const { id, title, full_price, deposit_amount, duration, active } =
					body;

				this.ctx.storage.sql.exec(
					`UPDATE services SET
						title = COALESCE(?, title),
						full_price = COALESCE(?, full_price),
						deposit_amount = COALESCE(?, deposit_amount),
						duration = COALESCE(?, duration),
						active = COALESCE(?, active)
					 WHERE id = ?`,
					title || null,
					full_price !== undefined ? full_price : null,
					deposit_amount !== undefined ? deposit_amount : null,
					duration || null,
					active !== undefined ? active : null,
					id
				);

				return new Response(JSON.stringify({ success: true }), { headers });
			}
		}

		return new Response("Not found", { status: 404 });
	}
}
