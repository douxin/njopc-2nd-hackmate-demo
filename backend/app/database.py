from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(os.getenv("HACKMATE_DB", str(Path(__file__).resolve().parent.parent / "hackmate.db")))
SEED_ENABLED = os.getenv("HACKMATE_SEED", "1") != "0"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    school_company TEXT,
    skills TEXT NOT NULL DEFAULT '[]',
    desired_role TEXT,
    bio TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codes_phone ON verification_codes(phone);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    track TEXT,
    capacity INTEGER NOT NULL CHECK (capacity >= 1),
    hard_requirements TEXT,
    bonus_preferences TEXT,
    status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'completed')),
    leader_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    planned_count INTEGER NOT NULL CHECK (planned_count >= 1),
    requirements TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES team_roles(id) ON DELETE SET NULL,
    is_leader INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES team_roles(id) ON DELETE SET NULL,
    role_name TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_team ON applications(team_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(applicant_id, team_id);
"""

PENDING_APPLICATION_INDEX = """
CREATE UNIQUE INDEX IF NOT EXISTS ux_applications_pending_applicant_team
ON applications(applicant_id, team_id)
WHERE status = 'pending';
"""



def seed_database(conn: sqlite3.Connection) -> None:
    """Create a small, realistic showcase dataset on a fresh database."""
    if conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] > 0:
        return

    created = now_iso()
    users = [
        ("13800000001", "林小满", "浙江大学 · 计算机", ["Python", "LLM", "产品"], "AI 工程师", "连续参加三届黑客松，喜欢把模糊的想法快速做成可以演示的东西。"),
        ("13800000002", "陈屿", "独立开发者", ["React", "TypeScript", "设计工程"], "前端工程师", "白天写设计系统，晚上做独立产品。正在寻找靠谱的队友。"),
        ("13800000003", "周予安", "中国美术学院 · 视觉传达", ["Figma", "品牌", "动效"], "视觉设计师", "关注工具如何改变人的创作方式，擅长从 0 到 1 建立产品气质。"),
        ("13800000004", "苏禾", "上海科技大学 · 生物信息", ["数据分析", "R", "科研"], "产品/研究", "第一次参加黑客松，想把实验室里的工具带到真实场景。"),
        ("13800000005", "程野", "硬件工程师", ["ESP32", "嵌入式", "3D 打印"], "硬件工程师", "会焊板子，也会写固件，享受通宵调通传感器的瞬间。"),
        ("13800000006", "顾言", "北京大学 · 交互设计", ["用户研究", "Prototyping", "视频"], "产品设计师", "相信好的产品首先是一个好故事，负责把团队的想法讲清楚。"),
        ("13800000007", "沈知", "广州 · 前端开发", ["React", "Three.js", "动效"], "前端工程师", "喜欢把界面做得有呼吸感，也愿意为了一个转场细节反复调试。"),
        ("13800000008", "江临", "上海交通大学 · 软件工程", ["FastAPI", "数据建模", "LLM"], "后端工程师", "做过几个知识管理工具，对把杂乱信息整理清楚这件事有执念。"),
        ("13800000009", "许澄", "正在寻找队友", ["用户研究", "Python", "数据分析"], "产品/研究", "关注人与工具之间的关系，希望第一次黑客松能遇到一支愿意认真打磨作品的队伍。"),
    ]
    for phone, nickname, school, skills, desired, bio in users:
        conn.execute(
            "INSERT INTO users (phone, nickname, school_company, skills, desired_role, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (phone, nickname, school, json.dumps(skills, ensure_ascii=False), desired, bio, created),
        )

    def user_id(index: int) -> int:
        row = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1 OFFSET ?", (index - 1,)).fetchone()
        return int(row["id"])

    teams = [
        {
            "name": "CodeRaft",
            "tagline": "用 AI 把通勤时间变成高质量灵感时间",
            "description": "我们想为每天长时间通勤的创作者做一个轻量的灵感捕捉工具：语音输入、自动整理、到站前生成一张可执行的想法卡片。产品会以移动端 Web Demo 呈现，重点验证从碎片输入到结构化输出的完整体验。",
            "track": "AI × 效率工具",
            "capacity": 5,
            "hard": "10 月 18–19 日需全程到场；能接受快速迭代和 Demo 前的最后冲刺。",
            "bonus": "有 LLM 应用经验、做过语音交互或内容产品；不强求，作品比履历更重要。",
            "leader": 1,
            "status": "recruiting",
            "roles": [
                ("AI 工程师", 2, "熟悉 Python，有调用大模型 API 的经验；能独立完成 RAG 或 Prompt 流程。"),
                ("产品设计师", 1, "能快速做交互原型，对信息组织敏感；愿意一起打磨 Demo 叙事。"),
            ],
        },
        {
            "name": "PixelPantry",
            "tagline": "让冰箱里的剩菜变成今晚的灵感晚餐",
            "description": "拍照识别冰箱现有食材，结合口味与营养偏好生成简单的晚餐方案。我们想做一个视觉上让人有食欲、让人愿意马上动手尝试的产品原型。",
            "track": "消费级产品",
            "capacity": 4,
            "hard": "需要能在现场完成可交互 Demo。",
            "bonus": "喜欢做饭、对食品或健康领域有观察。",
            "leader": 3,
            "status": "completed",
            "roles": [
                ("前端工程师", 1, "React 熟练，重视动效与响应式体验。"),
                ("视觉设计", 1, "有完整的品牌或界面设计作品。"),
            ],
        },
        {
            "name": "TinyLoop",
            "tagline": "给桌面植物做一个会表达情绪的智能花盆",
            "description": "通过土壤湿度、光照和温度传感器，让花盆用极简的灯光和动作表达自己的状态。目标是在 36 小时内做出可展示的硬件原型和配套交互界面。",
            "track": "硬件 × 交互",
            "capacity": 4,
            "hard": "有硬件调试经验，电池、传感器、外壳至少熟悉一项。",
            "bonus": "会 3D 打印、懂一点点植物养护。",
            "leader": 5,
            "status": "recruiting",
            "roles": [
                ("全栈工程师", 1, "能完成展示端的数据可视化和简单后端。"),
                ("硬件工程师", 1, "熟悉 Arduino/ESP32，愿意承担现场焊接与调试。"),
            ],
        },
        {
            "name": "DeepFlow",
            "tagline": "把一场黑客松的讨论，整理成可以继续推进的项目",
            "description": "黑客松里的大量讨论散落在白板、聊天和文档中。我们想用 AI 将会后材料自动整理成决策记录、待办和项目上下文，帮助团队在活动结束后真的把事情继续做下去。",
            "track": "AI × 协作",
            "capacity": 5,
            "hard": "黑客松两天能保证协作时间；愿意接受用户访谈。",
            "bonus": "做过后台工具或知识管理产品。",
            "leader": 8,
            "status": "recruiting",
            "roles": [
                ("后端工程师", 1, "熟悉 Python Web 开发，理解基础的数据建模。"),
                ("产品设计师", 2, "擅长信息架构与复杂流程的简化表达。"),
            ],
        },
    ]

    for team in teams:
        cursor = conn.execute(
            """INSERT INTO teams
            (name, tagline, description, track, capacity, hard_requirements, bonus_preferences, status, leader_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (team["name"], team["tagline"], team["description"], team["track"], team["capacity"], team["hard"], team["bonus"], team["status"], user_id(team["leader"]), created, created),
        )
        team_id = int(cursor.lastrowid)
        for order, (name, count, requirements) in enumerate(team["roles"]):
            conn.execute(
                "INSERT INTO team_roles (team_id, name, planned_count, requirements, sort_order) VALUES (?, ?, ?, ?, ?)",
                (team_id, name, count, requirements, order),
            )
        leader_row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id(team["leader"]),)).fetchone()
        conn.execute(
            "INSERT INTO memberships (team_id, user_id, role_id, is_leader, joined_at) VALUES (?, ?, NULL, 1, ?)",
            (team_id, leader_row["id"], created),
        )
        team["id"] = team_id

    # Add some already-approved members.
    memberships = [
        ("CodeRaft", 2, "AI 工程师"),
        ("PixelPantry", 7, "前端工程师"),
        ("TinyLoop", 6, "全栈工程师"),
    ]
    for team_name, applicant_index, role_name in memberships:
        team_id = next(t["id"] for t in teams if t["name"] == team_name)
        role = conn.execute("SELECT id FROM team_roles WHERE team_id = ? AND name = ?", (team_id, role_name)).fetchone()
        conn.execute(
            "INSERT INTO memberships (team_id, user_id, role_id, is_leader, joined_at) VALUES (?, ?, ?, 0, ?)",
            (team_id, user_id(applicant_index), role["id"], created),
        )

    # A pending application so the review flow can be explored immediately.
    coder = next(t for t in teams if t["name"] == "CodeRaft")
    role = conn.execute("SELECT id, name FROM team_roles WHERE team_id = ? ORDER BY id LIMIT 1", (coder["id"],)).fetchone()
    conn.execute(
        """INSERT INTO applications
        (team_id, applicant_id, role_id, role_name, message, status, rejection_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)""",
        (
            coder["id"], user_id(9), role["id"], role["name"],
            "我有生物信息和数据分析背景，平时用 Python 做科研数据处理，也做过一点语音转写的小工具。很认同把通勤时间变成创作时间的想法，希望在两天里负责用户研究、数据流程和演示内容。",
            created, created,
        ),
    )
    # One visible rejected record for the applicant flow.
    deep = next(t for t in teams if t["name"] == "DeepFlow")
    deep_role = conn.execute("SELECT id, name FROM team_roles WHERE team_id = ? ORDER BY id LIMIT 1", (deep["id"],)).fetchone()
    conn.execute(
        """INSERT INTO applications
        (team_id, applicant_id, role_id, role_name, message, status, rejection_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'rejected', ?, ?, ?)""",
        (
            deep["id"], user_id(9), deep_role["id"], deep_role["name"],
            "我会用 R 和 Python 做数据清洗和可视化，也愿意负责答辩材料。",
            "这次更希望找有后端经验的队友，欢迎下次活动再来。",
            created, created,
        ),
    )
    conn.commit()


def close_duplicate_pending_applications(conn: sqlite3.Connection) -> None:
    """Keep the newest pending application for each applicant/team pair.

    Older installations may already contain duplicates created by concurrent
    requests. Resolve those rows before adding the partial unique index so the
    migration is safe to run on an existing database.
    """
    duplicate_groups = conn.execute(
        """SELECT applicant_id, team_id, MAX(id) AS keep_id
        FROM applications
        WHERE status = 'pending'
        GROUP BY applicant_id, team_id
        HAVING COUNT(*) > 1"""
    ).fetchall()
    if not duplicate_groups:
        return

    stamp = now_iso()
    reason = "系统检测到重复待审核申请，已自动关闭较早记录。"
    for group in duplicate_groups:
        conn.execute(
            """UPDATE applications
            SET status = 'rejected', rejection_reason = ?, updated_at = ?
            WHERE applicant_id = ? AND team_id = ? AND status = 'pending' AND id != ?""",
            (reason, stamp, group["applicant_id"], group["team_id"], group["keep_id"]),
        )


def init_database() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        close_duplicate_pending_applications(conn)
        conn.execute(PENDING_APPLICATION_INDEX)
        if SEED_ENABLED:
            seed_database(conn)
