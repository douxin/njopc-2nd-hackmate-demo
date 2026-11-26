# HackMate 测试执行报告

| 项目 | 内容 |
| --- | --- |
| 报告日期 | 2026-11-26 |
| 被测版本 | backend 0.1.0 / frontend 0.1.0 |
| 被测提交 | `570a3021ef576d9b59999a5f2858eae2f6e54f5f` |
| 测试依据 | `docs/test-cases.md`（152 条用例）、`README.md`、`DESIGN.md`、`AGENTS.md` |
| 测试范围 | API 测试、浏览器端到端测试、权限与安全专项、数据一致性、工程构建、数据库初始化 |
| 总体结论 | **S2 并发缺陷已修复并复验通过**：152 条用例中 151 条通过、1 条失败；剩余 1 个 S4 视觉问题，不阻塞发布 |

---

## 1. 执行结论

| 指标 | 结果 |
| --- | ---: |
| 计划用例数 | 152 |
| 已执行用例数 | 152 |
| 通过 | 151 |
| 失败 | 1 |
| 通过率 | **99.3%** |
| P0 通过率 | **51 / 51 = 100%** |
| P1 通过率 | **91 / 92 = 98.9%** |
| P2 通过率 | **9 / 9 = 100%** |
| 未关闭缺陷 | 1（S4 × 1；S2 已修复） |
| 前端类型检查 | 通过 |
| 前端生产构建 | 通过 |

退出标准评估：

- [x] 所有 P0 用例 100% 通过：**满足**（`SEC-09` 修复后复验通过）。
- [x] P1 用例通过率不低于 95%：**满足**（98.9%）。
- [x] 无 S1、S2 级未关闭缺陷：**满足**（S2 已修复；仅剩 S4）。
- [x] PRD 12 条验收主流程与权限矩阵已覆盖：满足。
- [x] API 权限、手机号泄露、IDOR、重复成员关系专项已独立执行：除并发重复申请外通过。
- [x] `npm run lint`、`npm run build` 通过；后端启动无未处理异常。
- [x] 阶段外功能入口/接口检查通过。

---

## 2. 测试环境与执行方式

| 项 | 值 |
| --- | --- |
| 操作系统 | macOS（本地） |
| 后端 | Python 3.12.11、FastAPI 0.165.0、Uvicorn 0.54.0、SQLite |
| 前端 | Node.js v24.22.3、npm 11.19.1、Vite 6.4.6、React 18、TypeScript |
| 浏览器 | Chromium 1208（Playwright，无头） |
| 后端测试地址 | `http://127.0.0.1:18000` |
| 前端测试地址 | `http://127.0.0.1:5174` |
| 测试数据库 | 独立临时库 `/tmp/hackmate-test-run/hackmate.db` |
| 数据隔离 | 每轮写操作测试前重建临时数据库；补充测试使用独立 API 账号/队伍 |
| 证据目录 | `/tmp/hackmate-test-run/`（结果 JSON、压力测试日志、截图） |

执行方式：

1. **API 自动化**：通过真实 HTTP 请求覆盖认证、广场、创建队伍、申请、审核、生命周期、仪表盘、安全与异常输入。
2. **浏览器 E2E**：使用 Playwright 在真实 Chromium 中执行注册/登录、筛选搜索、创建队伍、申请、审核、完成/重开、移除成员、我的队伍等主流程。
3. **并发专项**：对“重复申请”和“重复审核通过”进行双线程并发压力测试。
4. **工程/NFR 检查**：独立临时库启动、二次启动、`HACKMATE_SEED=0`、自定义数据库路径、异常输入、`npm run lint`、`npm run build`。
5. **视觉走查**：对广场、详情、创建、我的队伍等页面在 1280×800 和 1440×900 下截图检查，并校验主要颜色、圆角、字体与横向溢出。

---

## 3. 分模块结果

