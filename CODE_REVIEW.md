# 代码检查与重构报告

> 项目：交易笔记（原「交易记录系统」）· Next.js 16 / React 19 / Supabase / Tailwind v4
> 检查与重构时间：2026-10-03

---

## 一、重构总览

| 维度 | 重构前 | 重构后 |
|---|---|---|
| 业务代码规模 | `page.tsx` 单文件 2017 行，30+ useState | 页面仅 340 行做编排，拆为 8 个组件 + 3 个 hook |
| 余额计算 | 3 套互相矛盾的实现，且跨账户求和 | 单一权威实现 `src/lib/balance.ts`，严格按 account_id 隔离 |
| 请求契约 | 全 `any`，靠人肉 `String(x ?? '')` 兜底 | zod schema 统一校验入参与响应 |
| 时区 | `toISOString()` 导致凌晨录入日期差一天 | 全量本地日期处理，零 UTC 转换 |
| 鉴权 | 完全开放 | 可选单密码保护（proxy + httpOnly cookie） |
| 依赖 | 67 个 | 31 个（移除 36 个未使用） |
| UI 组件 | 53 个 shadcn 组件，实际用 11 个 | 保留 11 个，删除 42 个 |
| 视觉风格 | 赛博朋克霓虹：扫描线、辉光、方括号机械标签、emoji | 纸感中性色 + 单一强调色，涨绿跌红，自动适配深浅色 |

验证结果：`tsc --noEmit` 通过（0 错误）、`eslint` 通过（0 错误 0 警告）、dev server 首页/登录页 200。

---

## 二、P0 修复

### 1. 多账户余额串账 ✅

`calcRealBalance()` 原来不加 `account_id` 过滤，把全库出入金和盈亏加总后写入当前账户。
新增 `src/lib/balance.ts` 作为唯一权威实现：

- `calcAccountBalance(accountId)` 严格按账户过滤；
- 历史 `account_id` 为 null 的数据通过 `accountScope()` 归集到默认账户，既隔离又不丢数据；
- 所有写路径统一调用 `recalcAndPersistBalance()`，口径一致。

顺带修了同一个坑的另一面：`GET /api/trades`、`GET /api/fund-records` 原来用 `.eq('account_id', id)`，
会把账户 1 的 null 历史数据全部过滤掉，同样改用 `accountScope()`。

另提供 `assets/migrations/001_fix_account_scope.sql`：回填历史 null、加唯一约束与索引、
重算被污染的 balance 快照。**这个脚本需要你在 Supabase 里执行一次**，只改代码不修脏数据是不够的。

### 2. 三套余额算法并存 ✅

- `POST /api/trades` 的「增量累加」改为与删改一致的全量重算；
- 余额不足时**回滚已插入的记录**再返回 400，不再留下「交易写进去了但余额没变」的中间态；
- `PUT /api/trades` 同理，重算后若为负则回滚到修改前的快照；
- `POST /api/balance`（允许前端传任意金额直接覆盖）已删除，接口改为只读。

### 3. 零鉴权 ✅

- 新增 `proxy.ts` + `app/api/login/route.ts` + `app/login/page.tsx`，可选的**单密码访问控制**；
- 未设置 `APP_PASSWORD` 时完全放行，不破坏现有部署；设置后所有页面与接口都要会话 cookie；
- 会话为 httpOnly + sameSite=lax + 生产环境 secure，有效期 30 天；
- **删除了 `app/api/generate-icon`**（开放的图像生成接口，会消耗 Coze 配额并可写 `public/`）。

> 这是轻量级防护，不等于多用户隔离。真正的方案是 Supabase Auth + RLS，
> SQL 脚本里给出了启用 RLS 的语句模板。

### 4. 写操作非原子 ✅

- 账户删除改为按 `balance → trades → fund_records → equity_history` 顺序执行，任一步失败即中止并报错，不再产生孤儿账户；
- 交易与出入金的写入都加了**失败回滚**；
- 前端所有写操作后统一静默刷新，列表顺序与余额一律以服务端为准，不再手工拼数组。

