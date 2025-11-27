import { describe, expect, test } from "bun:test";
import { type PaymentEvent, paymentDecider } from "./decide";

describe("paymentDecider", () => {
	describe("CreatePayment", () => {
		test("should create payment when none exists", () => {
			const id = Bun.randomUUIDv7();

			const result = paymentDecider.decide(
				{ type: "CreatePayment", id, amount: 100 },
				[],
			);

			expect(result).toEqual([{ type: "PaymentCreated", id, amount: 100 }]);
		});

		test("should throw when payment already exists", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
			];

			expect(() =>
				paymentDecider.decide(
					{ type: "CreatePayment", id, amount: 100 },
					events,
				),
			).toThrow("Payment already exists");
		});
	});

	describe("AuthorisePayment", () => {
		test("should authorise payment when not yet authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
			];

			const result = paymentDecider.decide(
				{ type: "AuthorisePayment", id },
				events,
			);

			expect(result).toEqual([{ type: "PaymentAuthorised", id }]);
		});

		test("should throw when payment already authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
			];

			expect(() =>
				paymentDecider.decide({ type: "AuthorisePayment", id }, events),
			).toThrow("Payment already authorised");
		});
	});

	describe("CapturePayment", () => {
		test("should capture payment when authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
			];

			const result = paymentDecider.decide(
				{ type: "CapturePayment", id },
				events,
			);

			expect(result).toEqual([{ type: "PaymentCaptured", id }]);
		});

		test("should throw when payment not authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
			];

			expect(() =>
				paymentDecider.decide({ type: "CapturePayment", id }, events),
			).toThrow("Payment not authorised");
		});

		test("should throw when no payment exists", () => {
			const id = Bun.randomUUIDv7();

			expect(() =>
				paymentDecider.decide({ type: "CapturePayment", id }, []),
			).toThrow("Payment not authorised");
		});
	});

	describe("RefundPayment", () => {
		test("should refund payment when captured and amount is valid", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
			];

			const result = paymentDecider.decide(
				{ type: "RefundPayment", id, amount: 50 },
				events,
			);

			expect(result).toEqual([{ type: "PaymentRefunded", id, amount: 50 }]);
		});

		test("should refund full amount when captured", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
			];

			const result = paymentDecider.decide(
				{ type: "RefundPayment", id, amount: 100 },
				events,
			);

			expect(result).toEqual([{ type: "PaymentRefunded", id, amount: 100 }]);
		});

		test("should allow multiple partial refunds up to captured amount", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
				{ type: "PaymentRefunded", id, amount: 30 },
				{ type: "PaymentRefunded", id, amount: 20 },
			];

			const result = paymentDecider.decide(
				{ type: "RefundPayment", id, amount: 50 },
				events,
			);

			expect(result).toEqual([{ type: "PaymentRefunded", id, amount: 50 }]);
		});

		test("should throw when payment not captured", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
			];

			expect(() =>
				paymentDecider.decide(
					{ type: "RefundPayment", id, amount: 50 },
					events,
				),
			).toThrow("Payment not captured");
		});

		test("should throw when refund amount exceeds captured amount", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
			];

			expect(() =>
				paymentDecider.decide(
					{ type: "RefundPayment", id, amount: 200 },
					events,
				),
			).toThrow("Payment cannot be refunded for more than captured");
		});

		test("should throw when multiple refunds exceed captured amount", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
				{ type: "PaymentRefunded", id, amount: 60 },
			];

			expect(() =>
				paymentDecider.decide(
					{ type: "RefundPayment", id, amount: 50 },
					events,
				),
			).toThrow("Payment cannot be refunded for more than captured");
		});
	});

	describe("CancelPayment", () => {
		test("should cancel payment", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
			];

			const result = paymentDecider.decide(
				{ type: "CancelPayment", id },
				events,
			);

			expect(result).toEqual([{ type: "PaymentCancelled", id }]);
		});

		test("should throw when payment not created", () => {
			const id = Bun.randomUUIDv7();

			expect(() =>
				paymentDecider.decide({ type: "CancelPayment", id }, []),
			).toThrow("Payment not created");
		});
	});
});