| 模块 | 用例数 | 通过 | 失败 | 失败用例 |
| --- | ---: | ---: | ---: | --- |
| SMK 冒烟与系统启动 | 4 | 4 | 0 | — |
| AUTH 注册/登录/退出 | 17 | 17 | 0 | — |
| PLZ 组队广场 | 16 | 16 | 0 | — |
| CT 创建队伍 | 15 | 15 | 0 | — |
| DTL 队伍详情 | 13 | 13 | 0 | — |
| APP 申请加入 | 14 | 14 | 0 | — |
| REV 队长审核 | 17 | 17 | 0 | — |
| LC 生命周期与成员 | 17 | 17 | 0 | — |
| MY 我的队伍 | 13 | 13 | 0 | — |
| SEC 权限与安全 | 10 | 10 | 0 | — |
| UI 界面与可用性 | 9 | 8 | 1 | `UI-04` |
| NFR 非功能与工程 | 7 | 7 | 0 | — |
| **合计** | **152** | **151** | **1** | `UI-04` |

### 3.1 主要通过项

- 手机号 + 6 位开发验证码注册/登录、验证码重发后旧码失效、刷新保持、退出后 token 失效与账号隔离。
- 广场默认“组队中”筛选、状态切换、名称/简介/角色搜索、空状态、加载失败重试、⌘K 搜索与去抖。
- 创建队伍字段校验、容量/角色/文本边界、自动成为队长、创建后自动关闭名下待审核申请。
- 申请校验、重复申请顺序拦截、被拒后重新申请、多队待审核申请、待审核数量同步。
- 队长通过/拒绝、拒绝理由、自动关闭冲突申请、重复审核拦截、完成组队、重新开放、移除成员。
- 手机号权限矩阵、非成员隐私最小化、被移除成员权限即时收回、跨队 IDOR、XSS 文本处理、SQL 注入特殊字符、token 篡改。
- 我的队伍、拒绝理由、重新申请入口、创建入口条件、仪表盘数量一致性。
- 全新库初始化、种子关闭、自定义数据库路径、异常请求均返回结构化 4xx、前端 lint/build 通过。
- 1280px / 1440px 桌面布局无横向滚动；主要页面视觉走查未发现阻断性布局问题。

---

## 4. 缺陷与修复复验

### DEF-001（S2）：并发重复申请可产生两条 pending 记录

| 项目 | 内容 |
| --- | --- |
| 关联用例 | `SEC-09`（P0） |
| 严重级别 | **S2 严重** |
| 影响范围 | 同一用户对同一队伍并发提交申请；待审核数量、队长审核列表和数据一致性 |
| 状态 | **已修复，复验通过** |

**预期结果**：同一用户对同一队伍最多产生一条 `pending` 申请；并发请求中至多一个返回 `201`，其余返回 `409`。

**实际结果**：并发压力测试中出现两个请求均返回 `201`、数据库中同时存在 2 条 `pending` 申请。

**复现证据**：

- 并发压测 30 轮，每轮使用新用户、新队伍并发提交 2 次申请。
- 其中 **5 轮**出现 `[201, 201]`，数据库 `pending_count=2`，重复出现率约 **17%**。
- 证据文件：`/tmp/hackmate-test-run/concurrency-apply-stress.json`、`/tmp/hackmate-test-run/concurrency-apply-stress.txt`。
- 压测片段：

```text
3  [201, 201] pending=2
12 [201, 201] pending=2
19 [201, 201] pending=2
26 [201, 201] pending=2
30 [201, 201] pending=2
SUMMARY runs=30 duplicate_runs=5 duplicate_rate=17%
```

**原因分析**：原实现“先查最新 pending 再插入”的逻辑在两个并发数据库连接中不是原子操作；`applications` 表没有 `(applicant_id, team_id, pending)` 唯一约束兜底，两个事务都能在检查时看到“无 pending”。

**已实施修复**：

1. 在 `backend/app/database.py` 增加部分唯一索引：
   `CREATE UNIQUE INDEX IF NOT EXISTS ux_applications_pending_applicant_team ON applications(applicant_id, team_id) WHERE status = 'pending';`
2. 在 `backend/app/main.py` 的申请接口中使用 `BEGIN IMMEDIATE`，将队伍状态、成员身份、重复申请检查与插入放入同一写事务；捕获并发唯一约束冲突并统一返回 `409`。
3. 增加旧数据库迁移逻辑：启动时先将历史重复 pending 中较早的记录自动拒绝，仅保留最新一条，再创建唯一索引，避免已有数据导致启动失败。

**修复复验结果**：

