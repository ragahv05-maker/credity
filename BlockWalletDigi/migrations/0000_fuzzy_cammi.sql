CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"platform_api_key" text,
	"endpoint" text NOT NULL,
	"month" varchar(7) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"claimant_user_id" integer NOT NULL,
	"platform_id" varchar(255),
	"claim_type" varchar(50),
	"claim_amount" numeric(12, 2),
	"description" text,
	"timeline" jsonb,
	"evidence_ids" jsonb,
	"identity_score" integer,
	"integrity_score" integer,
	"authenticity_score" integer,
	"trust_score" integer,
	"recommendation" varchar(20),
	"red_flags" jsonb,
	"ai_analysis" jsonb,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" jsonb NOT NULL,
	"issuer" text NOT NULL,
	"issuance_date" timestamp NOT NULL,
	"data" jsonb NOT NULL,
	"jwt" text,
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "device_fingerprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	CONSTRAINT "device_fingerprints_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"claim_id" integer,
	"media_type" varchar(20),
	"storage_url" text,
	"authenticity_score" integer,
	"is_ai_generated" boolean,
	"manipulation_detected" boolean,
	"metadata" jsonb,
	"blockchain_hash" varchar(66),
	"analysis_data" jsonb,
	"uploaded_at" timestamp DEFAULT now(),
	"analyzed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"identifier" text NOT NULL,
	"code" text NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform_id" varchar(100) NOT NULL,
	"platform_name" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"oauth_access_token" text,
	"oauth_refresh_token" text,
	"scopes" text,
	"connected_at" timestamp,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"razorpay_subscription_id" text,
	"razorpay_customer_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_razorpay_subscription_id_unique" UNIQUE("razorpay_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"did" text,
	"name" text,
	"email" text,
	"bio" text,
	"avatar_url" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
