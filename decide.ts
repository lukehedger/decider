export type Decider<Command, Event> = {
	decide: (command: Command, events: Event[]) => Event[];
};

export type PaymentCommand =
	| { type: "CreatePayment"; id: string; amount: number }
	| { type: "AuthorisePayment"; id: string }
	| { type: "CapturePayment"; id: string }
	| { type: "RefundPayment"; id: string; amount: number }
	| { type: "CancelPayment"; id: string };

export type PaymentEvent =
	| { type: "PaymentCreated"; id: string; amount: number }
	| { type: "PaymentAuthorised"; id: string }
	| { type: "PaymentCaptured"; id: string }
	| { type: "PaymentRefunded"; id: string; amount: number }
	| { type: "PaymentCancelled"; id: string };

const decideCreatePayment = (
	command: Extract<PaymentCommand, { type: "CreatePayment" }>,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const createdEvent = events.find(
		(event): event is Extract<PaymentEvent, { type: "PaymentCreated" }> =>
			event.id === command.id && event.type === "PaymentCreated",
	);

	const state = {
		created: {
			amount: createdEvent?.amount ?? 0,
			created: createdEvent !== undefined,
		},
	};

	if (state.created.created) {
		throw new Error("Payment already exists");
	}

	return [{ type: "PaymentCreated", id: command.id, amount: command.amount }];
};

const decideAuthorisePayment = (
	command: Extract<PaymentCommand, { type: "AuthorisePayment" }>,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const createdEvent = events.find(
		(event): event is Extract<PaymentEvent, { type: "PaymentCreated" }> =>
			event.id === command.id && event.type === "PaymentCreated",
	);

	const state = {
		created: {
			amount: createdEvent?.amount ?? 0,
			created: createdEvent !== undefined,
		},
		cancelled: {
			cancelled: events.some(
				(event) => event.id === command.id && event.type === "PaymentCancelled",
			),
		},
		authorised: {
			authorised: events.some(
				(event) =>
					event.id === command.id && event.type === "PaymentAuthorised",
			),
		},
	};

	if (!state.created.created) {
		throw new Error("Payment not created");
	}
	if (state.cancelled.cancelled) {
		throw new Error("Payment cancelled");
	}
	if (state.authorised.authorised) {
		throw new Error("Payment already authorised");
	}

	return [{ type: "PaymentAuthorised", id: command.id }];
};

const decideCapturePayment = (
	command: Extract<PaymentCommand, { type: "CapturePayment" }>,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const state = {
		authorised: {
			authorised: events.some(
				(event) =>
					event.id === command.id && event.type === "PaymentAuthorised",
			),
		},
		cancelled: {
			cancelled: events.some(
				(event) => event.id === command.id && event.type === "PaymentCancelled",
			),
		},
		captured: {
			captured: events.some(
				(event) => event.id === command.id && event.type === "PaymentCaptured",
			),
		},
	};

	if (!state.authorised.authorised) {
		throw new Error("Payment not authorised");
	}
	if (state.cancelled.cancelled) {
		throw new Error("Payment cancelled");
	}
	if (state.captured.captured) {
		throw new Error("Payment already captured");
	}

	return [{ type: "PaymentCaptured", id: command.id }];
};

const decideRefundPayment = (
	command: Extract<PaymentCommand, { type: "RefundPayment" }>,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const createdEvent = events.find(
		(event): event is Extract<PaymentEvent, { type: "PaymentCreated" }> =>
			event.id === command.id && event.type === "PaymentCreated",
	);

	const totalRefundedAmount = events.reduce((total, event) => {
		if (event.id === command.id && event.type === "PaymentRefunded") {
			return total + event.amount;
		}
		return total;
	}, 0);

	const createdAmount = createdEvent?.amount ?? 0;

	const state = {
		created: {
			amount: createdAmount,
			created: createdEvent !== undefined,
		},
		captured: {
			captured: events.some(
				(event) => event.id === command.id && event.type === "PaymentCaptured",
			),
		},
		cancelled: {
			cancelled: events.some(
				(event) => event.id === command.id && event.type === "PaymentCancelled",
			),
		},
		refunded: {
			amount: totalRefundedAmount,
			refunded: totalRefundedAmount === createdAmount && createdAmount > 0,
		},
	};

	if (!state.created.created) {
		throw new Error("Payment not created");
	}
	if (!state.captured.captured) {
		throw new Error("Payment not captured");
	}
	if (state.cancelled.cancelled) {
		throw new Error("Payment cancelled");
	}
	if (command.amount > state.created.amount - state.refunded.amount) {
		throw new Error("Payment cannot be refunded for more than captured");
	}

	return [{ type: "PaymentRefunded", id: command.id, amount: command.amount }];
};

const decideCancelPayment = (
	command: Extract<PaymentCommand, { type: "CancelPayment" }>,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const createdEvent = events.find(
		(event): event is Extract<PaymentEvent, { type: "PaymentCreated" }> =>
			event.id === command.id && event.type === "PaymentCreated",
	);

	const totalRefundedAmount = events.reduce((total, event) => {
		if (event.id === command.id && event.type === "PaymentRefunded") {
			return total + event.amount;
		}
		return total;
	}, 0);

	const createdAmount = createdEvent?.amount ?? 0;

	const state = {
		created: {
			amount: createdAmount,
			created: createdEvent !== undefined,
		},
		cancelled: {
			cancelled: events.some(
				(event) => event.id === command.id && event.type === "PaymentCancelled",
			),
		},
		captured: {
			captured: events.some(
				(event) => event.id === command.id && event.type === "PaymentCaptured",
			),
		},
		refunded: {
			amount: totalRefundedAmount,
			refunded: totalRefundedAmount === createdAmount && createdAmount > 0,
		},
	};

	if (!state.created.created) {
		throw new Error("Payment not created");
	}
	if (state.cancelled.cancelled) {
		throw new Error("Payment already cancelled");
	}
	if (state.captured.captured) {
		throw new Error("Payment already captured");
	}
	if (state.refunded.amount > 0) {
		throw new Error("Payment already refunded");
	}

	return [{ type: "PaymentCancelled", id: command.id }];
};

export const paymentDecider: Decider<PaymentCommand, PaymentEvent> = {
	decide: (command, events) => {
		switch (command.type) {
			case "CreatePayment":
				return decideCreatePayment(command, events);
			case "AuthorisePayment":
				return decideAuthorisePayment(command, events);
			case "CapturePayment":
				return decideCapturePayment(command, events);
			case "RefundPayment":
				return decideRefundPayment(command, events);
			case "CancelPayment":
				return decideCancelPayment(command, events);
		}
	},
};
