-- EcoSort Database Schema
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  city TEXT,
  bio TEXT,
  environmental_interests TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
  total_points INTEGER NOT NULL DEFAULT 0,
  completed_drives INTEGER NOT NULL DEFAULT 0,
  waste_scans_count INTEGER NOT NULL DEFAULT 0,
  groups_joined INTEGER NOT NULL DEFAULT 0,
  daily_scan_count INTEGER NOT NULL DEFAULT 0,
  last_scan_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- GROUPS
-- ============================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_members INTEGER DEFAULT 50,
  is_public BOOLEAN DEFAULT true,
  environmental_goals TEXT[] DEFAULT '{}',
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_organizer ON public.groups(organizer_id);
CREATE INDEX idx_groups_location ON public.groups(latitude, longitude);

-- ============================================
-- GROUP MEMBERS
-- ============================================
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'organizer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);

-- ============================================
-- GROUP JOIN REQUESTS
-- ============================================
CREATE TABLE public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================
-- GROUP MESSAGES
-- ============================================
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_announcement BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group ON public.group_messages(group_id);

-- ============================================
-- CLEANING EVENTS
-- ============================================
CREATE TABLE public.cleaning_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  meeting_point TEXT,
  max_participants INTEGER DEFAULT 30,
  cleaning_type TEXT,
  required_equipment TEXT[] DEFAULT '{}',
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled', 'verified')),
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON public.cleaning_events(organizer_id);
CREATE INDEX idx_events_group ON public.cleaning_events(group_id);
CREATE INDEX idx_events_date ON public.cleaning_events(event_date);
CREATE INDEX idx_events_location ON public.cleaning_events(latitude, longitude);

-- ============================================
-- EVENT REGISTRATIONS
-- ============================================
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.cleaning_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended', 'no_show')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_registrations_user ON public.event_registrations(user_id);

-- ============================================
-- EVENT ATTENDANCE
-- ============================================
CREATE TABLE public.event_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.cleaning_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  marked_by UUID NOT NULL REFERENCES public.profiles(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================
-- CLEANUP EVIDENCE
-- ============================================
CREATE TABLE public.cleanup_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.cleaning_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  before_image_url TEXT,
  after_image_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_event ON public.cleanup_evidence(event_id);

-- ============================================
-- WASTE SCANS
-- ============================================
CREATE TABLE public.waste_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  waste_name TEXT NOT NULL,
  waste_category TEXT NOT NULL,
  recommended_bin TEXT,
  bin_color TEXT,
  recyclable BOOLEAN,
  disposal_instructions TEXT,
  environmental_impact TEXT,
  confidence_score DOUBLE PRECISION,
  needs_verification BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scans_user ON public.waste_scans(user_id);

-- ============================================
-- POINT TRANSACTIONS
-- ============================================
CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'scan', 'drive_complete', 'drive_participate', 'drive_organize',
    'evidence_upload', 'learning', 'quiz', 'redemption', 'admin_adjustment'
  )),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON public.point_transactions(user_id);
CREATE INDEX idx_transactions_ref ON public.point_transactions(reference_id);

-- ============================================
-- REWARDS
-- ============================================
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REWARD REDEMPTIONS
-- ============================================
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  badge_color TEXT DEFAULT '#22c55e',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USER ACHIEVEMENTS
-- ============================================
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- ============================================
-- LEARNING CONTENT
-- ============================================
CREATE TABLE public.learning_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN ('article', 'video', 'quiz', 'guide')),
  image_url TEXT,
  video_url TEXT,
  difficulty TEXT DEFAULT 'beginner',
  points_reward INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- QUIZ ATTEMPTS
-- ============================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.learning_content(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('user', 'group', 'event', 'message')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POINT CONFIG (admin-configurable)
-- ============================================
CREATE TABLE public.point_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  daily_limit INTEGER,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default point configuration
INSERT INTO public.point_config (action_type, points, daily_limit, description) VALUES
  ('scan', 5, 10, 'Points per waste scan'),
  ('drive_complete', 100, NULL, 'Points for completing a verified cleaning drive'),
  ('drive_participate', 50, NULL, 'Points for participating in a group cleanup'),
  ('drive_organize', 150, NULL, 'Points for organizing a successful event'),
  ('evidence_upload', 30, NULL, 'Points for uploading verified before/after evidence'),
  ('learning', 10, 5, 'Points for completing a learning activity'),
  ('quiz', 15, 5, 'Points for passing a quiz');

-- ============================================
-- CHALLENGES (daily/weekly)
-- ============================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'daily' CHECK (challenge_type IN ('daily', 'weekly')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER NOT NULL DEFAULT 20,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.challenge_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.cleaning_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups policies
CREATE POLICY "Public groups are viewable" ON public.groups
  FOR SELECT USING (is_public = true OR organizer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their groups" ON public.groups
  FOR UPDATE USING (organizer_id = auth.uid());
CREATE POLICY "Organizers can delete their groups" ON public.groups
  FOR DELETE USING (organizer_id = auth.uid());

-- Group members policies
CREATE POLICY "Group members visible to members" ON public.group_members
  FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND organizer_id = auth.uid()));

-- Group join requests policies
CREATE POLICY "Users can view own requests" ON public.group_join_requests
  FOR SELECT USING (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND organizer_id = auth.uid()));
