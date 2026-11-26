import type {
  AuthResponse,
  CreateTeamPayload,
  Dashboard,
  LeaderApplicationsResponse,
  TeamDetail,
  TeamListResponse,
  User,
} from "@/types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const TOKEN_KEY = "hackmate_token";

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function messageFromDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as { msg: unknown }).msg).replace(/^Value error,\s*/, "");
    }
  }
  return "操作没有完成，请稍后再试";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token: string | null = getStoredToken(),
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError("无法连接服务器，请确认后端服务已启动", 0);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(messageFromDetail(payload?.detail), response.status);
  }
  return payload as T;
}

export const api = {
  sendCode(phone: string) {
    return request<{ message: string; dev_code: string; is_registered: boolean }>("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },
  register(input: {
    phone: string;
    code: string;
    nickname: string;
    school_company?: string;
    skills?: string;
    desired_role?: string;
    bio?: string;
  }) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(phone: string, code: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
  },
  me(token: string) {
    return request<User>("/auth/me", {}, token);
  },
  logout(token: string) {
    return request<{ message: string }>("/auth/logout", { method: "POST" }, token);
  },
  teams(params: { status: "recruiting" | "completed" | "all"; search?: string }) {
    const query = new URLSearchParams();
    query.set("status", params.status);
    if (params.search?.trim()) query.set("search", params.search.trim());
    return request<TeamListResponse>(`/teams?${query.toString()}`);
  },
  team(teamId: number) {
    return request<TeamDetail>(`/teams/${teamId}`);
  },
  createTeam(payload: CreateTeamPayload, token: string) {
    return request<TeamDetail>("/teams", { method: "POST", body: JSON.stringify(payload) }, token);
  },
  apply(teamId: number, payload: { role_id: number; message: string }, token: string) {
    return request<{ message: string }>(`/teams/${teamId}/applications`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);
  },
  teamApplications(teamId: number, token: string) {
    return request<LeaderApplicationsResponse>(`/teams/${teamId}/applications`, {}, token);
  },
  approveApplication(applicationId: number, token: string) {
    return request<{ message: string }>(`/applications/${applicationId}/approve`, { method: "POST" }, token);
  },
  rejectApplication(applicationId: number, reason: string | null, token: string) {
    return request<{ message: string }>(`/applications/${applicationId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }, token);
  },
  completeTeam(teamId: number, token: string) {
    return request<{ message: string }>(`/teams/${teamId}/complete`, { method: "POST" }, token);
  },
  reopenTeam(teamId: number, token: string) {
    return request<{ message: string }>(`/teams/${teamId}/reopen`, { method: "POST" }, token);
  },
  removeMember(teamId: number, membershipId: number, token: string) {
    return request<{ message: string }>(`/teams/${teamId}/members/${membershipId}`, { method: "DELETE" }, token);
  },
  dashboard(token: string) {
    return request<Dashboard>("/me/dashboard", {}, token);
  },
};
