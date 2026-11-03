CREATE TABLE stitch_subscriptions (
 user_id TEXT PRIMARY KEY NOT NULL,
 reference TEXT UNIQUE NOT NULL,
 subscription_id TEXT UNIQUE,
 checkout_url TEXT,
 cycle TEXT NOT NULL,
 amount INTEGER NOT NULL,
 mode TEXT NOT NULL,
 state TEXT NOT NULL,
 created_at TEXT NOT NULL,
 paid_through TEXT,
 cancelled_at TEXT
);
--> statement-breakpoint
CREATE TABLE stitch_payments (
 payment_id TEXT PRIMARY KEY NOT NULL,
 message_id TEXT UNIQUE NOT NULL,
 subscription_id TEXT NOT NULL,
 amount INTEGER NOT NULL,
 paid_at TEXT NOT NULL,
 paid_through TEXT NOT NULL
);
