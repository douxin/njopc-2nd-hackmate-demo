# HackMate

HackMate 是一个面向黑客松现场组队的本地 Web 应用。用户可以浏览组队公告、创建队伍、提交加入申请，队长可以审核申请、管理成员并完成组队。

## 已实现功能

- 手机号 + 6 位验证码注册 / 登录 / 退出。
- 开发模式验证码生成后直接展示在页面，不发送真实短信。
- 组队广场：关键词搜索、状态筛选、加载 / 错误 / 空状态。
- 队伍详情、成员列表、角色剩余名额、要求和加分项。
- 创建队伍并自动成为队长与第一名成员。
- 申请加入队伍、选择目标角色、填写文字介绍。
- 队长审核申请（同意 / 拒绝 / 选填拒绝理由）。
- 拒绝后重新申请、多条待审核申请、自动关闭冲突申请。
- 队长完成组队、重新开放招募、移除成员。
- “我的队伍”：已加入队伍、我的申请状态、拒绝理由、待审核数量。
- 手机号按权限可见：游客与普通申请人不可见，队长与队内成员可见。
- 默认头像、桌面端设计。

附件上传、头像上传、用户资料编辑、成员主动退出、转让队长、站内聊天等功能不在本阶段范围内。

## 技术栈

- 后端：Python、FastAPI、SQLite、uv
- 前端：React、Vite、TypeScript、Tailwind CSS、shadcn/ui 风格组件、lucide-react

## 本地启动

### 1. 启动后端

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

后端地址：`http://127.0.0.1:8000`  
API 文档：`http://127.0.0.1:8000/docs`

### 2. 启动前端

另开一个终端：

```bash
cd frontend
npm install
npm run dev
```

打开：`http://127.0.0.1:5173`

> Vite 已配置 `/api` 代理到 `http://127.0.0.1:8000`。

### 生产构建检查

```bash
cd frontend
npm run build
```

## 开发数据

首次启动后端时会在 `backend/hackmate.db` 创建 SQLite 数据库，并写入一组演示数据。所有演示账号均可通过页面上的“发送验证码”登录，验证码会直接显示。

| 手机号 | 昵称 | 说明 |
| --- | --- | --- |
| `13800000001` | 林小满 | CodeRaft 队长，有 1 份待审核申请 |
| `13800000002` | 陈屿 | CodeRaft 成员 |
| `13800000003` | 周予安 | PixelPantry 队长（已完成组队） |
| `13800000004` | 苏禾 | 未加入队伍，可用于体验创建队伍 |
| `13800000005` | 程野 | TinyLoop 队长 |
| `13800000006` | 顾言 | TinyLoop 成员 |
| `13800000007` | 沈知 | PixelPantry 成员 |
| `13800000008` | 江临 | DeepFlow 队长 |
| `13800000009` | 许澄 | 已向 CodeRaft 提交待审核申请 |

也可以直接注册一个新手机号，验证码同样会展示在登录 / 注册表单下方。

### 重置演示数据

停止后端后删除数据库文件，再重新启动即可重建：

```bash
rm backend/hackmate.db backend/hackmate.db-shm backend/hackmate.db-wal
```

如果不希望写入演示数据：

```bash
HACKMATE_SEED=0 uv run uvicorn app.main:app --reload --port 8000
```

可通过 `HACKMATE_DB=/path/to/hackmate.db` 指定数据库文件位置。

## 目录

```
backend/
  app/
    main.py        # FastAPI 路由和业务逻辑
    database.py    # SQLite 表结构、连接和演示数据
    schemas.py     # 请求校验模型
frontend/
  src/
    pages/         # 广场、登录、创建队伍、队伍详情、我的队伍
    components/    # 布局、队伍卡片、审核面板、表单和 ui 组件
    contexts/      # 登录状态
    lib/           # API 客户端与工具函数
docs/              # 产品需求与设计文档
```