---

## 三、P1 修复

### 5. 时区 bug ✅

新增 `src/lib/date.ts`，全部使用本地时区：

```ts
toDateStr / toTimeStr / toDateTimeLocal / todayStr / daysAgoStr
splitDateTimeLocal(value)   // 字符串切分，完全不经过 Date，杜绝 UTC 偏移
combineDateTime(date, time)
```

`openDateTime → date` 不再走 `new Date(...).toISOString()`。
UTC+8 下每天 00:00–08:00 录入交易会退一天的问题已消除。

### 6. 类型契约 ✅

新增 `src/lib/schema.ts`（zod）：

- 定义 `Trade` / `FundRecord` / `Account` 及全部枚举；
- `createTradeSchema` / `updateTradeSchema` / `createFundRecordSchema` 校验所有写接口入参；
- `src/lib/api.ts` 用 zod 校验**响应**结构，类型由 schema 推导，删掉了 `useTradingData` 里 30 行手工兜底；
- 请求失败统一抛出可直接展示的 Error（网络层、JSON 层、业务错误分层处理）。

### 7. 巨型组件拆分 ✅

```
src/components/
  BalanceCard.tsx        余额 + 出入金 + 最近流水
  EquityChart.tsx        资产走势（recharts，颜色跟随主题）
  StatsPanel.tsx         区间表现 + 日期筛选 + 盈亏统计
  TradeTable.tsx         交易列表
  TradeDialog.tsx        新增 / 编辑交易
  AccountManager.tsx     账户选择与管理
  FundDialog.tsx         入金 / 出金
  OtherReasonDialog.tsx  复盘备注
  primitives.tsx         Money / Stat / SectionLabel 等展示单元
src/hooks/
  useTradingData.ts      数据加载（含请求竞态保护）
  useTradeForm.ts        交易表单状态与 payload 构建
  useTradeStats.ts       全部派生统计
src/lib/
  tradeLevel.ts          交易分级（纯函数，可单测）
```

`app/page.tsx` 从 2017 行降到约 340 行，只负责编排与事件处理。

### 8. 错误处理与调试残留 ✅

- 删除全部 `alert()`（含那句会把内部 id 暴露给用户的 `alert('前端找不到该记录，id=' + id)`）；
- 删除前端与服务端残留的 `console.log`（含打印余额的调试日志）；
- 统一为 toast；服务端错误经 `toPublicError()` 过滤，不再把数据库细节直接返回给客户端；
- 全部 `catch (error: any)` 改为 `unknown` + 类型守卫。

### 9. 类型断言与 key ✅

- 4 处 `onValueChange={(v: any) => ...}` 改为断言到具体联合类型；
- `key={index}` 改为 `key={trade.id}`。

### 10. 死代码 ✅

- 删除 `api.equityHistory` 客户端包装（未被调用）；
- 删除 `binance-options` 只读判断残骸（币安集成早已移除）；
- 删除 `use-mobile.ts`（无引用）与 `.env.example` 里 7 个失效的 `BINANCE_OPTIONS_*`；
- 发现并修复一个隐藏 bug：代码一直调用 `toast()`，但从未渲染 `<Toaster />`，**提示其实从来没显示过**。

---

## 四、P2 修复

### 11. 依赖精简 ✅

移除 36 个零引用依赖：`@aws-sdk/*`、`drizzle-orm/drizzle-kit/drizzle-zod`、`pg`、
`react-hook-form`、`@hookform/resolvers`、`next-themes`、`date-fns`、`vaul`、`cmdk`、
`embla-carousel-react`、`input-otp`、`https-proxy-agent`、`axios`、`coze-coding-dev-sdk`、
`react-day-picker`、`react-resizable-panels` 及 15 个 radix 组件包。

### 12. UI 组件精简 ✅

53 → 11，只保留 button / card / dialog / input / label / select / textarea / table / switch / popover / collapsible。

