from __future__ import annotations

import hmac
import json
import re
import secrets
import sqlite3
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .database import connect, init_database, now_iso
from .schemas import (
    ApplicationCreateRequest,
    LoginRequest,
    RegisterRequest,
    RejectApplicationRequest,
    SendCodeRequest,
    TeamCreateRequest,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    yield


app = FastAPI(title="HackMate API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)
PHONE_PATTERN = re.compile(r"^1\d{10}$")


def get_db():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any] | None:
    if credentials is None:
        return None
    row = conn.execute(
        """SELECT u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?""",
        (credentials.credentials,),
    ).fetchone()
    return dict(row) if row else None


def required_user(user: dict[str, Any] | None = Depends(optional_user)) -> dict[str, Any]:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录后再继续")
    return user


def validate_phone(phone: str) -> str:
    phone = phone.strip()
    if not PHONE_PATTERN.fullmatch(phone):
        raise HTTPException(status_code=400, detail="请输入 11 位手机号")
    return phone


def skills_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    except (json.JSONDecodeError, TypeError):
        pass
    return [part.strip() for part in re.split(r"[,，]", raw) if part.strip()]


def skills_json(raw: str | None) -> str:
    if not raw:
        return "[]"
    parts = [part.strip() for part in re.split(r"[,，]", raw) if part.strip()]
    seen: list[str] = []
    for part in parts:
        if part.casefold() not in {item.casefold() for item in seen}:
            seen.append(part)
    return json.dumps(seen, ensure_ascii=False)


def user_brief(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "nickname": row["nickname"],
        "avatar_key": row["id"] % 6,
    }


def self_user(conn: sqlite3.Connection, row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    membership = conn.execute("SELECT team_id FROM memberships WHERE user_id = ?", (row["id"],)).fetchone()
    return {
        "id": row["id"],
        "phone": row["phone"],
        "nickname": row["nickname"],
        "school_company": row["school_company"],
        "skills": skills_list(row["skills"]),
        "desired_role": row["desired_role"],
        "bio": row["bio"],
        "avatar_key": row["id"] % 6,
        "has_team": membership is not None,
    }


def issue_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(36)
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, now_iso()),
    )
    return token


def latest_application(conn: sqlite3.Connection, user_id: int, team_id: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM applications WHERE applicant_id = ? AND team_id = ? ORDER BY id DESC LIMIT 1",
        (user_id, team_id),
    ).fetchone()


def membership_for(conn: sqlite3.Connection, user_id: int, team_id: int | None = None) -> sqlite3.Row | None:
    if team_id is None:
        return conn.execute("SELECT * FROM memberships WHERE user_id = ?", (user_id,)).fetchone()
    return conn.execute(
        "SELECT * FROM memberships WHERE user_id = ? AND team_id = ?", (user_id, team_id)
    ).fetchone()


def get_team_or_404(conn: sqlite3.Connection, team_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="队伍不存在或已下线")
    return row


def require_team_leader(team: sqlite3.Row, user: dict[str, Any]) -> None:
    if int(team["leader_id"]) != int(user["id"]):
        raise HTTPException(status_code=403, detail="只有队长可以执行此操作")


def roles_for_team(conn: sqlite3.Connection, team_id: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT tr.*, COUNT(m.id) AS filled_count
        FROM team_roles tr
        LEFT JOIN memberships m ON m.role_id = tr.id AND m.team_id = tr.team_id
        WHERE tr.team_id = ?
        GROUP BY tr.id
        ORDER BY tr.sort_order, tr.id""",
        (team_id,),
    ).fetchall()
    result = []
    for row in rows:
        filled = int(row["filled_count"])
        planned = int(row["planned_count"])
        result.append(
            {
                "id": row["id"],
                "name": row["name"],
                "planned_count": planned,
                "filled_count": filled,
                "remaining": max(0, planned - filled),
                "requirements": row["requirements"],
            }
        )
    return result


def members_for_team(conn: sqlite3.Connection, team_id: int, private: bool) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT m.id AS membership_id, m.user_id, m.is_leader, m.role_id, m.joined_at,
                  tr.name AS role_name,
                  u.nickname, u.phone, u.school_company, u.skills, u.desired_role, u.bio
        FROM memberships m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN team_roles tr ON tr.id = m.role_id
        WHERE m.team_id = ?
        ORDER BY m.is_leader DESC, m.joined_at, m.id""",
        (team_id,),
    ).fetchall()
    members = []
    for row in rows:
        member: dict[str, Any] = {
            "membership_id": row["membership_id"],
            "user_id": row["user_id"],
            "nickname": row["nickname"],
            "avatar_key": int(row["user_id"]) % 6,
            "is_leader": bool(row["is_leader"]),
            "role_id": row["role_id"],
            "role_name": row["role_name"],
            "joined_at": row["joined_at"],
        }
        if private:
            member.update(
                {
                    "phone": row["phone"],
                    "school_company": row["school_company"],
                    "skills": skills_list(row["skills"]),
                    "desired_role": row["desired_role"],
                    "bio": row["bio"],
                }
            )
        members.append(member)
    return members


