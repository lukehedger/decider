import { hydrate, type PaymentEvent } from "./evolve";

export type PaymentStatus = {
	id: string;
	amount: number;
	status: "created" | "authorised" | "captured" | "refunded" | "cancelled";
	refundedAmount: number;
	remainingRefundableAmount: number;
};

export const buildPaymentStatus = (
	id: string,
	events: PaymentEvent[],
): PaymentStatus | null => {
	const state = hydrate(events);

	if (!state.created.created) {
		return null;
	}

	let status: PaymentStatus["status"];

	if (state.cancelled.cancelled) {
		status = "cancelled";
	} else if (state.refunded.refunded) {
		status = "refunded";
	} else if (state.captured.captured) {
		status = "captured";
	} else if (state.authorised.authorised) {
		status = "authorised";
	} else {
		status = "created";
	}

	return {
		id,
		amount: state.created.amount,
		status,
		refundedAmount: state.refunded.amount,
		remainingRefundableAmount: state.created.amount - state.refunded.amount,
	};
};
