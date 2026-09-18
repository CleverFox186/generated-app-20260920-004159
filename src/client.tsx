import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Loading, Empty, ErrorStrip } from "./ui";

interface Service {
	id: string;
	title: string;
	subtitle: string;
	category: string;
	duration: string;
	full_price: number;
	deposit_amount: number;
	description: string;
	features: string[];
	badge?: string;
	active: number;
}

interface Booking {
	id: number;
	ref_code: string;
	service_id: string;
	service_title: string;
	client_name: string;
	client_email: string;
	client_phone: string;
	client_company: string;
	client_role: string;
	linkedin: string;
	intake_goals: string;
	intake_biggest_hurdle: string;
	booking_date: string;
	booking_time: string;
	timezone: string;
	full_price: number;
	deposit_amount: number;
	balance_amount: number;
	deposit_status: string;
	balance_status: string;
	booking_status: string;
	stripe_charge_id: string;
	card_last4: string;
	card_brand: string;
	created_at: string;
	coach_notes?: string;
}

interface MonthAvailability {
	yearMonth: string;
	standardSlots: string[];
	booked: Array<{ booking_date: string; booking_time: string }>;
	blocked: Array<{ block_date: string; block_time: string | null; reason: string }>;
}

const TIMEZONES = [
	"America/New_York (EST)",
	"America/Chicago (CST)",
	"America/Denver (MST)",
	"America/Los_Angeles (PST)",
	"Europe/London (GMT/BST)",
	"Europe/Paris (CET)",
	"Asia/Singapore (SGT)",
	"Asia/Tokyo (JST)",
	"Australia/Sydney (AEST)",
];