def team_card(conn: sqlite3.Connection, team: sqlite3.Row, viewer: dict[str, Any] | None) -> dict[str, Any]:
    team_id = int(team["id"])
    leader = conn.execute("SELECT id, nickname FROM users WHERE id = ?", (team["leader_id"],)).fetchone()
    member_count = int(
        conn.execute("SELECT COUNT(*) AS n FROM memberships WHERE team_id = ?", (team_id,)).fetchone()["n"]
    )
    is_member = bool(viewer and membership_for(conn, int(viewer["id"]), team_id))
    leader_phone = None
    if is_member:
        leader_phone = conn.execute("SELECT phone FROM users WHERE id = ?", (team["leader_id"],)).fetchone()["phone"]
    return {
        "id": team_id,
        "name": team["name"],
        "tagline": team["tagline"],
        "track": team["track"],
        "status": team["status"],
        "capacity": team["capacity"],
        "member_count": member_count,
        "leader": user_brief(leader),
        "leader_phone": leader_phone,
        "roles": roles_for_team(conn, team_id),
        "updated_at": team["updated_at"],
        "is_viewer_member": is_member,
    }


def application_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "team_id": row["team_id"],
        "status": row["status"],
        "role_name": row["role_name"],
        "message": row["message"],
        "rejection_reason": row["rejection_reason"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def team_detail(conn: sqlite3.Connection, team: sqlite3.Row, viewer: dict[str, Any] | None) -> dict[str, Any]:
    team_id = int(team["id"])
    viewer_membership = membership_for(conn, int(viewer["id"]), team_id) if viewer else None
    is_member = viewer_membership is not None
    is_leader = bool(viewer and int(team["leader_id"]) == int(viewer["id"]))
    latest = latest_application(conn, int(viewer["id"]), team_id) if viewer else None
    other_membership = membership_for(conn, int(viewer["id"])) if viewer else None
    can_apply = bool(
        viewer
        and not is_member
        and other_membership is None
        and team["status"] == "recruiting"
        and (latest is None or latest["status"] != "pending")
    )
    leader = conn.execute(
        "SELECT id, nickname, phone, school_company, skills, desired_role, bio FROM users WHERE id = ?",
        (team["leader_id"],),
    ).fetchone()
    pending_count = 0
    if is_leader:
        pending_count = int(
            conn.execute(
                "SELECT COUNT(*) AS n FROM applications WHERE team_id = ? AND status = 'pending'",
                (team_id,),
            ).fetchone()["n"]
        )

    viewer_payload: dict[str, Any] = {
        "is_authenticated": viewer is not None,
        "is_member": is_member,
        "is_leader": is_leader,
        "membership_id": viewer_membership["id"] if viewer_membership else None,
        "my_role_name": None,
        "latest_application": application_summary(latest) if latest else None,
        "can_apply": can_apply,
        "can_manage": is_leader,
        "pending_application_count": pending_count,
        "has_other_team": bool(other_membership and not is_member),
    }
    if viewer_membership:
        role = None
        if viewer_membership["role_id"]:
            role_row = conn.execute("SELECT name FROM team_roles WHERE id = ?", (viewer_membership["role_id"],)).fetchone()
            role = role_row["name"] if role_row else None
        viewer_payload["membership_id"] = viewer_membership["id"]
        viewer_payload["my_role_name"] = "队长" if viewer_membership["is_leader"] else role

    detail = team_card(conn, team, viewer)
    detail.update(
        {
            "description": team["description"],
            "hard_requirements": team["hard_requirements"],
            "bonus_preferences": team["bonus_preferences"],
            "created_at": team["created_at"],
            "leader": {
                **user_brief(leader),
                "desired_role": leader["desired_role"] if is_member else None,
            },
            "leader_profile": (
                {
                    "phone": leader["phone"],
                    "school_company": leader["school_company"],
                    "skills": skills_list(leader["skills"]),
                    "desired_role": leader["desired_role"],
                    "bio": leader["bio"],
                }
                if is_member
                else None
            ),
            "members": members_for_team(conn, team_id, private=is_member),
            "viewer": viewer_payload,
        }
    )
    return detail


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


@app.post("/api/auth/send-code")
def send_code(payload: SendCodeRequest, conn: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    phone = validate_phone(payload.phone)
    code = f"{secrets.randbelow(1_000_000):06d}"
    conn.execute("DELETE FROM verification_codes WHERE phone = ?", (phone,))
    conn.execute(
        "INSERT INTO verification_codes (phone, code, created_at) VALUES (?, ?, ?)",
        (phone, code, now_iso()),
    )
    is_registered = conn.execute("SELECT 1 FROM users WHERE phone = ?", (phone,)).fetchone() is not None
    conn.commit()
    return {
        "message": "开发环境验证码已生成",
        "dev_code": code,
        "is_registered": is_registered,
    }


def consume_code(conn: sqlite3.Connection, phone: str, code: str) -> None:
    row = conn.execute(
        "SELECT code FROM verification_codes WHERE phone = ? ORDER BY id DESC LIMIT 1", (phone,)
    ).fetchone()
    if row is None or not hmac.compare_digest(str(row["code"]), code.strip()):
        raise HTTPException(status_code=400, detail="验证码不正确，请重新获取")
    conn.execute("DELETE FROM verification_codes WHERE phone = ?", (phone,))


@app.post("/api/auth/register")
def register(payload: RegisterRequest, conn: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    phone = validate_phone(payload.phone)
    if conn.execute("SELECT 1 FROM users WHERE phone = ?", (phone,)).fetchone():
        raise HTTPException(status_code=409, detail="该手机号已注册，请直接登录")
    try:
        consume_code(conn, phone, payload.code)
        cursor = conn.execute(
            """INSERT INTO users (phone, nickname, school_company, skills, desired_role, bio, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                phone,
                payload.nickname.strip(),
                payload.school_company,
                skills_json(payload.skills),
                payload.desired_role,
                payload.bio,
                now_iso(),
            ),
        )
        user_id = int(cursor.lastrowid)
        token = issue_session(conn, user_id)
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="该手机号已注册，请直接登录") from None

    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"token": token, "user": self_user(conn, user)}


@app.post("/api/auth/login")
def login(payload: LoginRequest, conn: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    phone = validate_phone(payload.phone)
    user = conn.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="该手机号尚未注册，请先注册")
    consume_code(conn, phone, payload.code)
    token = issue_session(conn, int(user["id"]))
    conn.commit()
    return {"token": token, "user": self_user(conn, user)}


@app.get("/api/auth/me")
def me(user: dict[str, Any] = Depends(required_user), conn: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    return self_user(conn, user)


@app.post("/api/auth/logout")
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, str]:
    if credentials:
        conn.execute("DELETE FROM sessions WHERE token = ?", (credentials.credentials,))
        conn.commit()
    return {"message": "已退出登录"}


# ---------------------------------------------------------------------------
# Teams
# ---------------------------------------------------------------------------


@app.get("/api/teams")
def list_teams(
    status_filter: Literal["recruiting", "completed", "all"] = Query(default="recruiting", alias="status"),
    search: str = Query(default="", max_length=100),
    viewer: dict[str, Any] | None = Depends(optional_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    clauses = ["1 = 1"]
    params: list[Any] = []
    if status_filter != "all":
        clauses.append("t.status = ?")
        params.append(status_filter)
    query = search.strip()
    if query:
        like = f"%{query}%"
        clauses.append(
            """(t.name LIKE ? OR t.tagline LIKE ? OR t.description LIKE ?
            OR EXISTS (SELECT 1 FROM team_roles tr WHERE tr.team_id = t.id AND tr.name LIKE ?))"""
        )
        params.extend([like, like, like, like])
    order = (
        "CASE t.status WHEN 'recruiting' THEN 0 ELSE 1 END ASC, t.updated_at DESC, t.id DESC"
        if status_filter == "all"
        else "t.updated_at DESC, t.id DESC"
    )
    rows = conn.execute(
        f"SELECT t.* FROM teams t WHERE {' AND '.join(clauses)} ORDER BY {order}", params
    ).fetchall()
    items = [team_card(conn, row, viewer) for row in rows]
    recruiting_count = int(
        conn.execute("SELECT COUNT(*) AS n FROM teams WHERE status = 'recruiting'").fetchone()["n"]
    )
    return {"items": items, "total": len(items), "recruiting_count": recruiting_count}


@app.get("/api/teams/{team_id}")
def get_team(
    team_id: int,
    viewer: dict[str, Any] | None = Depends(optional_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    return team_detail(conn, team, viewer)


@app.post("/api/teams", status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreateRequest,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    if membership_for(conn, int(user["id"])):
        raise HTTPException(status_code=409, detail="你已加入一支队伍，不能重复创建")
    stamp = now_iso()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = ?
            WHERE applicant_id = ? AND status = 'pending'""",
            ("您已创建队伍。", stamp, user["id"]),
        )
        cursor = conn.execute(
            """INSERT INTO teams
            (name, tagline, description, track, capacity, hard_requirements, bonus_preferences,
             status, leader_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'recruiting', ?, ?, ?)""",
            (
                payload.name,
                payload.tagline,
                payload.description,
                payload.track,
                payload.capacity,
                payload.hard_requirements,
                payload.bonus_preferences,
                user["id"],
                stamp,
                stamp,
            ),
        )
        team_id = int(cursor.lastrowid)
        for order, role in enumerate(payload.roles):
            conn.execute(
                """INSERT INTO team_roles (team_id, name, planned_count, requirements, sort_order)
                VALUES (?, ?, ?, ?, ?)""",
                (team_id, role.name, role.planned_count, role.requirements, order),
            )
        conn.execute(
            """INSERT INTO memberships (team_id, user_id, role_id, is_leader, joined_at)
            VALUES (?, ?, NULL, 1, ?)""",
            (team_id, user["id"], stamp),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    team = get_team_or_404(conn, team_id)
    return team_detail(conn, team, user)


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------


@app.post("/api/teams/{team_id}/applications", status_code=status.HTTP_201_CREATED)
def apply_to_team(
    team_id: int,
    payload: ApplicationCreateRequest,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    if membership_for(conn, int(user["id"])):
        raise HTTPException(status_code=409, detail="你已加入一支队伍，无法申请其他队伍")
    if team["status"] != "recruiting":
        raise HTTPException(status_code=409, detail="该队伍已完成组队，暂不接受申请")
    role = conn.execute(
        "SELECT * FROM team_roles WHERE id = ? AND team_id = ?", (payload.role_id, team_id)
    ).fetchone()
    if not role:
        raise HTTPException(status_code=400, detail="请选择该队伍的招募角色")
    previous = latest_application(conn, int(user["id"]), team_id)
    if previous and previous["status"] == "pending":
        raise HTTPException(status_code=409, detail="你已提交过申请，正在等待队长审核")
    stamp = now_iso()
    cursor = conn.execute(
        """INSERT INTO applications
        (team_id, applicant_id, role_id, role_name, message, status, rejection_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)""",
        (team_id, user["id"], payload.role_id, role["name"], payload.message, stamp, stamp),
    )
    conn.execute("UPDATE teams SET updated_at = ? WHERE id = ?", (stamp, team_id))
    conn.commit()
    application_id = int(cursor.lastrowid)
    return {
        "message": "申请已提交，正在等待队长审核",
        "application": {
            "id": application_id,
            "team_id": team_id,
            "status": "pending",
            "role_name": role["name"],
            "message": payload.message,
            "rejection_reason": None,
            "created_at": stamp,
            "updated_at": stamp,
        },
    }


@app.get("/api/teams/{team_id}/applications")
def list_team_applications(
    team_id: int,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    require_team_leader(team, user)
    rows = conn.execute(
        """SELECT a.*, u.nickname, u.phone, u.school_company, u.skills, u.desired_role, u.bio,
                  u.id AS applicant_user_id
        FROM applications a
        JOIN users u ON u.id = a.applicant_id
        WHERE a.team_id = ?
        ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                 a.created_at DESC, a.id DESC""",
        (team_id,),
    ).fetchall()
    items = []
    pending_count = 0
    for row in rows:
        if row["status"] == "pending":
            pending_count += 1
        items.append(
            {
                "id": row["id"],
                "status": row["status"],
                "role_name": row["role_name"],
                "message": row["message"],
                "rejection_reason": row["rejection_reason"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "applicant": {
                    "id": row["applicant_user_id"],
                    "nickname": row["nickname"],
                    "avatar_key": int(row["applicant_user_id"]) % 6,
                    "phone": row["phone"],
                    "school_company": row["school_company"],
                    "skills": skills_list(row["skills"]),
                    "desired_role": row["desired_role"],
                    "bio": row["bio"],
                },
            }
        )
    return {"items": items, "pending_count": pending_count, "total": len(items)}


def reject_other_pending(
    conn: sqlite3.Connection, applicant_id: int, reason: str, keep_application_id: int | None = None
) -> None:
    params: list[Any] = [reason, now_iso(), applicant_id]
    sql = """UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = ?
    WHERE applicant_id = ? AND status = 'pending'"""
    if keep_application_id is not None:
        sql += " AND id != ?"
        params.append(keep_application_id)
    conn.execute(sql, params)


@app.post("/api/applications/{application_id}/approve")
def approve_application(
    application_id: int,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    application = conn.execute(
        """SELECT a.*, t.leader_id, t.status AS team_status, t.name AS team_name
        FROM applications a JOIN teams t ON t.id = a.team_id
        WHERE a.id = ?""",
        (application_id,),
    ).fetchone()
    if not application:
        raise HTTPException(status_code=404, detail="申请记录不存在")
    if int(application["leader_id"]) != int(user["id"]):
        raise HTTPException(status_code=403, detail="只有队长可以审核申请")
    if application["status"] != "pending":
        raise HTTPException(status_code=409, detail="该申请已被处理")
    if application["team_status"] != "recruiting":
        raise HTTPException(status_code=409, detail="队伍已完成组队，不能再通过申请")

    existing = membership_for(conn, int(application["applicant_id"]))
    if existing:
        conn.execute(
            """UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = ?
            WHERE id = ?""",
            ("申请人已加入其他队伍。", now_iso(), application_id),
        )
        conn.commit()
        raise HTTPException(status_code=409, detail="该申请人已加入其他队伍，无法通过申请")

    stamp = now_iso()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.execute(
            """INSERT INTO memberships (team_id, user_id, role_id, is_leader, joined_at)
            VALUES (?, ?, ?, 0, ?)""",
            (application["team_id"], application["applicant_id"], application["role_id"], stamp),
        )
        conn.execute(
            """UPDATE applications SET status = 'approved', rejection_reason = NULL, updated_at = ?
            WHERE id = ?""",
            (stamp, application_id),
        )
        reject_other_pending(
            conn,
            int(application["applicant_id"]),
            "您已加入其他队伍。",
            keep_application_id=application_id,
        )
        conn.execute("UPDATE teams SET updated_at = ? WHERE id = ?", (stamp, application["team_id"]))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="该申请人已加入其他队伍，无法通过申请") from None
    return {
        "message": f"已通过 {application['team_name']} 的申请",
        "membership_id": int(cursor.lastrowid),
    }


@app.post("/api/applications/{application_id}/reject")
def reject_application(
    application_id: int,
    payload: RejectApplicationRequest,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    application = conn.execute(
        """SELECT a.*, t.leader_id FROM applications a
        JOIN teams t ON t.id = a.team_id WHERE a.id = ?""",
        (application_id,),
    ).fetchone()
    if not application:
        raise HTTPException(status_code=404, detail="申请记录不存在")
    if int(application["leader_id"]) != int(user["id"]):
        raise HTTPException(status_code=403, detail="只有队长可以审核申请")
    if application["status"] != "pending":
        raise HTTPException(status_code=409, detail="该申请已被处理")
    conn.execute(
        """UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE id = ?""",
        (payload.reason, now_iso(), application_id),
    )
    conn.execute("UPDATE teams SET updated_at = ? WHERE id = ?", (now_iso(), application["team_id"]))
    conn.commit()
    return {"message": "已拒绝该申请"}


# ---------------------------------------------------------------------------
# Team lifecycle and membership management
# ---------------------------------------------------------------------------


@app.post("/api/teams/{team_id}/complete")
def complete_team(
    team_id: int,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    require_team_leader(team, user)
    if team["status"] == "completed":
        raise HTTPException(status_code=409, detail="队伍已经完成组队")
    stamp = now_iso()
    conn.execute("UPDATE teams SET status = 'completed', updated_at = ? WHERE id = ?", (stamp, team_id))
    conn.execute(
        """UPDATE applications SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE team_id = ? AND status = 'pending'""",
        ("该队伍已完成组队。", stamp, team_id),
    )
    conn.commit()
    return {"message": "队伍已完成组队，待审核申请已自动关闭"}


@app.post("/api/teams/{team_id}/reopen")
def reopen_team(
    team_id: int,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    require_team_leader(team, user)
    if team["status"] == "recruiting":
        raise HTTPException(status_code=409, detail="队伍已经在招募中")
    conn.execute("UPDATE teams SET status = 'recruiting', updated_at = ? WHERE id = ?", (now_iso(), team_id))
    conn.commit()
    return {"message": "已重新开放招募"}


@app.delete("/api/teams/{team_id}/members/{membership_id}")
def remove_member(
    team_id: int,
    membership_id: int,
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    team = get_team_or_404(conn, team_id)
    require_team_leader(team, user)
    membership = conn.execute(
        "SELECT * FROM memberships WHERE id = ? AND team_id = ?", (membership_id, team_id)
    ).fetchone()
    if not membership:
        raise HTTPException(status_code=404, detail="成员不存在")
    if membership["is_leader"]:
        raise HTTPException(status_code=400, detail="队长不能移除自己")
    conn.execute("DELETE FROM memberships WHERE id = ?", (membership_id,))
    conn.execute("UPDATE teams SET updated_at = ? WHERE id = ?", (now_iso(), team_id))
    conn.commit()
    return {"message": "成员已移出队伍"}


# ---------------------------------------------------------------------------
# Personal dashboard
# ---------------------------------------------------------------------------


@app.get("/api/me/dashboard")
def my_dashboard(
    user: dict[str, Any] = Depends(required_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    membership = conn.execute(
        "SELECT * FROM memberships WHERE user_id = ? ORDER BY joined_at DESC LIMIT 1", (user["id"],)
    ).fetchone()
    joined_team = None
    joined_team_id = None
    if membership:
        joined_team_id = int(membership["team_id"])
        team = get_team_or_404(conn, joined_team_id)
        joined_team = team_card(conn, team, user)
        role_name = "队长"
        if not membership["is_leader"] and membership["role_id"]:
            role_row = conn.execute("SELECT name FROM team_roles WHERE id = ?", (membership["role_id"],)).fetchone()
            role_name = role_row["name"] if role_row else "队员"
        joined_team["my_role"] = role_name
        joined_team["is_leader"] = bool(membership["is_leader"])

    app_rows = conn.execute(
        """SELECT a.*, t.name AS team_name, t.tagline AS team_tagline, t.status AS team_status
        FROM applications a JOIN teams t ON t.id = a.team_id
        WHERE a.applicant_id = ? AND a.status IN ('pending', 'rejected')
        ORDER BY a.updated_at DESC, a.id DESC""",
        (user["id"],),
    ).fetchall()
    seen_teams: set[int] = set()
    applications: list[dict[str, Any]] = []
    for row in app_rows:
        team_id = int(row["team_id"])
        if team_id == joined_team_id or team_id in seen_teams:
            continue
        seen_teams.add(team_id)
        applications.append(
            {
                "id": row["id"],
                "team_id": team_id,
                "team_name": row["team_name"],
                "team_tagline": row["team_tagline"],
                "team_status": row["team_status"],
                "status": row["status"],
                "role_name": row["role_name"],
                "message": row["message"],
                "rejection_reason": row["rejection_reason"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "can_reapply": bool(
                    row["status"] == "rejected"
                    and row["team_status"] == "recruiting"
                    and joined_team_id is None
                ),
            }
        )

    pending_review_count = int(
        conn.execute(
            """SELECT COUNT(*) AS n FROM applications a
            JOIN teams t ON t.id = a.team_id
            WHERE t.leader_id = ? AND a.status = 'pending'""",
            (user["id"],),
        ).fetchone()["n"]
    )
    pending_application_count = int(
        conn.execute(
            "SELECT COUNT(*) AS n FROM applications WHERE applicant_id = ? AND status = 'pending'",
            (user["id"],),
        ).fetchone()["n"]
    )
    return {
        "joined_team": joined_team,
        "applications": applications,
        "pending_review_count": pending_review_count,
        "pending_application_count": pending_application_count,
        "can_create_team": joined_team is None,
    }
