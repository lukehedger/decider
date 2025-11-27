export type Decider<Command, Event, State> = {
	initialState: State;
	evolve: (state: State, event: Event) => State;
	decide: (command: Command, state: State) => Event[];
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

export type PaymentState = {
	created: {
		amount: number;
		created: boolean;
	};
	cancelled: {
		cancelled: boolean;
	};
	authorised: {
		authorised: boolean;
	};
	captured: {
		captured: boolean;
	};
	refunded: {
		amount: number;
		refunded: boolean;
	};
};

const initialState: PaymentState = {
	created: {
		amount: 0,
		created: false,
	},
	cancelled: {
		cancelled: false,
	},
	authorised: {
		authorised: false,
	},
	captured: {
		captured: false,
	},
	refunded: {
		amount: 0,
		refunded: false,
	},
};

const evolve = (state: PaymentState, event: PaymentEvent): PaymentState => {
	switch (event.type) {
		case "PaymentCreated":
			return {
				...state,
				created: {
					amount: event.amount,
					created: true,
				},
			};
		case "PaymentAuthorised":
			return {
				...state,
				authorised: {
					authorised: true,
				},
			};
		case "PaymentCaptured":
			return {
				...state,
				captured: {
					captured: true,
				},
			};
		case "PaymentRefunded": {
			const newRefundedAmount = state.refunded.amount + event.amount;
			return {
				...state,
				refunded: {
					amount: newRefundedAmount,
					refunded:
						newRefundedAmount === state.created.amount &&
						state.created.amount > 0,
				},
			};
		}
		case "PaymentCancelled":
			return {
				...state,
				cancelled: {
					cancelled: true,
				},
			};
	}
};

const decideCreatePayment = (
	command: Extract<PaymentCommand, { type: "CreatePayment" }>,
	state: PaymentState,
): PaymentEvent[] => {
	if (state.created.created) {
		throw new Error("Payment already exists");
	}

	return [{ type: "PaymentCreated", id: command.id, amount: command.amount }];
};

const decideAuthorisePayment = (
	command: Extract<PaymentCommand, { type: "AuthorisePayment" }>,
	state: PaymentState,
): PaymentEvent[] => {
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
	state: PaymentState,
): PaymentEvent[] => {
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
	state: PaymentState,
): PaymentEvent[] => {
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
	state: PaymentState,
): PaymentEvent[] => {
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

const decide = (
	command: PaymentCommand,
	state: PaymentState,
): PaymentEvent[] => {
	switch (command.type) {
		case "CreatePayment":
			return decideCreatePayment(command, state);
		case "AuthorisePayment":
			return decideAuthorisePayment(command, state);
		case "CapturePayment":
			return decideCapturePayment(command, state);
		case "RefundPayment":
			return decideRefundPayment(command, state);
		case "CancelPayment":
			return decideCancelPayment(command, state);
	}
};

export const paymentDecider: Decider<
	PaymentCommand,
	PaymentEvent,
	PaymentState
> = {
	initialState,
	evolve,
	decide,
};

export const hydrate = (events: PaymentEvent[]): PaymentState => {
	return events.reduce(paymentDecider.evolve, paymentDecider.initialState);
};

export const processCommand = (
	command: PaymentCommand,
	events: PaymentEvent[],
): PaymentEvent[] => {
	const state = hydrate(events);
	return paymentDecider.decide(command, state);
};
