import { describe, expect, test } from "bun:test";
import type { PaymentEvent } from "./evolve";
import { buildPaymentStatus } from "./projection";

describe("buildPaymentStatus", () => {
	test("returns null when payment not created", () => {
		const summary = buildPaymentStatus("123", []);

		expect(summary).toBeNull();
	});

	test("builds summary for created payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "created",
			refundedAmount: 0,
			remainingRefundableAmount: 100,
		});
	});

	test("builds summary for authorised payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
			{ type: "PaymentAuthorised", id: "123" },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "authorised",
			refundedAmount: 0,
			remainingRefundableAmount: 100,
		});
	});

	test("builds summary for captured payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
			{ type: "PaymentAuthorised", id: "123" },
			{ type: "PaymentCaptured", id: "123" },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "captured",
			refundedAmount: 0,
			remainingRefundableAmount: 100,
		});
	});

	test("builds summary for partially refunded payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
			{ type: "PaymentAuthorised", id: "123" },
			{ type: "PaymentCaptured", id: "123" },
			{ type: "PaymentRefunded", id: "123", amount: 30 },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "captured",
			refundedAmount: 30,
			remainingRefundableAmount: 70,
		});
	});

	test("builds summary for fully refunded payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
			{ type: "PaymentAuthorised", id: "123" },
			{ type: "PaymentCaptured", id: "123" },
			{ type: "PaymentRefunded", id: "123", amount: 100 },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "refunded",
			refundedAmount: 100,
			remainingRefundableAmount: 0,
		});
	});

	test("builds summary for cancelled payment", () => {
		const events: PaymentEvent[] = [
			{ type: "PaymentCreated", id: "123", amount: 100 },
			{ type: "PaymentCancelled", id: "123" },
		];

		const summary = buildPaymentStatus("123", events);

		expect(summary).toEqual({
			id: "123",
			amount: 100,
			status: "cancelled",
			refundedAmount: 0,
			remainingRefundableAmount: 100,
		});
	});
});
