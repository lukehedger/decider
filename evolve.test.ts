import { describe, expect, test } from "bun:test";
import { processCommand, type PaymentEvent } from "./evolve";

describe("paymentDecider", () => {
	describe("CreatePayment", () => {
		test("should create payment when none exists", () => {
			const id = Bun.randomUUIDv7();

			const result = processCommand(
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
				processCommand(
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

			const result = processCommand(
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
				processCommand({ type: "AuthorisePayment", id }, events),
			).toThrow("Payment already authorised");
		});

		test("should throw when payment not created", () => {
			const id = Bun.randomUUIDv7();

			expect(() =>
				processCommand({ type: "AuthorisePayment", id }, []),
			).toThrow("Payment not created");
		});

		test("should throw when payment cancelled", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentCancelled", id },
			];

			expect(() =>
				processCommand({ type: "AuthorisePayment", id }, events),
			).toThrow("Payment cancelled");
		});
	});

	describe("CapturePayment", () => {
		test("should capture payment when authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
			];

			const result = processCommand(
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
				processCommand({ type: "CapturePayment", id }, events),
			).toThrow("Payment not authorised");
		});

		test("should throw when no payment exists", () => {
			const id = Bun.randomUUIDv7();

			expect(() =>
				processCommand({ type: "CapturePayment", id }, []),
			).toThrow("Payment not authorised");
		});

		test("should throw when payment cancelled", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCancelled", id },
			];

			expect(() =>
				processCommand({ type: "CapturePayment", id }, events),
			).toThrow("Payment cancelled");
		});

		test("should throw when payment already captured", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
			];

			expect(() =>
				processCommand({ type: "CapturePayment", id }, events),
			).toThrow("Payment already captured");
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

			const result = processCommand(
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

			const result = processCommand(
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

			const result = processCommand(
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
				processCommand(
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
				processCommand(
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
				processCommand(
					{ type: "RefundPayment", id, amount: 50 },
					events,
				),
			).toThrow("Payment cannot be refunded for more than captured");
		});

		test("should throw when payment cancelled", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
				{ type: "PaymentCancelled", id },
			];

			expect(() =>
				processCommand(
					{ type: "RefundPayment", id, amount: 50 },
					events,
				),
			).toThrow("Payment cancelled");
		});
	});

	describe("CancelPayment", () => {
		test("should cancel payment", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
			];

			const result = processCommand(
				{ type: "CancelPayment", id },
				events,
			);

			expect(result).toEqual([{ type: "PaymentCancelled", id }]);
		});

		test("should throw when payment not created", () => {
			const id = Bun.randomUUIDv7();

			expect(() =>
				processCommand({ type: "CancelPayment", id }, []),
			).toThrow("Payment not created");
		});

		test("should throw when payment already cancelled", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentCancelled", id },
			];

			expect(() =>
				processCommand({ type: "CancelPayment", id }, events),
			).toThrow("Payment already cancelled");
		});

		test("should throw when payment already captured", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
				{ type: "PaymentCaptured", id },
			];

			expect(() =>
				processCommand({ type: "CancelPayment", id }, events),
			).toThrow("Payment already captured");
		});

		test("should cancel payment when only authorised", () => {
			const id = Bun.randomUUIDv7();
			const events: PaymentEvent[] = [
				{ type: "PaymentCreated", id, amount: 100 },
				{ type: "PaymentAuthorised", id },
			];

			const result = processCommand(
				{ type: "CancelPayment", id },
				events,
			);

			expect(result).toEqual([{ type: "PaymentCancelled", id }]);
		});
	});
});
