# Ghar HomeCook

A working first version based on the supplied Tiffin Platform Project Overview, with a green-and-white theme and persistent dark mode.

## Run locally

Requires Node.js 22.18 or newer and npm.

```sh
npm install
npm run dev
```

Open the loopback URL printed by the preview server. The local preview uses a test account and SQLite. To serve an existing build directly:

```sh
node scripts/preview.mjs
```

Run the account and meal-plan tests with `npm test`.

## Sign-in and profiles

On the private hosted site, open `/login/` and choose **Continue with ChatGPT**. After sign-in, choose Customer or Master Chefs. Ghar opens the corresponding editable profile. The sidebar and avatar reopen it at any time.

Customer profiles store a name, delivery locality, dietary preference and preferred meals. Master Chefs profiles store a chef name, kitchen name, signature cuisine, service areas and kitchen introduction. A single account may maintain both profiles. The server identifies the account from the hosted sign-in session and saves each role separately in D1. Profile updates check the saved revision to protect concurrent edits.

## Try the demo

- Customer: search and filter kitchens, save favourites, view supply dates and daily meal photos, subscribe with meal timing and delivery slots, skip a meal, pause a date range, track orders and rate delivered meals.
- In **Master Chefs → Restaurant menus**, use **Create menu** for any restaurant or **Add menu** in an existing restaurant. Each named menu has its own dishes, photos, delivery days and prices. **Delete** removes that menu from customer browsing. Previously published menus appear as **House menu** until renamed.
- Master Chefs: publish a full weekly menu or select recurring weekdays and calendar dates, add daily photos, and set base prices, plan discounts and delivery areas; select daily orders and move them from Preparing to Out for delivery to Delivered. Outstanding past orders remain available until completed.
- Use the integrated Customer / Master Chefs dropdown in the header. Click anywhere on its button or the downward chevron; keyboard arrows, Escape and outside clicks are supported. The sun/moon button switches themes and remembers the choice.

Chef-published menus appear alongside sample kitchens. Orders and reviews use sample data. Delivery coverage is seeded for Bengaluru. Times use Asia/Kolkata. Profile details belong to the signed-in account.

## Subscription rules implemented

- Daily, 7-day and 30-day plans. Chefs can change the default weekly (5%) and monthly (10%) discounts. Plans count supply days. A date-specific dish takes priority over the recurring weekday.
- Lunch, dinner or both. Every meal type retains its own entitlement count.
- Skip at least 2 hours before a slot. Dispatched and delivered meals cannot be skipped. Each skipped meal extends the corresponding meal schedule once. Credit counts are an informational history of preserved meals, not a second redeemable wallet balance.
- Pauses begin tomorrow or later, include both selected dates, and last up to 90 days. Overlapping, reversed and invalid ranges are rejected. Resume is derived from the date range; all meal counts are retained.
- Historical seeded meals default to delivered. Explicitly saved delivery states are retained, and unfinished past orders remain in the cook queue.

## Meal demo data

Published menus are shared across signed-in accounts using D1 and dish photos are stored in the Sites BUCKET. Meal plans and delivery updates are stored per account in the current browser. Returning users can import their previous browser demo data on the role-choice screen. Orders and payments are simulated. The local preview account exists only in the loopback server and is excluded from the hosted Worker.

## Structure

- `app/`: Next.js App Router and responsive design tokens.
- `components/`: shell, customer flows, chef operations, shared dialogs.
- `lib/domain.mjs`: scheduling, pricing, skips, pauses, filtering, order transitions.
- `lib/data.mjs`: fictional seed data.
- `lib/store.jsx`: browser persistence.
- `tests/domain.test.mjs`: meaningful domain regression tests.

The build packages the Next.js frontend and the authenticated API into a Sites Worker. The schema migration is in `drizzle/`. Sites supplies the trusted identity headers and the `DB` binding. Use the managed Sites dispatch for hosted deployments, since the API trusts that identity boundary.

Meal images: Unsplash image IDs `photo-1546833999-b9f581a1996d`, `photo-1631452180519-c014fe946bc7`, and `photo-1512621776951-a57141f2eefd`.
