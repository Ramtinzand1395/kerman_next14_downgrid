# Unified game-install service and courier payment workflow

Branch: `feature/unified-installation-workflow` (do not merge into main before QA).

## Admin workflow

1. The customer submits an appointment and game selection.
2. The admin confirms it and records the initial amount for courier requests.
3. The courier is dispatched and picks up the device. A return dispatch is available after service completion.
4. When game installation is finished, the admin enters the final service amount. This action completes the service and calls the server-side Zarinpal payment-link endpoint.
5. The endpoint locks the finalized server amount, creates or reuses one payment authority, sends an in-app user notification, and attempts the optional templated SMS. The payment link is also copied for manual sharing (subject to clipboard permissions).
6. Customer payment is verified against Zarinpal; the payment reference is recorded in the appointment and exposed to both dashboards. After service completion the courier may return the device.

The old courier tab is removed from the UI, but existing courier statuses and stored orders are preserved.

## Important

- Zarinpal requires `ZARINPAL_MERCHANT_ID` in the server environment.
- To send payment URLs by SMS, configure a Melipayamak pattern that accepts **tracking code** and **payment URL** parameters, then set `APPOINTMENT_SMS_PAYMENT_LINK_BODY_ID` to that pattern ID. If absent, in-app notifications still run and the admin can copy/share the payment link, but an SMS is **not** sent.
- Never trust a client-provided amount. The appointment's saved final amount is the payment source of truth, converted to rials for Zarinpal.
- A successful callback needs server-side verification and must be idempotent.
- A finalized, pending or paid payment cannot have its amount silently changed.

## QA before merging

- Run lint, type-check, tests and production build in a full checked-out repo.
- Exercise in-store and courier orders, including old `at_store` and `scheduled` courier statuses.
- Verify notifications and SMS when the template is configured, and explicitly check the unconfigured SMS state.
- Test repeated clicks, cancelled payments, duplicate callbacks, and successful verification and refId persistence.
- Test the dashboard on mobile and verify users cannot access admin payment endpoints.
- Do not deploy until these checks pass.
