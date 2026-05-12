-- IncuBase: Multi-Tenant Incubation Management Platform
-- Database Schema with Row Level Security (RLS)
-- All tables include tenant_id for strict data isolation

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TENANTS (Organizations / Incubation Centers)
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'foundational' CHECK (plan IN ('foundational', 'professional', 'enterprise')),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USERS (All platform users, scoped to tenant)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'startup' CHECK (role IN ('admin', 'facility_manager', 'reviewer', 'mentor', 'startup')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- 3. PROGRAMS (Incubation Cohorts / Challenges)
-- ============================================================
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  branding JSONB DEFAULT '{}',   -- logo, colors, banner
  start_date DATE,
  end_date DATE,
  application_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'evaluating', 'active', 'closed', 'archived')),
  evaluation_config JSONB DEFAULT '{}',  -- weighted criteria, rounds
  form_schema JSONB DEFAULT '[]',        -- dynamic application form fields
  max_intake INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programs_tenant ON programs(tenant_id);
CREATE INDEX idx_programs_status ON programs(status);

-- ============================================================
-- 4. STARTUPS (Companies registered on the platform)
-- ============================================================
CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),       -- founding user
  company_name TEXT NOT NULL,
  sector TEXT,
  description TEXT,
  stage TEXT DEFAULT 'idea' CHECK (stage IN ('idea', 'mvp', 'growth', 'scale')),
  team_size INTEGER,
  website TEXT,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_startups_tenant ON startups(tenant_id);
CREATE INDEX idx_startups_user ON startups(user_id);

-- ============================================================
-- 5. APPLICATIONS (Startup submissions to programs)
-- ============================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  form_data JSONB DEFAULT '{}',          -- filled form fields
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'waitlisted')),
  current_round INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, program_id)         -- one application per startup per program
);

CREATE INDEX idx_applications_tenant ON applications(tenant_id);
CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- 6. EVALUATION CRITERIA (Weighted scorecard definitions)
-- ============================================================
CREATE TABLE evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,  -- percentage weight
  max_score INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eval_criteria_program ON evaluation_criteria(program_id);

-- ============================================================
-- 7. EVALUATIONS (Reviewer scores per application)
-- ============================================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  round INTEGER DEFAULT 1,
  scores JSONB DEFAULT '{}',       -- { criteria_id: score }
  comments TEXT,
  weighted_total NUMERIC(8,2),
  is_blind BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id, reviewer_id, round)
);

CREATE INDEX idx_evaluations_application ON evaluations(application_id);
CREATE INDEX idx_evaluations_reviewer ON evaluations(reviewer_id);

-- ============================================================
-- 8. SPACES (Physical inventory: seats, cabins, rooms)
-- ============================================================
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('seat', 'cabin', 'meeting_room')),
  floor TEXT,
  building TEXT,
  capacity INTEGER DEFAULT 1,
  amenities JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);
CREATE INDEX idx_spaces_type ON spaces(type);
CREATE INDEX idx_spaces_status ON spaces(status);

-- ============================================================
-- 9. SPACE ALLOCATIONS (Long-term seat/cabin assignments)
-- ============================================================
CREATE TABLE space_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  allocated_by UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allocations_space ON space_allocations(space_id);
CREATE INDEX idx_allocations_startup ON space_allocations(startup_id);

-- ============================================================
-- 10. BOOKINGS (Short-term meeting room reservations)
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_space ON bookings(space_id);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);

-- ============================================================
-- 11. MILESTONES (Startup progress tracking)
-- ============================================================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,  -- nullable: milestones can exist outside programs
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',   -- product, fundraising, team, revenue, compliance, general
  due_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_startup ON milestones(startup_id);

-- ============================================================
-- 12. MENTORSHIP SESSIONS
-- ============================================================
CREATE TABLE mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES users(id),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  duration_minutes INTEGER,
  topic TEXT,    -- singular: topic of the session
  notes TEXT,
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentorship_mentor ON mentorship_sessions(mentor_id);
CREATE INDEX idx_mentorship_startup ON mentorship_sessions(startup_id);

-- ============================================================
-- 13. AUDIT LOGS (Immutable action trail)
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,             -- 'create', 'update', 'delete', 'login', etc.
  entity_type TEXT NOT NULL,        -- 'application', 'evaluation', 'space', etc.
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}',      -- additional context (e.g., AI model used, change summary)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- ============================================================
-- 14. AI SUMMARIES (AI-generated application insights)
-- ============================================================
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('summarizer', 'prescreener', 'mentor_matcher', 'facility_predictor', 'progress_insights')),
  summary TEXT,
  structured_data JSONB DEFAULT '{}',
  confidence NUMERIC(4,2),
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_summaries_app ON ai_summaries(application_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply tenant isolation policy to all tables
-- Users
CREATE POLICY tenant_isolation ON users
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Programs
CREATE POLICY tenant_isolation ON programs
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Startups
CREATE POLICY tenant_isolation ON startups
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Applications
CREATE POLICY tenant_isolation ON applications
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Evaluation Criteria
CREATE POLICY tenant_isolation ON evaluation_criteria
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Evaluations
CREATE POLICY tenant_isolation ON evaluations
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Spaces
CREATE POLICY tenant_isolation ON spaces
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Space Allocations
CREATE POLICY tenant_isolation ON space_allocations
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Bookings
CREATE POLICY tenant_isolation ON bookings
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Milestones
CREATE POLICY tenant_isolation ON milestones
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Mentorship Sessions
CREATE POLICY tenant_isolation ON mentorship_sessions
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Audit Logs (read-only for users, insert via service role)
CREATE POLICY tenant_isolation ON audit_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- AI Summaries
CREATE POLICY tenant_isolation ON ai_summaries
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON startups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