### 13. 性能 ✅

- `fmt()` / `fmtTick()` 改为模块级缓存 `Intl.NumberFormat` 实例（表格渲染时不再每次重建）；
- `react-dev-inspector` 改为按需加载，不进生产 bundle；
- 账户列表不再随每次数据刷新重复请求；
- `useTradingData` 加了请求序号，切换账户时旧响应不会覆盖新结果。

### 14. 收益率口径 ✅

改为以**期末净投入（入金 − 出金）**为分母；本金全部撤出时退回累计入金。
代码注释中注明这仍是不考虑现金流发生时间的简单口径，精确口径需改用 TWR。

### 15. 其他 ✅

- `next.config.js` 移除硬编码的 `dev.coze.site`；
- `robots` 改为 `noindex`（个人交易数据不应被索引）；
- `src/lib/supabase.ts` 惰性创建 + 缺失配置时抛出明确中文错误，不再静默传 undefined；
- 新增 `prefers-reduced-motion` 支持。

---

## 五、视觉重构：从机械风到交易笔记

**去掉的**：扫描线动画、霓虹辉光、电路网格背景、旋转齿轮、渐变文字、
`[ AMOUNT ]` 这类方括号机械标签、全部 emoji、animate-pulse 呼吸灯、装饰性角标。

**改成的**：

- **纸感底色**：暖白系（深色模式自动切换为近黑暖灰），卡片纯白、1px 细边框、无阴影；
- **自动深浅色**：`@media (prefers-color-scheme: dark)`，也支持 `.dark` / `.light` 类覆盖；
- **单一强调色**：界面基调为中性墨色，只有涨跌有颜色 —— 涨绿 `--up`、跌红 `--down`；
- **数字等宽**：所有金额/日期用 `.num`（tabular-nums），表格对齐不跳动；
- **字号层级**：标题 15px、正文 13–14px、标签 12px，只有 400/500 两种字重；
- **文案中文化**：`DEPOSIT` → 入金、`WIN RATE` → 胜率、`CLOSED` → 持有中/已平仓、
  `ADD TRADE` → 记一笔、`OTHER.REASON` → 复盘备注。

图表也跟随主题：折线与坐标轴用 `currentColor`，深色模式下自动变浅。

---

## 六、你需要执行的三步

1. **安装依赖**（package.json 已改）
   ```bash
   pnpm install
   ```

2. **执行数据库迁移**（修数据，不只是修代码）
   在 Supabase SQL Editor 中运行 `assets/migrations/001_fix_account_scope.sql`：
   回填历史 null 的 account_id、加唯一约束与索引、重算被串账污染的 balance 快照。
   **第 7 节的 RLS 语句强烈建议一并执行** —— 应用用 anon key 直连，不开 RLS 等于数据公开。

3. **可选：开启访问密码**
   在 `.env.local` 加一行 `APP_PASSWORD=你的密码`，重启后访问需先登录。

---

## 七、仍未处理（需要你决策）

| 事项 | 说明 |
|---|---|
| Supabase Auth 多用户 | 当前为单密码 + 单库，未做 user_id 行级隔离；多用户必须接 Auth + RLS |
| 交易分级单测 | `calcTradeLevel` 已是纯函数，但还没有单测 |
| 分页 | 交易列表仍是一次性全量加载，超过几百笔后需要考虑分页或虚拟滚动 |
| 精确收益率 | 现为简单口径，多期大额出入金时仍会失真，需 TWR |
| README | 文档中的示例仍引用 react-hook-form/zod 旧写法，与实现不符，建议同步更新 |

---

## 八、二轮深度审计（隐藏 bug 排查，已全部修复）

重构后又对全部 API 路由、hooks、组件做了一轮逐行审计，发现并修复 10 个隐藏问题：

### 构建（最严重，重构后部署必炸）

