-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- USERS (ROOT ENTITY)
-- =========================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  clerk_user_id TEXT NOT NULL UNIQUE,

  email TEXT NOT NULL,
  name TEXT,

  subscription_status TEXT NOT NULL CHECK (
    subscription_status IN ('inactive', 'active', 'canceled')
  ) DEFAULT 'inactive',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- LINKEDIN ACCOUNTS (ONE PER USER)
-- =========================================================
CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE
    REFERENCES users(id) ON DELETE CASCADE,

  session_cookies JSONB NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('active', 'cooldown', 'error')
  ) DEFAULT 'active',

  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- CAMPAIGNS
-- =========================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  linkedin_account_id UUID NOT NULL
    REFERENCES linkedin_accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,

  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_user_id
  ON campaigns(user_id);

-- =========================================================
-- LEADS (SCOPED PER USER)
-- =========================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  campaign_id UUID NOT NULL
    REFERENCES campaigns(id) ON DELETE CASCADE,

  linkedin_url TEXT NOT NULL,
  linkedin_url_normalized TEXT NOT NULL,

  full_name TEXT,
  company TEXT,
  title TEXT,

  lead_score INTEGER,

  intent TEXT CHECK (
    intent IN ('interested', 'neutral', 'not_interested', 'unknown')
  ) DEFAULT 'unknown',

  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One lead per LinkedIn URL per user
CREATE UNIQUE INDEX uniq_user_lead
  ON leads(user_id, linkedin_url_normalized)
  WHERE archived_at IS NULL;

CREATE INDEX idx_leads_campaign_id
  ON leads(campaign_id);

-- =========================================================
-- AI MESSAGE GENERATIONS
-- =========================================================
CREATE TABLE ai_message_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  campaign_id UUID NOT NULL
    REFERENCES campaigns(id) ON DELETE CASCADE,

  lead_id UUID NOT NULL
    REFERENCES leads(id) ON DELETE CASCADE,

  pain_points JSONB,

  generated_message TEXT NOT NULL,

  lead_score INTEGER,

  intent TEXT CHECK (
    intent IN ('interested', 'neutral', 'not_interested', 'unknown')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_gen_lead_id
  ON ai_message_generations(lead_id);

-- =========================================================
-- SENT MESSAGES
-- =========================================================
CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  linkedin_account_id UUID NOT NULL
    REFERENCES linkedin_accounts(id) ON DELETE CASCADE,

  lead_id UUID NOT NULL
    REFERENCES leads(id) ON DELETE CASCADE,

  ai_generation_id UUID
    REFERENCES ai_message_generations(id),

  final_message TEXT NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('pending', 'sent', 'failed')
  ),

  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sent_messages_lead_id
  ON sent_messages(lead_id);

-- =========================================================
-- RATE LIMIT TRACKING (PER LINKEDIN ACCOUNT)
-- =========================================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  linkedin_account_id UUID NOT NULL
    REFERENCES linkedin_accounts(id) ON DELETE CASCADE,

  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  actions_count INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_account_id
  ON rate_limits(linkedin_account_id);

-- =========================================================
-- ACTION LOGS (TTL-CLEANED)
-- =========================================================
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  linkedin_account_id UUID
    REFERENCES linkedin_accounts(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_action_logs_created_at
  ON action_logs(created_at);