- 并发申请 30 轮：**30/30 均只有一个 `201`，另一请求返回 `409`，pending 数始终为 1，重复率 0%**。
- 旧库迁移模拟：2 条历史 pending 自动收敛为 1 条，较早记录写入拒绝理由；唯一索引成功创建。
- 唯一索引兜底：直接向数据库插入第二条 pending 会被 SQLite `IntegrityError` 阻断。
- 完整 API 回归 122/122 通过，浏览器 E2E 关键申请/审核主流程通过。
- 证据文件：`/tmp/hackmate-test-run/concurrency-apply-stress-fixed-final.txt`、`/tmp/hackmate-test-run/api-suite-fixed-final.txt`。

**并发通过申请检查**：同一压力场景下重复 `approve` 10/10 轮均表现为一个 `200` + 一个 `409`，membership 未重复创建，该子项通过。

---

### DEF-002（S4）：队伍卡片 hover 上浮效果被入场动画覆盖

| 项目 | 内容 |
| --- | --- |
| 关联用例 | `UI-04`（P1） |
| 严重级别 | **S4 轻微** |
| 影响范围 | 广场队伍卡片 hover 视觉反馈 |
| 状态 | **未修复** |

**预期结果**：卡片 hover 时轻微上浮并显示阴影；主按钮 hover、键盘焦点环、禁用态等均正常。

**实际结果**：hover 时阴影和边框颜色会变化，但卡片 `transform` 保持 `matrix(1, 0, 0, 1, 0, 0)`，没有产生 `-2px` 上浮。原因是卡片同时使用 `animate-fade-up`（`animation-fill-mode: both`）和 `hover:-translate-y-0.5`，动画的最终 `transform` 覆盖了 hover transform。

**证据**：`/tmp/hackmate-test-run/screens/UI-04-failed.png`；计算样式探测中 hover 前后 `transform` 不变，阴影从 `none` 变为 `0 8px 30px rgba(0,0,0,0.08)`。

**修复建议**：入场动画结束后移除 `transform` 的 fill 覆盖，或把入场动画移到外层容器，让卡片自身的 hover transform 生效。

---

## 5. 执行明细与证据

| 执行批次 | 数量 | 结果 |
| --- | ---: | --- |
| API 自动化检查（修复后） | 122 | 122 通过 |
| 浏览器 E2E 主套件（修复后） | 40 | 40 通过 |
| 浏览器 E2E 补充套件（修复后） | 16 | 15 通过，1 失败（`UI-04`） |
| NFR / 构建 / 数据库检查 | 7 | 7 通过 |
| （按 152 条文档用例去重合并） | 152 | 151 通过，1 失败 |

关键证据文件：

- 全量合并结果：`/tmp/hackmate-test-run/final-results-fixed.json`
- API 结果：`/tmp/hackmate-test-run/api-results.json`
- UI 主套件结果：`/tmp/hackmate-test-run/ui-results.json`
- UI 补充套件结果：`/tmp/hackmate-test-run/ui-supplement-results.json`
- NFR 结果：`/tmp/hackmate-test-run/nfr-results.json`
- 并发压测（修复后）：`/tmp/hackmate-test-run/concurrency-apply-stress.json`、`/tmp/hackmate-test-run/concurrency-apply-stress-fixed-final.txt`
- 旧库迁移复验：`/tmp/hackmate-test-run/migration-fixed-final.txt`
- 构建日志：`/tmp/hackmate-test-run/nfr05-lint.log`、`/tmp/hackmate-test-run/nfr05-build.log`
- 页面截图：`/tmp/hackmate-test-run/screens/`

---

## 6. 风险与建议

1. **DEF-001 已修复并通过并发、迁移和全量 API 回归**；P0 用例现全部通过，S2 已关闭。
2. 建议保留本次并发压力与旧库迁移测试作为发布前回归项，尤其关注未来修改申请流程或 SQLite 事务边界时。
3. DEF-002 不影响业务流程，可随视觉优化迭代修复；建议在完成修复后复查卡片 hover 与入场动画。
4. 当前项目没有提交正式的自动化测试目录；本次使用独立测试脚本执行。建议将 API 用例与关键 Playwright E2E 用例纳入仓库，作为后续回归基线。