CREATE POLICY "Users can create requests" ON public.group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Organizers can update requests" ON public.group_join_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND organizer_id = auth.uid()));

-- Group messages policies
CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));
CREATE POLICY "Members can send messages" ON public.group_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- Cleaning events policies
CREATE POLICY "Events are viewable" ON public.cleaning_events
  FOR SELECT USING (true);
CREATE POLICY "Organizers can create events" ON public.cleaning_events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update events" ON public.cleaning_events
  FOR UPDATE USING (organizer_id = auth.uid());

-- Event registrations policies
CREATE POLICY "Registrations viewable by participants" ON public.event_registrations
  FOR SELECT USING (true);
CREATE POLICY "Users can register" ON public.event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own registration" ON public.event_registrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Event attendance policies
CREATE POLICY "Attendance viewable" ON public.event_attendance
  FOR SELECT USING (true);
CREATE POLICY "Organizers can mark attendance" ON public.event_attendance
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.cleaning_events WHERE id = event_id AND organizer_id = auth.uid()));

-- Cleanup evidence policies
CREATE POLICY "Evidence viewable by participants" ON public.cleanup_evidence
  FOR SELECT USING (true);
CREATE POLICY "Users can submit evidence" ON public.cleanup_evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update evidence" ON public.cleanup_evidence
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'organizer')));

-- Waste scans policies
CREATE POLICY "Users can view own scans" ON public.waste_scans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create scans" ON public.waste_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Point transactions policies
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);
-- Only server-side can insert transactions (via service role)

-- Rewards policies
CREATE POLICY "Anyone can view rewards" ON public.rewards
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON public.rewards
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reward redemptions policies
CREATE POLICY "Users can view own redemptions" ON public.reward_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create redemptions" ON public.reward_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Anyone can view user achievements" ON public.user_achievements
  FOR SELECT USING (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Learning content policies
CREATE POLICY "Anyone can view published content" ON public.learning_content
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage content" ON public.learning_content
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Quiz attempts policies
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Point config policies
CREATE POLICY "Anyone can view config" ON public.point_config
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage config" ON public.point_config
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Challenges policies
CREATE POLICY "Anyone can view active challenges" ON public.challenges
  FOR SELECT USING (is_active = true);

-- Challenge completions policies
CREATE POLICY "Users can view own completions" ON public.challenge_completions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Default achievements
-- ============================================
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points_reward) VALUES
  ('First Scan', 'Complete your first waste scan', '🔍', 'scans', 1, 10),
  ('Scanner Pro', 'Complete 50 waste scans', '📸', 'scans', 50, 50),
  ('Clean Starter', 'Participate in your first cleanup drive', '🌱', 'drives', 1, 20),
  ('Eco Warrior', 'Participate in 10 cleanup drives', '⚔️', 'drives', 10, 100),
  ('Community Builder', 'Create your first cleaning group', '👥', 'groups_created', 1, 30),
  ('Team Player', 'Join 5 different groups', '🤝', 'groups_joined', 5, 50),
  ('Event Organizer', 'Organize 5 cleaning events', '📋', 'events_organized', 5, 100),
  ('Knowledge Seeker', 'Complete 10 learning activities', '📚', 'learning', 10, 50),
  ('Quiz Master', 'Pass 20 quizzes', '🎓', 'quizzes', 20, 75),
  ('Eco Champion', 'Earn 1000 total points', '🏆', 'points', 1000, 100),
  ('Green Legend', 'Earn 5000 total points', '🌟', 'points', 5000, 250);

