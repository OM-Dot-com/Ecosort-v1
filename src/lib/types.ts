export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  city: string | null
  bio: string | null
  environmental_interests: string[]
  role: 'user' | 'organizer' | 'admin'
  total_points: number
  completed_drives: number
  waste_scans_count: number
  groups_joined: number
  daily_scan_count: number
  last_scan_date: string | null
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  image_url: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  max_members: number
  is_public: boolean
  environmental_goals: string[]
  organizer_id: string
  member_count: number
  created_at: string
  updated_at: string
  organizer?: Profile
  distance?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'member' | 'moderator' | 'organizer'
  joined_at: string
  profiles?: Profile
}

export interface GroupJoinRequest {
  id: string
  group_id: string
  user_id: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface GroupMessage {
  id: string
  group_id: string
  user_id: string
  content: string
  is_announcement: boolean
  created_at: string
  profiles?: Profile
}

export interface CleaningEvent {
  id: string
  title: string
  description: string | null
  location_name: string
  latitude: number
  longitude: number
  event_date: string
  meeting_point: string | null
  max_participants: number
  cleaning_type: string | null
  required_equipment: string[]
  group_id: string | null
  organizer_id: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'verified'
  participant_count: number
  created_at: string
  updated_at: string
  organizer?: Profile
  groups?: Group
  distance?: number
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  status: 'registered' | 'cancelled' | 'attended' | 'no_show'
  registered_at: string
  profiles?: Profile
  cleaning_events?: CleaningEvent
}

export interface EventAttendance {
  id: string
  event_id: string
  user_id: string
  marked_by: string
  marked_at: string
}

export interface CleanupEvidence {
  id: string
  event_id: string
  user_id: string
  before_image_url: string | null
  after_image_url: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: Profile
  cleaning_events?: CleaningEvent
}

export interface WasteScan {
  id: string
  user_id: string
  image_url: string | null
  waste_name: string
  waste_category: string
  recommended_bin: string | null
  bin_color: string | null
  recyclable: boolean | null
  disposal_instructions: string | null
  environmental_impact: string | null
  confidence_score: number | null
  needs_verification: boolean
  points_awarded: number
  created_at: string
}

export interface PointTransaction {
  id: string
  user_id: string
  points: number
  transaction_type: string
  description: string | null
  reference_id: string | null
  reference_type: string | null
  created_at: string
}

export interface Reward {
  id: string
  name: string
  description: string | null
  image_url: string | null
  points_cost: number
  category: string
  is_active: boolean
  stock: number | null
  created_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  status: 'pending' | 'fulfilled' | 'cancelled'
  created_at: string
  rewards?: Reward
}

export interface Achievement {
  id: string
  name: string
  description: string | null
  icon: string | null
  badge_color: string
  requirement_type: string
  requirement_value: number
  points_reward: number
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  achievements?: Achievement
}

export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  reference_id: string | null
  reference_type: string | null
  is_read: boolean
  created_at: string
}

export interface LearningContent {
  id: string
  title: string
  description: string | null
  content: string | null
  category: string
  content_type: 'article' | 'video' | 'quiz' | 'guide'
  image_url: string | null
  video_url: string | null
  difficulty: string
  points_reward: number
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  content_id: string
  score: number
  max_score: number
  passed: boolean
  points_awarded: number
  created_at: string
}

export interface Challenge {
  id: string
  title: string
  description: string | null
  challenge_type: 'daily' | 'weekly'
  requirement_type: string
  requirement_value: number
  points_reward: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_type: 'user' | 'group' | 'event' | 'message'
  reported_id: string
  reason: string
  description: string | null
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface PointConfig {
  id: string
  action_type: string
  points: number
  daily_limit: number | null
  description: string | null
  updated_at: string
}