0. **生产构建崩溃：`.babelrc` 硬编码 JSX dev 运行时** ✅
   模板残留的 `.babelrc` 把 `preset-react.development` 写死为 `true`，
   生产构建也编译出 `jsxDEV`（dev 运行时），`next build` 预渲染 `/_not-found` 直接报
   `(0 , d.jsxDEV) is not a function`。**dev server 一切正常，只有 build 会暴露**——
   如果照原样部署 Vercel 必挂。已改为 `babel.config.js` 按 `api.env()` 区分：
   开发环境保留 jsxDEV + react-dev-inspector 插件，生产环境用标准运行时、不加载 dev 插件。
   顺带清空了 `next.config.js` 残留的 coze 域名配置。

### 数据正确性

1. **PUT /api/trades 按客户端传的 accountId 重算余额** ✅
   与 DELETE 不一致（DELETE 从行数据解析账户）。若请求缺失/错传 accountId，
   负数校验与余额重算会落到错误的账户上。已改为以 `oldTrade.account_id` 为准。

2. **取消平仓不清旧盈亏** ✅
   把已平仓改回「持有中」时，若不同时提交 profitLoss，旧的 profit_loss 会留在库里——
   一笔「持有中」的单子仍在参与余额结算。现在 `isClosed=false` 会强制清零 profit_loss 与 remark。

3. **胜率被持有中交易稀释** ✅
   `filteredStats` 与 `periodStats` 把未平仓（profitLoss=0）的单子计入分母，
   胜率被稀释、笔数虚增。现在胜率与笔数只统计已平仓交易。

### 接口健壮性

4. **accountId query 参数未校验** ✅
   `?accountId=abc` → `Number('abc')=NaN` → PostgREST 报错 → 500。
   trades/fund-records/balance 三个 GET 统一走 `parseAccountIdParam()`，非法返回 400；
   fund-records 的 limit 同时加了下界（负数 limit 也会打挂 PostgREST）。

5. **Infinity 可以写进数据库** ✅
   zod v3 的 `z.coerce.number()` 放行 `1e999 → Infinity`，`String(Infinity)` 存库后会污染余额。
   所有金额字段加 `.refine(Number.isFinite)`（注意 refine 必须放在 min/positive 之后）。

6. **日期只校验形状不校验真伪** ✅
   `2026-13-40` 能通过旧正则、到数据库才炸成 500。
   `dateStrSchema` 加了真实日期 refine（含闰年），`openTime` 加了 `HH:mm` 正则。

### 可用性

7. **登录后不回跳原页面** ✅
   proxy 一直带 `?next=`，登录页却永远回 `/`。已支持回跳，并校验 next 必须是站内路径（防开放重定向）。

8. **账户操作失败仍清空输入** ✅
   重名创建账户时 toast 报错但输入框已被清空。page 层改为重新抛出错误，
   AccountManager 只在成功时清空/退出编辑。

9. **「入金 / 出金」标签名实不符** ✅
   EquityChart 该格显示的是净值（入金-出金），标签改为「净投入」。

### 可维护性 / 扩展性现状评估

| 维度 | 现状 | 评级 |
|---|---|---|
| 分层 | lib（纯函数/契约）→ hooks（状态）→ components（展示）→ page（编排），依赖单向 | 良好 |
| 契约 | zod schema 单一真源，前后端共享 `src/lib/schema.ts` | 良好 |
| 余额口径 | `src/lib/balance.ts` 唯一实现，四张表写路径全部收敛 | 良好 |
| 新加字段成本 | schema 加字段 → parse 函数加映射 → 组件展示，链路清晰 | 良好 |
| 事务性 | 写 + 重算 + 回滚是应用层实现的，并发极端场景仍有窗口（单用户可接受）；要彻底解决需 Postgres RPC 把「写入 + 重算」放进一个事务 | 可接受，有改进路径 |
| 测试 | 仍为 0（`calcTradeLevel`/`balance`/`date` 都是纯函数，补单测成本低） | 待补 |

验证：`tsc --noEmit` 0 错误 · `eslint` 0 错误 0 警告 · `next build` 通过。