-- Seed learning content
INSERT INTO public.learning_content (title, description, category, content_type, content, difficulty, points_reward, order_index) VALUES
  ('Introduction to Waste Segregation', 'Learn the basics of separating waste into different categories', 'waste-segregation', 'article',
   '# Waste Segregation Guide\n\nWaste segregation is the process of separating waste into different categories before disposal. This helps in recycling, composting, and proper waste management.\n\n## Why Segregate?\n- Reduces landfill waste\n- Enables recycling\n- Protects the environment\n- Conserves resources\n\n## Basic Categories\n1. **Wet Waste**: Food scraps, garden waste\n2. **Dry Waste**: Paper, cardboard, plastics\n3. **Recyclable**: Glass, metals, clean plastics\n4. **Hazardous**: Batteries, chemicals, medical waste\n5. **E-Waste**: Electronics, cables, circuit boards',
   'beginner', 10, 1),
  ('Understanding Wet and Dry Waste', 'Know the difference between wet and dry waste', 'waste-segregation', 'article',
   '# Wet vs Dry Waste\n\n## Wet Waste (Biodegradable)\n- Kitchen waste and food scraps\n- Fruit and vegetable peels\n- Tea leaves and coffee grounds\n- Garden leaves and flowers\n- Eggshells\n\n## Dry Waste (Non-Biodegradable)\n- Paper and cardboard\n- Plastic bottles and containers\n- Metal cans\n- Glass bottles\n- Rubber items\n- Thermocol\n\n## Tips\n- Keep separate bins for wet and dry waste\n- Drain liquids from dry waste\n- Wrap wet waste in newspaper',
   'beginner', 10, 2),
  ('Recycling 101', 'Everything you need to know about recycling', 'recycling', 'guide',
   '# Recycling Guide\n\n## What Can Be Recycled?\n- Paper and cardboard\n- Glass bottles and jars\n- Metal cans (aluminum, steel)\n- Plastic bottles (types 1 and 2)\n- Newspapers and magazines\n\n## What Cannot Be Recycled?\n- Food-contaminated paper\n- Styrofoam\n- Plastic bags (most programs)\n- Ceramics and pottery\n- Mirrors\n\n## Recycling Tips\n1. Rinse containers before recycling\n2. Remove caps and lids\n3. Flatten cardboard boxes\n4. Check local recycling rules\n5. Keep recyclables clean and dry',
   'beginner', 10, 3),
  ('Composting at Home', 'Learn how to turn waste into garden gold', 'composting', 'guide',
   '# Home Composting Guide\n\n## Getting Started\nComposting turns organic waste into nutrient-rich soil.\n\n## What to Compost\n- Fruit and vegetable scraps\n- Coffee grounds and tea bags\n- Eggshells\n- Yard trimmings\n- Paper towels\n- Cardboard\n\n## What NOT to Compost\n- Meat and dairy\n- Diseased plants\n- Pet waste\n- Treated wood\n\n## Steps\n1. Choose a bin or spot\n2. Layer green and brown materials\n3. Keep it moist\n4. Turn regularly\n5. Harvest in 2-6 months',
   'intermediate', 15, 4),
  ('Plastic Waste Management', 'Understanding plastic types and proper disposal', 'plastic', 'article',
   '# Plastic Waste Management\n\n## Plastic Types\n1. **PET (#1)**: Water bottles - Recyclable\n2. **HDPE (#2)**: Milk jugs - Recyclable\n3. **PVC (#3)**: Pipes - Difficult to recycle\n4. **LDPE (#4)**: Bags - Some programs accept\n5. **PP (#5)**: Yogurt cups - Increasingly recyclable\n6. **PS (#6)**: Styrofoam - Rarely recyclable\n7. **Other (#7)**: Mixed - Usually not recyclable\n\n## Reduce Plastic Use\n- Carry reusable bags\n- Use refillable water bottles\n- Choose products with less packaging\n- Avoid single-use plastics',
   'intermediate', 10, 5),
  ('E-Waste: Safe Disposal', 'How to properly dispose of electronic waste', 'e-waste', 'article',
   '# E-Waste Disposal Guide\n\n## What is E-Waste?\nElectronic waste includes discarded electrical or electronic devices.\n\n## Common E-Waste Items\n- Computers and laptops\n- Mobile phones\n- Televisions\n- Batteries\n- Cables and chargers\n- Printers\n\n## Why E-Waste is Dangerous\n- Contains lead, mercury, cadmium\n- Can contaminate soil and water\n- Releases toxins when burned\n\n## Safe Disposal\n1. Find certified e-waste recyclers\n2. Use manufacturer take-back programs\n3. Donate working electronics\n4. Never throw in regular trash\n5. Remove personal data first',
   'intermediate', 15, 6);
