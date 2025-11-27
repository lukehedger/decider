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

export const paymentDecider: Decider<PaymentCommand, PaymentEvent> = {
	decide: (command, events) => {
		switch (command.type) {
			case "CreatePayment":
				if (
					events.some(
						(event) =>
							event.id === command.id && event.type === "PaymentCreated",
					)
				) {
					throw new Error("Payment already exists");
				}
				return [
					{ type: "PaymentCreated", id: command.id, amount: command.amount },
				];
			case "AuthorisePayment":
				if (
					events.some(
						(event) =>
							event.id === command.id && event.type === "PaymentAuthorised",
					)
				) {
					throw new Error("Payment already authorised");
				}
				return [{ type: "PaymentAuthorised", id: command.id }];
			case "CapturePayment":
				if (
					!events.some(
						(event) =>
							event.id === command.id && event.type === "PaymentAuthorised",
					)
				) {
					throw new Error("Payment not authorised");
				}
				return [{ type: "PaymentCaptured", id: command.id }];
			case "RefundPayment":
				if (
					!events.some(
						(event) =>
							event.id === command.id && event.type === "PaymentCaptured",
					)
				) {
					throw new Error("Payment not captured");
				}
				if (
					events.reduce((total, event) => {
						if (event.id === command.id && event.type === "PaymentRefunded") {
							total += event.amount;
						}
						return total;
					}, 0) < command.amount
				) {
					throw new Error("Payment cannot be refunded for more than captured");
				}
				return [
					{ type: "PaymentRefunded", id: command.id, amount: command.amount },
				];
			case "CancelPayment":
				return [{ type: "PaymentCancelled", id: command.id }];
		}
	},
};

console.log(
	paymentDecider.decide(
		// { type: "CreatePayment", id: Bun.randomUUIDv7(), amount: 100 },
		// { type: "AuthorisePayment", id: Bun.randomUUIDv7(), amount: 100 },
		// { type: "CapturePayment", id: Bun.randomUUIDv7(), amount: 100 },
		// { type: "CancelPayment", id: Bun.randomUUIDv7(), amount: 100 },
		// { type: "RefundPayment", id: Bun.randomUUIDv7(), amount: 200 },
		{ type: "RefundPayment", id: "123", amount: 200 },
		[{ type: "PaymentCaptured", id: "123" }],
	),
);