function App() {
	// View State
	const [activeView, setActiveView] = useState<"client" | "admin">("client");
	const [services, setServices] = useState<Service[]>([]);
	const [loadingServices, setLoadingServices] = useState(true);
	const [servicesError, setServicesError] = useState<string | null>(null);

	// Booking Modal State
	const [bookingModalOpen, setBookingModalOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4 | 5>(1);

	// Step 2 Calendar State
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [selectedTime, setSelectedTime] = useState<string>("");
	const [selectedTimezone, setSelectedTimezone] = useState<string>("America/New_York (EST)");
	const [calCurrentDate, setCalCurrentDate] = useState<Date>(new Date());
	const [availability, setAvailability] = useState<MonthAvailability | null>(null);
	const [loadingAvailability, setLoadingAvailability] = useState(false);

	// Step 3 Intake State
	const [intakeName, setIntakeName] = useState("");
	const [intakeEmail, setIntakeEmail] = useState("");
	const [intakePhone, setIntakePhone] = useState("");
	const [intakeCompany, setIntakeCompany] = useState("");
	const [intakeRole, setIntakeRole] = useState("");
	const [intakeLinkedin, setIntakeLinkedin] = useState("");
	const [intakeGoals, setIntakeGoals] = useState("");
	const [intakeHurdle, setIntakeHurdle] = useState("");

	// Step 4 Stripe Deposit Payment State
	const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
	const [cardExp, setCardExp] = useState("12/28");
	const [cardCvc, setCardCvc] = useState("892");
	const [cardZip, setCardZip] = useState("94103");
	const [cardholderName, setCardholderName] = useState("");
	const [simulatedCardType, setSimulatedCardType] = useState<"success" | "declined">("success");
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);
	const [paymentError, setPaymentError] = useState<string | null>(null);

	// Step 5 Confirmation & Receipt
	const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
	const [receiptData, setReceiptData] = useState<any>(null);

	// Client Lookup Modal State
	const [lookupModalOpen, setLookupModalOpen] = useState(false);
	const [lookupRef, setLookupRef] = useState("");
	const [lookupEmail, setLookupEmail] = useState("");
	const [lookupResult, setLookupResult] = useState<Booking | null>(null);
	const [lookupLoading, setLookupLoading] = useState(false);
	const [lookupError, setLookupError] = useState<string | null>(null);
	const [rescheduling, setRescheduling] = useState(false);
	const [rescheduleDate, setRescheduleDate] = useState("");
	const [rescheduleTime, setRescheduleTime] = useState("");

	// Admin Portal State
	const [adminPin, setAdminPin] = useState("vanguard2026");
	const [adminToken, setAdminToken] = useState<string | null>(null);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminDashboard, setAdminDashboard] = useState<any>(null);
	const [adminTab, setAdminTab] = useState<"bookings" | "services" | "blocks">("bookings");
	const [adminSearch, setAdminSearch] = useState("");
	const [adminFilterStatus, setAdminFilterStatus] = useState<string>("all");
	const [selectedClientDetail, setSelectedClientDetail] = useState<Booking | null>(null);
	const [blockDateInput, setBlockDateInput] = useState("");
	const [blockReasonInput, setBlockReasonInput] = useState("");

	// Fetch Services on load
	const fetchServices = () => {
		setLoadingServices(true);
		fetch("./api/services")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load coaching programs");
				return res.json();
			})
			.then((data: Service[]) => {
				setServices(data);
				setServicesError(null);
			})
			.catch((err) => {
				setServicesError(err.message);
			})
			.finally(() => {
				setLoadingServices(false);
			});
	};

	useEffect(() => {
		fetchServices();
	}, []);

	// Format month string YYYY-MM
	const currentYearMonth = useMemo(() => {
		const y = calCurrentDate.getFullYear();
		const m = String(calCurrentDate.getMonth() + 1).padStart(2, "0");
		return `${y}-${m}`;
	}, [calCurrentDate]);

	// Fetch Availability when month changes
	useEffect(() => {
		if (!bookingModalOpen && !rescheduling) return;
		setLoadingAvailability(true);
		fetch(`./api/availability?month=${currentYearMonth}`)
			.then((res) => res.json())
			.then((data: MonthAvailability) => {
				setAvailability(data);
			})
			.catch((err) => console.error("Availability error:", err))
			.finally(() => setLoadingAvailability(false));
	}, [currentYearMonth, bookingModalOpen, rescheduling]);

	// Format Card Number
	const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
		const matches = v.match(/\d{4,16}/g);
		const match = (matches && matches[0]) || "";
		const parts = [];
		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4));
		}
		if (parts.length) {
			setCardNumber(parts.join(" "));
		} else {
			setCardNumber(v);
		}
	};

	// Start Booking for a specific service
	const handleOpenBooking = (svc: Service) => {
		setSelectedService(svc);
		setBookingStep(2); // Jump straight to date picker
		setBookingModalOpen(true);
		setPaymentError(null);
		// Auto select default date (e.g. next weekday)
		const nextDay = new Date();
		nextDay.setDate(nextDay.getDate() + 3);
		setSelectedDate(nextDay.toISOString().split("T")[0]);
		setSelectedTime("10:30");
	};

	// Handle Stripe Deposit Payment Submission
	const handleProcessDeposit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedService || !selectedDate || !selectedTime) return;
		if (!intakeName || !intakeEmail) {
			setPaymentError("Please provide your name and email.");
			return;
		}

		setIsProcessingPayment(true);
		setPaymentError(null);

		try {
			const res = await fetch("./api/bookings/checkout-deposit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					service_id: selectedService.id,
					client_name: intakeName,
					client_email: intakeEmail,
					client_phone: intakePhone,
					client_company: intakeCompany,
					client_role: intakeRole,
					linkedin: intakeLinkedin,
					intake_goals: intakeGoals,
					intake_biggest_hurdle: intakeHurdle,
					booking_date: selectedDate,
					booking_time: selectedTime,
					timezone: selectedTimezone,
					card_last4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
					card_brand: cardNumber.startsWith("4") ? "visa" : "mastercard",
					simulated_card_type: simulatedCardType,
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Payment failed. Please verify your card details.");
			}

			setCompletedBooking(data.booking);
			setReceiptData(data.receipt);
			setBookingStep(5); // Go to receipt
		} catch (err: any) {
			setPaymentError(err.message || "Stripe transaction could not be completed.");
		} finally {
			setIsProcessingPayment(false);
		}
	};

	// Client Booking Lookup
	const handleLookupBooking = (e: React.FormEvent) => {
		e.preventDefault();
		if (!lookupRef || !lookupEmail) return;
		setLookupLoading(true);
		setLookupError(null);

		fetch(`./api/bookings/lookup?ref=${encodeURIComponent(lookupRef)}&email=${encodeURIComponent(lookupEmail)}`)
			.then((res) => {
				if (!res.ok) throw new Error("Booking not found. Please check your Reference Code and Email.");
				return res.json();
			})
			.then((b: Booking) => {
				setLookupResult(b);
				setRescheduleDate(b.booking_date);
				setRescheduleTime(b.booking_time);
			})
			.catch((err) => {
				setLookupError(err.message);
				setLookupResult(null);
			})
			.finally(() => setLookupLoading(false));
	};

	// Client Reschedule Action
	const handleConfirmReschedule = async () => {
		if (!lookupResult || !rescheduleDate || !rescheduleTime) return;
		setLookupLoading(true);
		try {
			const res = await fetch("./api/bookings/reschedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ref_code: lookupResult.ref_code,
					email: lookupResult.client_email,
					new_date: rescheduleDate,
					new_time: rescheduleTime,
					new_timezone: lookupResult.timezone,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Could not reschedule.");
			setLookupResult(data.booking);
			setRescheduling(false);
		} catch (err: any) {
			setLookupError(err.message);
		} finally {
			setLookupLoading(false);
		}
	};

	// Admin Auth Login
	const handleAdminLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setAdminError(null);
		try {
			const res = await fetch("./api/admin/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pin: adminPin }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Login failed");
			setAdminToken(data.token);
			fetchAdminDashboard(data.token);
		} catch (err: any) {
			setAdminError(err.message);
		}
	};

	// Fetch Admin Dashboard Data
	const fetchAdminDashboard = (token: string) => {
		fetch("./api/admin/dashboard", {
			headers: { "X-Admin-Token": token },
		})
			.then((res) => res.json())
			.then((data) => setAdminDashboard(data))
			.catch((err) => console.error("Admin dashboard fetch error:", err));
	};

	// Admin Update Booking
	const handleAdminUpdateBooking = async (
		id: number,
		updates: { deposit_status?: string; balance_status?: string; booking_status?: string; coach_notes?: string }
	) => {
		if (!adminToken) return;
		try {
			const res = await fetch("./api/admin/bookings/update", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Token": adminToken,
				},
				body: JSON.stringify({ id, ...updates }),
			});
			if (res.ok) {
				fetchAdminDashboard(adminToken);
				if (selectedClientDetail && selectedClientDetail.id === id) {
					setSelectedClientDetail((prev) => (prev ? { ...prev, ...updates } : null));
				}
			}
		} catch (err) {
			console.error("Booking update error", err);
		}
	};

	// Admin Block Slot
	const handleAdminBlockDate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!adminToken || !blockDateInput) return;
		try {
			await fetch("./api/admin/slots/block", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
				body: JSON.stringify({ block_date: blockDateInput, reason: blockReasonInput || "Coach Blocked" }),
			});
			setBlockDateInput("");
			setBlockReasonInput("");
			fetchAdminDashboard(adminToken);
		} catch (err) {
			console.error("Block date error", err);
		}
	};

	// Admin Unblock Slot
	const handleAdminUnblock = async (id: number) => {
		if (!adminToken) return;
		try {
			await fetch("./api/admin/slots/unblock", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
				body: JSON.stringify({ id }),
			});
			fetchAdminDashboard(adminToken);
		} catch (err) {
			console.error("Unblock error", err);
		}
	};

	// Download Calendar .ics
	const downloadIcs = (booking: Booking) => {
		const startIso = `${booking.booking_date.replace(/-/g, "")}T${booking.booking_time.replace(":", "")}00Z`;
		const icsContent = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//Vanguard Coaching//Executive Advisory//EN",
			"CALSCALE:GREGORIAN",
			"BEGIN:VEVENT",
			`SUMMARY:Vanguard Advisory: ${booking.service_title}`,
			`DESCRIPTION:Executive Coaching Session with Marcus Vance.\\nRef: ${booking.ref_code}\\nDeposit Paid: $${booking.deposit_amount}`,
			`DTSTART:${startIso}`,
			`DTEND:${startIso}`,
			"STATUS:CONFIRMED",
			"LOCATION:Private Zoom Room (Sent via Email)",
			"END:VEVENT",
			"END:VCALENDAR",
		].join("\r\n");

		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `vanguard-session-${booking.ref_code}.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Calendar calculation helpers
	const calendarDays = useMemo(() => {
		const year = calCurrentDate.getFullYear();
		const month = calCurrentDate.getMonth();
		const firstDayIndex = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const days = [];
		for (let i = 0; i < firstDayIndex; i++) {
			days.push({ day: null, dateStr: "" });
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const mStr = String(month + 1).padStart(2, "0");
			const dStr = String(d).padStart(2, "0");
			const dateStr = `${year}-${mStr}-${dStr}`;
			days.push({ day: d, dateStr });
		}
		return days;
	}, [calCurrentDate]);

	// Filtered Admin Bookings
	const filteredAdminBookings = useMemo(() => {
		if (!adminDashboard?.bookings) return [];
		return adminDashboard.bookings.filter((b: Booking) => {
			const matchesSearch =
				b.client_name.toLowerCase().includes(adminSearch.toLowerCase()) ||
				b.client_email.toLowerCase().includes(adminSearch.toLowerCase()) ||
				b.ref_code.toLowerCase().includes(adminSearch.toLowerCase()) ||
				(b.client_company && b.client_company.toLowerCase().includes(adminSearch.toLowerCase()));
			if (adminFilterStatus === "all") return matchesSearch;
			if (adminFilterStatus === "confirmed") return matchesSearch && b.booking_status === "confirmed";
			if (adminFilterStatus === "balance_pending") return matchesSearch && b.balance_status === "pending";
			if (adminFilterStatus === "completed") return matchesSearch && b.booking_status === "completed";
			if (adminFilterStatus === "refunded") return matchesSearch && b.deposit_status === "refunded";
			return matchesSearch;
		});
	}, [adminDashboard, adminSearch, adminFilterStatus]);

	return (
		<div className="app-root">
			{/* Top Navigation Bar */}
			<header className="header-nav">
				<div className="shell nav-container">
					<div
						className="brand-logo"
						onClick={() => {
							setActiveView("client");
							setBookingModalOpen(false);
						}}
					>
						<div className="brand-emblem">V</div>
						<div>
							<div className="brand-text-title">VANGUARD</div>
							<div className="brand-text-sub">Executive Advisory & Coaching</div>
						</div>
					</div>

					<nav className="nav-links">
						{activeView === "client" ? (
							<>
								<a href="#programs" className="nav-link">
									Programs & Deposits
								</a>
								<a href="#deposit-policy" className="nav-link">
									Deposit Policy
								</a>
								<a href="#testimonials" className="nav-link">
									Client Results
								</a>
								<button
									type="button"
									className="nav-link"
									onClick={() => {
										setLookupModalOpen(true);
										setLookupError(null);
									}}
								>
									Look Up Booking
								</button>
								<button
									type="button"
									className="btn btn-outline-gold btn-sm"
									onClick={() => {
										setActiveView("admin");
										if (adminToken) fetchAdminDashboard(adminToken);
									}}
								>
									Coach Portal
								</button>
							</>
						) : (
							<>
								<span className="badge-gold">Coach Portal Active</span>
								<button
									type="button"
									className="btn btn-secondary btn-sm"
									onClick={() => setActiveView("client")}
								>
									← Back to Public Site
								</button>
							</>
						)}
					</nav>
				</div>
			</header>

			{/* VIEW 1: CLIENT FACING COACHING SITE */}
			{activeView === "client" && (
				<main>
					{/* Hero Section */}
					<section className="hero-section shell">
						<div className="hero-pill">
							<span className="live-indicator" />
							<span>Now Booking Q3/Q4 Strategic Retainers • Limited to 4 Leaders</span>
						</div>

						<h1 className="hero-title">
							Uncompromising Leadership Advisory with <em>Guaranteed Execution</em>
						</h1>

						<p className="hero-subtitle">
							High-impact strategic advisory and executive coaching for venture founders, C-Suite leaders, and enterprise VPs. Lock your strategy session with an instant Stripe deposit.
						</p>

						<div className="hero-actions">
							<a href="#programs" className="btn btn-gold btn-lg">
								Explore Advisory Tracks & Book
							</a>
							<button
								type="button"
								className="btn btn-secondary btn-lg"
								onClick={() => {
									const discovery = services.find((s) => s.id === "discovery-consultation") || services[0];
									if (discovery) handleOpenBooking(discovery);
								}}
							>
								Schedule $50 Fit Session
							</button>
						</div>

						{/* Executive Credentials Bar */}
						<div className="credentials-bar">
							<div className="credential-item">
								<div className="cred-val">
									450<span>+</span>
								</div>
								<div className="cred-lbl">Executive Leaders Coached</div>
							</div>
							<div className="credential-item">
								<div className="cred-val">
									$180M<span>+</span>
								</div>
								<div className="cred-lbl">Client Valuation Growth</div>
							</div>
							<div className="credential-item">
								<div className="cred-val">
									100<span>%</span>
								</div>
								<div className="cred-lbl">Stripe Deposit Credited</div>
							</div>
							<div className="credential-item">
								<div className="cred-val">
									4.9<span>/5</span>
								</div>
								<div className="cred-lbl">Executive NPS Rating</div>
							</div>
						</div>
					</section>

					{/* Coaching Programs & Deposit Booking Cards */}
					<section id="programs" className="section-wrapper shell">
						<div className="section-head">
							<div className="section-tag">COACHING TRACKS & PACKAGES</div>
							<h2 className="section-title">Select Your Advisory Program</h2>
							<p className="section-desc">
								All packages require an initial Stripe deposit to reserve the coach calendar slot. The remaining balance is billed after your intake review.
							</p>
						</div>

						{loadingServices ? (
							<Loading label="Loading coaching packages..." />
						) : servicesError ? (
							<ErrorStrip message={servicesError} onRetry={fetchServices} />
						) : (
							<div className="packages-grid">
								{services.map((svc, idx) => (
									<div
										key={svc.id}
										className={`package-card ${svc.badge === "Most Popular" || svc.badge === "Signature Program" ? "highlighted" : ""}`}
									>
										{svc.badge && (
											<div className="package-badge-wrap">
												<span className="badge-gold">{svc.badge}</span>
											</div>
										)}

										<div className="package-header">
											<div className="package-category">{svc.category} • {svc.duration}</div>
											<h3 className="package-title">{svc.title}</h3>
											<p className="package-subtitle">{svc.subtitle}</p>
										</div>

										<div className="deposit-pricing-box">
											<div className="deposit-callout">
												<span className="deposit-label">Stripe Deposit Today:</span>
												<span className="deposit-amount">${svc.deposit_amount}</span>
											</div>
											<div className="full-price-row">
												<span>Total Program Investment:</span>
												<span>${svc.full_price.toLocaleString()}</span>
											</div>
										</div>

										<p className="package-desc">{svc.description}</p>

										<ul className="package-features">
											{svc.features.map((feat, fIdx) => (
												<li key={fIdx}>
													<span className="feature-check">✦</span>
													<span>{feat}</span>
												</li>
											))}
										</ul>

										<button
											type="button"
											className={`btn ${svc.badge === "Most Popular" ? "btn-gold" : "btn-secondary"}`}
											onClick={() => handleOpenBooking(svc)}
										>
											Book Slot with ${svc.deposit_amount} Deposit →
										</button>
									</div>
								))}
							</div>
						)}
					</section>

					{/* How Stripe Deposit Booking Works */}
					<section id="deposit-policy" className="section-wrapper shell">
						<div className="deposit-explainer">
							<div className="section-head" style={{ marginBottom: "2rem" }}>
								<div className="section-tag">TRANSPARENT RESERVATIONS</div>
								<h3 className="section-title" style={{ fontSize: "1.8rem" }}>
									How Deposit Bookings Work
								</h3>
								<p className="section-desc">
									We use Stripe-secured deposits to protect high-touch calendar availability while providing flexibility for executive schedules.
								</p>
							</div>

							<div className="explainer-grid">
								<div className="explainer-step">
									<div className="step-num">1</div>
									<h4 className="step-title">Reserve with Partial Deposit</h4>
									<p className="step-desc">
										Select your preferred date & time. Authorize a small deposit ($50–$500 depending on package) via encrypted Stripe checkout.
									</p>
								</div>
								<div className="explainer-step">
									<div className="step-num">2</div>
									<h4 className="step-title">Diagnostic & Intake Audit</h4>
									<p className="step-desc">
										Complete your confidential executive intake form. Lead Coach Marcus Vance reviews your goals and pre-call diagnostic 48h prior.
									</p>
								</div>
								<div className="explainer-step">
									<div className="step-num">3</div>
									<h4 className="step-title">100% Deposit Applied</h4>
									<p className="step-desc">
										Your initial deposit is credited 100% toward the total coaching investment. The remaining balance is only charged after session confirmation.
									</p>
								</div>
								<div className="explainer-step">
									<div className="step-num">4</div>
									<h4 className="step-title">Flexible 48-Hour Rescheduling</h4>
									<p className="step-desc">
										Emergency board meeting or conflict? Use your unique Reference Code to reschedule your time slot with zero penalty up to 48h before.
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Social Proof / Client Testimonials */}
					<section id="testimonials" className="section-wrapper shell">
						<div className="section-head">
							<div className="section-tag">TESTIMONIALS & CASE STUDIES</div>
							<h2 className="section-title">Tested by World-Class Operators</h2>
							<p className="section-desc">
								Trusted by leaders from high-growth tech scaleups, private equity portfolio companies, and venture backed startups.
							</p>
						</div>

						<div className="testimonials-grid">
							<div className="testimonial-card">
								<p className="quote-text">
									"The 90-Minute Strategy Intensive paid for itself within the first 48 hours. Marcus quickly cut through executive noise and gave us an exact hiring and board communication framework."
								</p>
								<div className="author-info">
									<div className="author-avatar">SC</div>
									<div>
										<div className="author-name">Sarah Chen</div>
										<div className="author-role">Co-Founder & CEO, HyperScale AI (Series B)</div>
									</div>
								</div>
							</div>

							<div className="testimonial-card">
								<p className="quote-text">
									"The 12-Week Leadership Mastery program transformed my executive presence. Having Marcus as an async sounding board during our $35M fundraise was the best investment our company made."
								</p>
								<div className="author-info">
									<div className="author-avatar">DK</div>
									<div>
										<div className="author-name">David Kaplan</div>
										<div className="author-role">VP of Product & Strategy, Finova</div>
									</div>
								</div>
							</div>

							<div className="testimonial-card">
								<p className="quote-text">
									"Booking via Stripe deposit was seamless. The intake process forced clarity before we even spoke, and the action transcript continues to guide our quarterly executive OKRs."
								</p>
								<div className="author-info">
									<div className="author-avatar">MR</div>
									<div>
										<div className="author-name">Marcus Reynolds</div>
										<div className="author-role">Managing Director, Peak Capital Partners</div>
									</div>
								</div>
							</div>
						</div>
					</section>
				</main>
			)}

			{/* VIEW 2: COACH OWNER ADMIN DASHBOARD */}
			{activeView === "admin" && (
				<main className="shell section-wrapper">
					{!adminToken ? (
						<div style={{ maxWidth: "26rem", margin: "3rem auto" }} className="package-card">
							<div className="section-tag" style={{ textAlign: "center" }}>
								COACH AUTHENTICATION
							</div>
							<h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#fff" }}>
								Coach Management Portal
							</h2>
							<p style={{ fontSize: "0.85rem", color: "var(--fg-secondary)", marginBottom: "1.5rem", textAlign: "center" }}>
								Enter your Coach Security PIN to view private client bookings, deposits collected, and manage calendar blocks.
							</p>

							{adminError && <ErrorStrip message={adminError} />}

							<form onSubmit={handleAdminLogin}>
								<div className="form-group">
									<label className="form-label">Coach PIN or Passkey</label>
									<input
										type="password"
										className="form-input"
										value={adminPin}
										onChange={(e) => setAdminPin(e.target.value)}
										placeholder="e.g. vanguard2026"
										required
									/>
									<span style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: "0.25rem" }}>
										Demo PIN is: <code style={{ color: "var(--accent-gold)" }}>vanguard2026</code>
									</span>
								</div>

								<button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: "0.5rem" }}>
									Authenticate Coach Session →
								</button>
							</form>
						</div>
					) : (
						<div>
							{/* Admin Top Header */}
							<div className="admin-header-bar">
								<div>
									<h2 style={{ color: "#fff", fontSize: "1.75rem" }}>Executive Coach CRM & Deposits</h2>
									<p style={{ color: "var(--fg-secondary)", fontSize: "0.85rem" }}>
										Logged in as <strong>Marcus Vance</strong> (Lead Executive Coach)
									</p>
								</div>
								<div style={{ display: "flex", gap: "0.75rem" }}>
									<button
										type="button"
										className="btn btn-secondary btn-sm"
										onClick={() => fetchAdminDashboard(adminToken)}
									>
										↻ Refresh Data
									</button>
									<button
										type="button"
										className="btn btn-outline-gold btn-sm"
										onClick={() => setAdminToken(null)}
									>
										Log Out
									</button>
								</div>
							</div>

							{/* Stats KPIs */}
							{adminDashboard?.stats && (
								<div className="kpi-grid">
									<div className="kpi-card">
										<div className="kpi-title">Stripe Deposits Collected</div>
										<div className="kpi-value gold">
											${adminDashboard.stats.totalDeposits.toLocaleString()}
										</div>
										<span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>
											✓ Instant Card Settlement
										</span>
									</div>
									<div className="kpi-card">
										<div className="kpi-title">Total Contract Value</div>
										<div className="kpi-value">
											${adminDashboard.stats.totalProjected.toLocaleString()}
										</div>
										<span style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>
											Across all active advisory tracks
										</span>
									</div>
									<div className="kpi-card">
										<div className="kpi-title">Pending Balance Due</div>
										<div className="kpi-value">
											${adminDashboard.stats.pendingBalance.toLocaleString()}
										</div>
										<span style={{ fontSize: "0.75rem", color: "var(--fg-secondary)" }}>
											Due post intake / on delivery
										</span>
									</div>
									<div className="kpi-card">
										<div className="kpi-title">Active Client Sessions</div>
										<div className="kpi-value">
											{adminDashboard.stats.activeBookings}
										</div>
										<span style={{ fontSize: "0.75rem", color: "var(--accent-gold)" }}>
											{adminDashboard.stats.totalClientsCount} total records
										</span>
									</div>
								</div>
							)}

							{/* Admin Tabs */}
							<div className="admin-tabs">
								<button
									type="button"
									className={`tab-btn ${adminTab === "bookings" ? "active" : ""}`}
									onClick={() => setAdminTab("bookings")}
								>
									Bookings & Client Intakes ({adminDashboard?.bookings?.length || 0})
								</button>
								<button
									type="button"
									className={`tab-btn ${adminTab === "blocks" ? "active" : ""}`}
									onClick={() => setAdminTab("blocks")}
								>
									Calendar Blocks & Working Hours
								</button>
								<button
									type="button"
									className={`tab-btn ${adminTab === "services" ? "active" : ""}`}
									onClick={() => setAdminTab("services")}
								>
									Package Pricing & Deposit Rules
								</button>
							</div>

							{/* TAB 1: BOOKINGS CRM */}
							{adminTab === "bookings" && (
								<div>
									<div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
										<input
											type="text"
											className="form-input"
											style={{ maxWidth: "20rem" }}
											placeholder="Search by client, email, ref code..."
											value={adminSearch}
											onChange={(e) => setAdminSearch(e.target.value)}
										/>
										<div style={{ display: "flex", gap: "0.5rem" }}>
											{["all", "confirmed", "balance_pending", "completed", "refunded"].map((status) => (
												<button
													key={status}
													type="button"
													className={`btn btn-sm ${adminFilterStatus === status ? "btn-gold" : "btn-secondary"}`}
													onClick={() => setAdminFilterStatus(status)}
												>
													{status.replace("_", " ")}
												</button>
											))}
										</div>
									</div>

									{filteredAdminBookings.length === 0 ? (
										<Empty title="No bookings found" hint="No client bookings match the current filter." />
									) : (
										<div className="bookings-table-wrapper">
											<table className="custom-table">
												<thead>
													<tr>
														<th>Ref & Client</th>
														<th>Program</th>
														<th>Session Date</th>
														<th>Stripe Deposit</th>
														<th>Balance Status</th>
														<th>Booking Status</th>
														<th>Actions</th>
													</tr>
												</thead>
												<tbody>
													{filteredAdminBookings.map((b: Booking) => (
														<tr key={b.id}>
															<td>
																<div style={{ fontWeight: 600, color: "#fff" }}>{b.client_name}</div>
																<div style={{ fontSize: "0.75rem", color: "var(--accent-gold)" }}>{b.ref_code}</div>
																<div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>{b.client_email}</div>
															</td>
															<td>
																<div style={{ fontWeight: 500 }}>{b.service_title}</div>
																{b.client_company && (
																	<div style={{ fontSize: "0.75rem", color: "var(--fg-secondary)" }}>
																		{b.client_role} @ {b.client_company}
																	</div>
																)}
															</td>
															<td>
																<div style={{ fontWeight: 600 }}>{b.booking_date}</div>
																<div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>
																	{b.booking_time} • {b.timezone.split(" ")[0]}
																</div>
															</td>
															<td>
																<div style={{ fontWeight: 700, color: "var(--accent-gold)" }}>
																	${b.deposit_amount}
																</div>
																<span className="badge-emerald" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>
																	{b.deposit_status.toUpperCase()} ({b.card_brand} •••• {b.card_last4})
																</span>
															</td>
															<td>
																{b.balance_status === "paid" ? (
																	<span className="badge-emerald">PAID (${b.balance_amount})</span>
																) : (
																	<span className="badge-blue">PENDING (${b.balance_amount})</span>
																)}
															</td>
															<td>
																<span
																	className={`badge-${b.booking_status === "confirmed" ? "emerald" : b.booking_status === "completed" ? "blue" : "gold"}`}
																>
																	{b.booking_status.toUpperCase()}
																</span>
															</td>
															<td>
																<div style={{ display: "flex", gap: "0.35rem" }}>
																	<button
																		type="button"
																		className="btn btn-secondary btn-sm"
																		onClick={() => setSelectedClientDetail(b)}
																	>
																		Intake & Details
																	</button>
																	{b.balance_status === "pending" && (
																		<button
																			type="button"
																			className="btn btn-outline-gold btn-sm"
																			onClick={() => handleAdminUpdateBooking(b.id, { balance_status: "paid" })}
																			title="Mark Remaining Balance Paid"
																		>
																			✓ Paid
																		</button>
																	)}
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}

							{/* TAB 2: CALENDAR BLOCKS */}
							{adminTab === "blocks" && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
									<div className="package-card">
										<h3 style={{ color: "#fff", marginBottom: "1rem" }}>Block Out Calendar Dates</h3>
										<p style={{ fontSize: "0.85rem", color: "var(--fg-secondary)", marginBottom: "1.25rem" }}>
											Block out vacation days, executive retreats, or personal focus time to prevent client booking on those dates.
										</p>

										<form onSubmit={handleAdminBlockDate}>
											<div className="form-group">
												<label className="form-label">Date to Block</label>
												<input
													type="date"
													className="form-input"
													value={blockDateInput}
													onChange={(e) => setBlockDateInput(e.target.value)}
													required
												/>
											</div>
											<div className="form-group">
												<label className="form-label">Reason / Label (Internal)</label>
												<input
													type="text"
													className="form-input"
													placeholder="e.g. Board Retreat / Private Offsite"
													value={blockReasonInput}
													onChange={(e) => setBlockReasonInput(e.target.value)}
												/>
											</div>
											<button type="submit" className="btn btn-gold" style={{ width: "100%" }}>
												+ Block Date in Calendar
											</button>
										</form>
									</div>

									<div className="package-card">
										<h3 style={{ color: "#fff", marginBottom: "1rem" }}>Active Calendar Block Rules</h3>
										{adminDashboard?.blocked?.length === 0 ? (
											<Empty title="No calendar blocks" hint="Coach calendar is currently fully open based on standard hours." />
										) : (
											<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
												{adminDashboard.blocked.map((b: any) => (
													<div
														key={b.id}
														style={{
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
															padding: "0.75rem 1rem",
															background: "var(--bg-surface-elevated)",
															borderRadius: "var(--radius-sm)",
															border: "1px solid var(--border-subtle)",
														}}
													>
														<div>
															<div style={{ fontWeight: 600, color: "#fff" }}>{b.block_date}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--accent-gold)" }}>{b.reason}</div>
														</div>
														<button
															type="button"
															className="btn btn-secondary btn-sm"
															style={{ color: "var(--danger)" }}
															onClick={() => handleAdminUnblock(b.id)}
														>
															Unblock
														</button>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{/* TAB 3: PACKAGE PRICING & DEPOSIT SETTINGS */}
							{adminTab === "services" && (
								<div className="packages-grid">
									{adminDashboard?.services?.map((svc: Service) => (
										<div key={svc.id} className="package-card">
											<div className="package-category">{svc.category}</div>
											<h4 style={{ color: "#fff", fontSize: "1.2rem", marginBottom: "0.5rem" }}>{svc.title}</h4>
											<div className="deposit-pricing-box">
												<div className="deposit-callout">
													<span>Stripe Deposit:</span>
													<span className="deposit-amount">${svc.deposit_amount}</span>
												</div>
												<div className="full-price-row">
													<span>Total Price:</span>
													<span>${svc.full_price.toLocaleString()}</span>
												</div>
											</div>
											<div style={{ fontSize: "0.85rem", color: "var(--fg-secondary)", marginBottom: "1rem" }}>
												Duration: <strong>{svc.duration}</strong>
											</div>
											<div style={{ display: "flex", gap: "0.5rem" }}>
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() => {
														const newDep = prompt(`Enter new deposit amount for ${svc.title}:`, String(svc.deposit_amount));
														if (newDep && !isNaN(Number(newDep))) {
															fetch("./api/admin/services/update", {
																method: "POST",
																headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
																body: JSON.stringify({ id: svc.id, deposit_amount: Number(newDep) }),
															}).then(() => fetchAdminDashboard(adminToken));
														}
													}}
												>
													Edit Deposit ($)
												</button>
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() => {
														const newPrice = prompt(`Enter total investment for ${svc.title}:`, String(svc.full_price));
														if (newPrice && !isNaN(Number(newPrice))) {
															fetch("./api/admin/services/update", {
																method: "POST",
																headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
																body: JSON.stringify({ id: svc.id, full_price: Number(newPrice) }),
															}).then(() => fetchAdminDashboard(adminToken));
														}
													}}
												>
													Edit Price ($)
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</main>
			)}

			{/* MODAL 1: INTERACTIVE BOOKING & STRIPE DEPOSIT MODAL */}
			{bookingModalOpen && selectedService && (
				<div className="modal-overlay" onClick={() => setBookingModalOpen(false)}>
					<div className="booking-modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<div>
								<span className="badge-gold" style={{ marginBottom: "0.25rem" }}>
									Stripe Deposit Reservation
								</span>
								<h3>{selectedService.title}</h3>
							</div>
							<button type="button" className="close-btn" onClick={() => setBookingModalOpen(false)}>
								✕
							</button>
						</div>

						{/* Stepper Progress Header */}
						<div style={{ padding: "1.25rem 1.5rem 0" }}>
							<div className="stepper-header">
								<div className={`step-indicator ${bookingStep >= 2 ? "completed" : "active"}`}>
									<div className="step-circle">{bookingStep > 2 ? "✓" : "1"}</div>
									<span className="step-name">Slot Picker</span>
								</div>
								<div className={`step-indicator ${bookingStep === 3 ? "active" : bookingStep > 3 ? "completed" : ""}`}>
									<div className="step-circle">{bookingStep > 3 ? "✓" : "2"}</div>
									<span className="step-name">Intake Audit</span>
								</div>
								<div className={`step-indicator ${bookingStep === 4 ? "active" : bookingStep > 4 ? "completed" : ""}`}>
									<div className="step-circle">{bookingStep > 4 ? "✓" : "3"}</div>
									<span className="step-name">Stripe Deposit</span>
								</div>
								<div className={`step-indicator ${bookingStep === 5 ? "active completed" : ""}`}>
									<div className="step-circle">4</div>
									<span className="step-name">Confirmation</span>
								</div>
							</div>
						</div>

						<div className="modal-body">
							{/* STEP 2: DATE & TIME SELECTOR */}
							{bookingStep === 2 && (
								<div>
									<div className="calendar-wrapper">
										{/* Calendar Month Picker */}
										<div>
											<div className="cal-month-header">
												<button
													type="button"
													className="cal-nav-btn"
													onClick={() => {
														const prev = new Date(calCurrentDate);
														prev.setMonth(prev.getMonth() - 1);
														setCalCurrentDate(prev);
													}}
												>
													‹
												</button>
												<span className="cal-month-title">
													{calCurrentDate.toLocaleString("default", { month: "long", year: "numeric" })}
												</span>
												<button
													type="button"
													className="cal-nav-btn"
													onClick={() => {
														const next = new Date(calCurrentDate);
														next.setMonth(next.getMonth() + 1);
														setCalCurrentDate(next);
													}}
												>
													›
												</button>
											</div>

											<div className="calendar-grid">
												{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
													<div key={w} className="cal-weekday">
														{w}
													</div>
												))}
												{calendarDays.map((cd, idx) => {
													if (!cd.day) return <div key={idx} />;
													const isSelected = selectedDate === cd.dateStr;
													const todayStr = new Date().toISOString().split("T")[0];
													const isPast = cd.dateStr < todayStr;
													// Check if blocked by coach
													const isBlocked = availability?.blocked.some((b) => b.block_date === cd.dateStr && !b.block_time);

													return (
														<button
															key={idx}
															type="button"
															disabled={isPast || isBlocked}
															className={`cal-day-cell ${isSelected ? "selected" : ""} ${!isPast && !isBlocked ? "has-availability" : ""}`}
															onClick={() => setSelectedDate(cd.dateStr)}
															title={isBlocked ? "Coach Blocked" : cd.dateStr}
														>
															{cd.day}
														</button>
													);
												})}
											</div>
										</div>

										{/* Time Slots Selector */}
										<div className="slots-pane">
											<div className="slots-pane-title">
												<span>Available Slots:</span>
												<span style={{ color: "var(--accent-gold)" }}>{selectedDate || "Select Date"}</span>
											</div>

											{loadingAvailability ? (
												<Loading label="Checking coach schedule..." />
											) : (
												<div className="slots-grid">
													{(availability?.standardSlots || ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"]).map((slot) => {
														const isBooked = availability?.booked.some(
															(b) => b.booking_date === selectedDate && b.booking_time === slot
														);
														const isBlockedTime = availability?.blocked.some(
															(b) => b.block_date === selectedDate && b.block_time === slot
														);
														const isDisabled = isBooked || isBlockedTime;

														return (
															<button
																key={slot}
																type="button"
																disabled={isDisabled}
																className={`slot-btn ${selectedTime === slot ? "selected" : ""}`}
																onClick={() => setSelectedTime(slot)}
															>
																{slot} {isDisabled ? "(Reserved)" : ""}
															</button>
														);
													})}
												</div>
											)}

											<div className="timezone-selector">
												<label className="form-label" style={{ fontSize: "0.75rem" }}>
													Your Local Timezone:
												</label>
												<select
													className="form-select"
													style={{ fontSize: "0.8rem", padding: "0.4rem" }}
													value={selectedTimezone}
													onChange={(e) => setSelectedTimezone(e.target.value)}
												>
													{TIMEZONES.map((tz) => (
														<option key={tz} value={tz}>
															{tz}
														</option>
													))}
												</select>
											</div>
										</div>
									</div>

									<div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
										<button
											type="button"
											disabled={!selectedDate || !selectedTime}
											className="btn btn-gold"
											onClick={() => setBookingStep(3)}
										>
											Continue to Intake Audit →
										</button>
									</div>
								</div>
							)}

							{/* STEP 3: INTAKE AUDIT FORM */}
							{bookingStep === 3 && (
								<form
									onSubmit={(e) => {
										e.preventDefault();
										setBookingStep(4);
									}}
								>
									<div className="form-row">
										<div className="form-group">
											<label className="form-label">Full Name *</label>
											<input
												type="text"
												className="form-input"
												required
												value={intakeName}
												onChange={(e) => setIntakeName(e.target.value)}
												placeholder="e.g. Jessica Sterling"
											/>
										</div>
										<div className="form-group">
											<label className="form-label">Executive Work Email *</label>
											<input
												type="email"
												className="form-input"
												required
												value={intakeEmail}
												onChange={(e) => setIntakeEmail(e.target.value)}
												placeholder="jessica@company.com"
											/>
										</div>
									</div>

									<div className="form-row">
										<div className="form-group">
											<label className="form-label">Company / Organization</label>
											<input
												type="text"
												className="form-input"
												value={intakeCompany}
												onChange={(e) => setIntakeCompany(e.target.value)}
												placeholder="e.g. Acme Health Technologies"
											/>
										</div>
										<div className="form-group">
											<label className="form-label">Your Executive Role / Title</label>
											<input
												type="text"
												className="form-input"
												value={intakeRole}
												onChange={(e) => setIntakeRole(e.target.value)}
												placeholder="e.g. VP of Product / Founder"
											/>
										</div>
									</div>

									<div className="form-row">
										<div className="form-group">
											<label className="form-label">Phone / WhatsApp</label>
											<input
												type="tel"
												className="form-input"
												value={intakePhone}
												onChange={(e) => setIntakePhone(e.target.value)}
												placeholder="+1 (555) 019-2834"
											/>
										</div>
										<div className="form-group">
											<label className="form-label">LinkedIn or Bio URL</label>
											<input
												type="url"
												className="form-input"
												value={intakeLinkedin}
												onChange={(e) => setIntakeLinkedin(e.target.value)}
												placeholder="https://linkedin.com/in/..."
											/>
										</div>
									</div>

									<div className="form-group">
										<label className="form-label">
											Primary Strategic Goal or Objective for Coaching
										</label>
										<textarea
											className="form-textarea"
											rows={2}
											value={intakeGoals}
											onChange={(e) => setIntakeGoals(e.target.value)}
											placeholder="What does a breakthrough 10x outcome look like for you in the next 90 days?"
										/>
									</div>

									<div className="form-group">
										<label className="form-label">
											Current #1 Leadership Bottleneck or Challenge
										</label>
										<textarea
											className="form-textarea"
											rows={2}
											value={intakeHurdle}
											onChange={(e) => setIntakeHurdle(e.target.value)}
											placeholder="e.g. Scaling team delegation, executive presence with board, cross-functional velocity friction..."
										/>
									</div>

									<div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
										<button type="button" className="btn btn-secondary" onClick={() => setBookingStep(2)}>
											← Back to Slot Picker
										</button>
										<button type="submit" className="btn btn-gold">
											Proceed to Stripe Deposit (${selectedService.deposit_amount}) →
										</button>
									</div>
								</form>
							)}

							{/* STEP 4: STRIPE DEPOSIT PAYMENT */}
							{bookingStep === 4 && (
								<form onSubmit={handleProcessDeposit}>
									{/* Order Breakdown */}
									<div className="summary-card">
										<div className="summary-row">
											<span>Selected Program:</span>
											<strong style={{ color: "#fff" }}>{selectedService.title}</strong>
										</div>
										<div className="summary-row">
											<span>Reserved Slot:</span>
											<span>
												{selectedDate} at {selectedTime} ({selectedTimezone.split(" ")[0]})
											</span>
										</div>
										<div className="summary-row">
											<span>Full Program Investment:</span>
											<span>${selectedService.full_price.toLocaleString()}</span>
										</div>
										<div className="summary-row total-row">
											<div>
												<div>Stripe Deposit Required Today:</div>
												<div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", fontWeight: 400 }}>
													Balance of ${(selectedService.full_price - selectedService.deposit_amount).toLocaleString()} invoiced post-audit
												</div>
											</div>
											<div className="highlight-gold">${selectedService.deposit_amount}</div>
										</div>
									</div>

									{paymentError && <ErrorStrip message={paymentError} />}

									{/* Stripe Elements Mock Box */}
									<div className="stripe-box">
										<div className="stripe-badge-bar">
											<div className="stripe-logo-text">
												<span>stripe</span>
												<span style={{ color: "var(--fg-muted)", fontSize: "0.8rem", fontWeight: 400 }}>
													| Elements Secure Deposit
												</span>
											</div>
											<div className="stripe-badge-security">🔒 256-Bit TLS Encryption</div>
										</div>

										<div className="stripe-card-field-group">
											<div className="stripe-card-input-row">
												<input
													type="text"
													className="stripe-inner-input"
													placeholder="Card Number"
													value={cardNumber}
													onChange={handleCardNumberChange}
													maxLength={19}
													required
												/>
												<span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontWeight: 600 }}>
													{cardNumber.startsWith("4") ? "VISA" : "MC"}
												</span>
											</div>
											<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
												<div className="stripe-card-input-row">
													<input
														type="text"
														className="stripe-inner-input"
														placeholder="MM/YY"
														value={cardExp}
														onChange={(e) => setCardExp(e.target.value)}
														maxLength={5}
														required
													/>
												</div>
												<div className="stripe-card-input-row" style={{ borderLeft: "1px solid #1e293b" }}>
													<input
														type="password"
														className="stripe-inner-input"
														placeholder="CVC"
														value={cardCvc}
														onChange={(e) => setCardCvc(e.target.value)}
														maxLength={4}
														required
													/>
												</div>
												<div className="stripe-card-input-row" style={{ borderLeft: "1px solid #1e293b" }}>
													<input
														type="text"
														className="stripe-inner-input"
														placeholder="ZIP"
														value={cardZip}
														onChange={(e) => setCardZip(e.target.value)}
														maxLength={6}
														required
													/>
												</div>
											</div>
										</div>

										{/* Test Card Presets for live preview testing */}
										<div className="preset-test-cards">
											<span style={{ fontSize: "0.72rem", color: "var(--fg-muted)", alignSelf: "center" }}>
												Test Presets:
											</span>
											<button
												type="button"
												className="test-chip"
												onClick={() => {
													setCardNumber("4242 4242 4242 4242");
													setSimulatedCardType("success");
												}}
											>
												✓ 4242 (Instant Success)
											</button>
											<button
												type="button"
												className="test-chip"
												onClick={() => {
													setCardNumber("4000 0000 0000 0002");
													setSimulatedCardType("declined");
												}}
											>
												✗ Test Decline
											</button>
										</div>
									</div>

									<div style={{ display: "flex", justifyContent: "space-between" }}>
										<button type="button" className="btn btn-secondary" onClick={() => setBookingStep(3)}>
											← Back to Intake
										</button>
										<button type="submit" disabled={isProcessingPayment} className="btn btn-gold btn-lg">
											{isProcessingPayment ? (
												<>
													<span className="spinner" /> Authorizing Deposit...
												</>
											) : (
												`Pay $${selectedService.deposit_amount} Deposit & Lock Slot`
											)}
										</button>
									</div>
								</form>
							)}

							{/* STEP 5: BOOKING CONFIRMATION & RECEIPT */}
							{bookingStep === 5 && completedBooking && (
								<div className="receipt-wrapper">
									<div className="receipt-check-icon">✓</div>
									<h3 style={{ color: "#fff", fontSize: "1.45rem", marginBottom: "0.25rem" }}>
										Deposit Confirmed & Slot Locked!
									</h3>
									<p style={{ color: "var(--fg-secondary)", fontSize: "0.85rem" }}>
										A confirmation email with calendar invitation and Zoom room has been generated for{" "}
										<strong>{completedBooking.client_email}</strong>.
									</p>

									<div className="ref-code-pill">Ref Code: {completedBooking.ref_code}</div>

									<div className="receipt-details-table">
										<div className="item">
											<span className="lbl">Program Track:</span>
											<span className="val">{completedBooking.service_title}</span>
										</div>
										<div className="item">
											<span className="lbl">Scheduled Time:</span>
											<span className="val">
												{completedBooking.booking_date} at {completedBooking.booking_time} ({completedBooking.timezone.split(" ")[0]})
											</span>
										</div>
										<div className="item">
											<span className="lbl">Deposit Charged Today:</span>
											<span className="val" style={{ color: "var(--accent-gold)" }}>
												${completedBooking.deposit_amount}.00 via Stripe ({completedBooking.card_brand.toUpperCase()} •••• {completedBooking.card_last4})
											</span>
										</div>
										<div className="item">
											<span className="lbl">Remaining Balance:</span>
											<span className="val">${completedBooking.balance_amount}.00 (Billed post intake review)</span>
										</div>
										<div className="item">
											<span className="lbl">Stripe Charge ID:</span>
											<span className="val" style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
												{completedBooking.stripe_charge_id}
											</span>
										</div>
									</div>

									<div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
										<button
											type="button"
											className="btn btn-gold"
											onClick={() => downloadIcs(completedBooking)}
										>
											📅 Add to Calendar (.ics)
										</button>
										<button
											type="button"
											className="btn btn-secondary"
											onClick={() => {
												navigator.clipboard?.writeText(completedBooking.ref_code);
												alert(`Reference Code ${completedBooking.ref_code} copied to clipboard.`);
											}}
										>
											📋 Copy Ref Code
										</button>
										<button
											type="button"
											className="btn btn-secondary"
											onClick={() => setBookingModalOpen(false)}
										>
											Close
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* MODAL 2: CLIENT SELF-SERVICE LOOKUP & RESCHEDULE */}
			{lookupModalOpen && (
				<div className="modal-overlay" onClick={() => setLookupModalOpen(false)}>
					<div className="booking-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "34rem" }}>
						<div className="modal-header">
							<h3>Client Booking Self-Service</h3>
							<button type="button" className="close-btn" onClick={() => setLookupModalOpen(false)}>
								✕
							</button>
						</div>

						<div className="modal-body">
							{!lookupResult ? (
								<form onSubmit={handleLookupBooking}>
									<p style={{ fontSize: "0.85rem", color: "var(--fg-secondary)", marginBottom: "1.25rem" }}>
										Enter your unique <strong>Reference Code</strong> (e.g. <code>VG-88412</code>) and email to check your deposit status, balance owed, or reschedule your session.
									</p>

									{lookupError && <ErrorStrip message={lookupError} />}

									<div className="form-group">
										<label className="form-label">Reference Code *</label>
										<input
											type="text"
											className="form-input"
											placeholder="VG-88412"
											required
											value={lookupRef}
											onChange={(e) => setLookupRef(e.target.value)}
										/>
									</div>

									<div className="form-group">
										<label className="form-label">Booking Work Email *</label>
										<input
											type="email"
											className="form-input"
											placeholder="elena.rostova@acmevc.io"
											required
											value={lookupEmail}
											onChange={(e) => setLookupEmail(e.target.value)}
										/>
									</div>

									<button
										type="submit"
										disabled={lookupLoading}
										className="btn btn-gold"
										style={{ width: "100%", marginTop: "0.5rem" }}
									>
										{lookupLoading ? <span className="spinner" /> : "Look Up My Booking →"}
									</button>
								</form>
							) : (
								<div>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
										<div>
											<span className="badge-gold">{lookupResult.ref_code}</span>
											<h4 style={{ color: "#fff", fontSize: "1.2rem", marginTop: "0.35rem" }}>
												{lookupResult.service_title}
											</h4>
										</div>
										<span className="badge-emerald">{lookupResult.booking_status.toUpperCase()}</span>
									</div>

									<div className="receipt-details-table">
										<div className="item">
											<span className="lbl">Client:</span>
											<span className="val">{lookupResult.client_name}</span>
										</div>
										<div className="item">
											<span className="lbl">Current Slot:</span>
											<span className="val">
												{lookupResult.booking_date} at {lookupResult.booking_time}
											</span>
										</div>
										<div className="item">
											<span className="lbl">Stripe Deposit Paid:</span>
											<span className="val" style={{ color: "var(--accent-gold)" }}>
												${lookupResult.deposit_amount} ({lookupResult.deposit_status})
											</span>
										</div>
										<div className="item">
											<span className="lbl">Balance Due:</span>
											<span className="val">
												${lookupResult.balance_amount} ({lookupResult.balance_status})
											</span>
										</div>
										{lookupResult.intake_goals && (
											<div className="item" style={{ flexDirection: "column", gap: "0.25rem" }}>
												<span className="lbl">Submitted Goals:</span>
												<span className="val" style={{ fontSize: "0.8rem", color: "var(--fg-secondary)" }}>
													{lookupResult.intake_goals}
												</span>
											</div>
										)}
									</div>

									{/* Reschedule Box */}
									{rescheduling ? (
										<div style={{ background: "var(--bg-surface-elevated)", padding: "1rem", borderRadius: "var(--radius)", marginBottom: "1rem" }}>
											<h5 style={{ color: "#fff", marginBottom: "0.75rem" }}>Select New Date & Time</h5>
											<div className="form-row">
												<div className="form-group">
													<label className="form-label">New Date</label>
													<input
														type="date"
														className="form-input"
														value={rescheduleDate}
														onChange={(e) => setRescheduleDate(e.target.value)}
													/>
												</div>
												<div className="form-group">
													<label className="form-label">New Time</label>
													<select
														className="form-select"
														value={rescheduleTime}
														onChange={(e) => setRescheduleTime(e.target.value)}
													>
														{["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"].map((s) => (
															<option key={s} value={s}>
																{s}
															</option>
														))}
													</select>
												</div>
											</div>
											<div style={{ display: "flex", gap: "0.5rem" }}>
												<button
													type="button"
													className="btn btn-gold btn-sm"
													onClick={handleConfirmReschedule}
													disabled={lookupLoading}
												>
													Confirm Reschedule
												</button>
												<button
													type="button"
													className="btn btn-secondary btn-sm"
													onClick={() => setRescheduling(false)}
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
											<button
												type="button"
												className="btn btn-outline-gold"
												onClick={() => setRescheduling(true)}
											>
												📅 Reschedule Time Slot
											</button>
											<button
												type="button"
												className="btn btn-secondary"
												onClick={() => downloadIcs(lookupResult)}
											>
												Download .ics Invite
											</button>
											<button
												type="button"
												className="btn btn-secondary"
												onClick={() => setLookupResult(null)}
											>
												Search Another
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* MODAL 3: COACH INTAKE AUDIT & DETAIL MODAL */}
			{selectedClientDetail && (
				<div className="modal-overlay" onClick={() => setSelectedClientDetail(null)}>
					<div className="booking-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "38rem" }}>
						<div className="modal-header">
							<div>
								<span className="badge-gold">{selectedClientDetail.ref_code}</span>
								<h3>{selectedClientDetail.client_name} - Executive Intake</h3>
							</div>
							<button type="button" className="close-btn" onClick={() => setSelectedClientDetail(null)}>
								✕
							</button>
						</div>

						<div className="modal-body">
							<div className="receipt-details-table">
								<div className="item">
									<span className="lbl">Client Email & Phone:</span>
									<span className="val">
										{selectedClientDetail.client_email} • {selectedClientDetail.client_phone || "N/A"}
									</span>
								</div>
								<div className="item">
									<span className="lbl">Company & Title:</span>
									<span className="val">
										{selectedClientDetail.client_role || "Executive"} at {selectedClientDetail.client_company || "N/A"}
									</span>
								</div>
								{selectedClientDetail.linkedin && (
									<div className="item">
										<span className="lbl">LinkedIn Profile:</span>
										<a
											href={selectedClientDetail.linkedin}
											target="_blank"
											rel="noopener noreferrer"
											style={{ color: "var(--accent-gold)" }}
										>
											{selectedClientDetail.linkedin}
										</a>
									</div>
								)}
								<div className="item">
									<span className="lbl">Stripe Deposit:</span>
									<span className="val" style={{ color: "var(--accent-gold)" }}>
										${selectedClientDetail.deposit_amount} (Charge ID: {selectedClientDetail.stripe_charge_id})
									</span>
								</div>
								<div className="item">
									<span className="lbl">Balance Due:</span>
									<span className="val">${selectedClientDetail.balance_amount} ({selectedClientDetail.balance_status})</span>
								</div>
							</div>

							<div style={{ marginBottom: "1rem" }}>
								<h5 style={{ color: "#fff", marginBottom: "0.35rem" }}>Strategic Goals & Desired Outcome:</h5>
								<div style={{ padding: "0.75rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--fg-secondary)" }}>
									{selectedClientDetail.intake_goals || "No specific goal notes submitted."}
								</div>
							</div>

							<div style={{ marginBottom: "1.25rem" }}>
								<h5 style={{ color: "#fff", marginBottom: "0.35rem" }}>Current Bottleneck & Hurdles:</h5>
								<div style={{ padding: "0.75rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--fg-secondary)" }}>
									{selectedClientDetail.intake_biggest_hurdle || "None specified."}
								</div>
							</div>

							<div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
								{selectedClientDetail.balance_status === "pending" && (
									<button
										type="button"
										className="btn btn-gold btn-sm"
										onClick={() => handleAdminUpdateBooking(selectedClientDetail.id, { balance_status: "paid" })}
									>
										Mark Remaining Balance Paid ($ {selectedClientDetail.balance_amount})
									</button>
								)}
								{selectedClientDetail.deposit_status !== "refunded" && (
									<button
										type="button"
										className="btn btn-secondary btn-sm"
										style={{ color: "var(--danger)" }}
										onClick={() => {
											if (confirm("Simulate deposit refund to client card?")) {
												handleAdminUpdateBooking(selectedClientDetail.id, { deposit_status: "refunded", booking_status: "cancelled" });
											}
										}}
									>
										Simulate Deposit Refund
									</button>
								)}
								<button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedClientDetail(null)}>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Footer */}
			<footer className="footer-wrap">
				<div className="shell footer-grid">
					<div className="footer-col">
						<div className="brand-logo" style={{ marginBottom: "1rem" }}>
							<div className="brand-emblem">V</div>
							<div>
								<div className="brand-text-title">VANGUARD</div>
								<div className="brand-text-sub">Executive Advisory</div>
							</div>
						</div>
						<p style={{ color: "var(--fg-muted)", fontSize: "0.85rem", maxWidth: "26rem" }}>
							High-touch executive coaching & strategic clarity for ambitious leaders. Secured with Stripe-deposit booking infrastructure.
						</p>
					</div>

					<div className="footer-col">
						<h4>Direct Access</h4>
						<ul className="footer-links">
							<li>
								<a href="#programs">Strategy Intensives</a>
							</li>
							<li>
								<a href="#programs">12-Week Leadership</a>
							</li>
							<li>
								<button type="button" onClick={() => setLookupModalOpen(true)}>
									Look Up My Reservation
								</button>
							</li>
							<li>
								<button type="button" onClick={() => setActiveView("admin")}>
									Coach Portal Login
								</button>
							</li>
						</ul>
					</div>

					<div className="footer-col">
						<h4>Security & Trust</h4>
						<p style={{ color: "var(--fg-muted)", fontSize: "0.82rem", lineHeight: "1.6" }}>
							All deposit payments are processed with bank-grade 256-bit encryption via Stripe. 100% deposit credit toward active packages with a flexible 48-hour reschedule window.
						</p>
					</div>
				</div>

				<div className="shell footer-bottom">
					<div>© 2026 Vanguard Executive Advisory LLC. All rights reserved.</div>
					<div>Powered by Cloudflare SpaceDO & Stripe Payment Elements</div>
				</div>
			</footer>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	createRoot(container).render(<App />);
}
