export interface User {
  id: number;
  phone: string;
  nickname: string;
  school_company: string | null;
  skills: string[];
  desired_role: string | null;
  bio: string | null;
  avatar_key: number;
  has_team: boolean;
}

export interface UserBrief {
  id: number;
  nickname: string;
  avatar_key: number;
}

export type TeamStatus = "recruiting" | "completed";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface TeamRole {
  id: number;
  name: string;
  planned_count: number;
  filled_count: number;
  remaining: number;
  requirements: string;
}

export interface TeamCard {
  id: number;
  name: string;
  tagline: string;
  track: string | null;
  status: TeamStatus;
  capacity: number;
  member_count: number;
  leader: UserBrief;
  leader_phone: string | null;
  roles: TeamRole[];
  updated_at: string;
  is_viewer_member: boolean;
}

export interface TeamMember {
  membership_id: number;
  user_id: number;
  nickname: string;
  avatar_key: number;
  is_leader: boolean;
  role_id: number | null;
  role_name: string | null;
  joined_at: string;
  phone?: string;
  school_company?: string | null;
  skills?: string[];
  desired_role?: string | null;
  bio?: string | null;
}

export interface ApplicationSummary {
  id: number;
  team_id: number;
  status: ApplicationStatus;
  role_name: string;
  message: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamViewer {
  is_authenticated: boolean;
  is_member: boolean;
  is_leader: boolean;
  membership_id: number | null;
  my_role_name: string | null;
  latest_application: ApplicationSummary | null;
  can_apply: boolean;
  can_manage: boolean;
  pending_application_count: number;
  has_other_team: boolean;
}

export interface TeamLeader extends UserBrief {
  desired_role: string | null;
}

export interface TeamDetail extends TeamCard {
  description: string;
  hard_requirements: string | null;
  bonus_preferences: string | null;
  created_at: string;
  leader: TeamLeader;
  leader_profile: {
    phone: string;
    school_company: string | null;
    skills: string[];
    desired_role: string | null;
    bio: string | null;
  } | null;
  members: TeamMember[];
  viewer: TeamViewer;
}

export interface TeamListResponse {
  items: TeamCard[];
  total: number;
  recruiting_count: number;
}

export interface Applicant {
  id: number;
  nickname: string;
  avatar_key: number;
  phone: string;
  school_company: string | null;
  skills: string[];
  desired_role: string | null;
  bio: string | null;
}

export interface LeaderApplication {
  id: number;
  status: ApplicationStatus;
  role_name: string;
  message: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  applicant: Applicant;
}

export interface LeaderApplicationsResponse {
  items: LeaderApplication[];
  pending_count: number;
  total: number;
}

export interface MyApplication {
  id: number;
  team_id: number;
  team_name: string;
  team_tagline: string;
  team_status: TeamStatus;
  status: ApplicationStatus;
  role_name: string;
  message: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  can_reapply: boolean;
}

export interface JoinedTeam extends TeamCard {
  my_role: string;
  is_leader: boolean;
}

export interface Dashboard {
  joined_team: JoinedTeam | null;
  applications: MyApplication[];
  pending_review_count: number;
  pending_application_count: number;
  can_create_team: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RolePayload {
  name: string;
  planned_count: number;
  requirements: string;
}

export interface CreateTeamPayload {
  name: string;
  tagline: string;
  description: string;
  track?: string | null;
  capacity: number;
  roles: RolePayload[];
  hard_requirements?: string | null;
  bonus_preferences?: string | null;
}
