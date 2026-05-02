# 长期记忆

## 用户偏好
- **XMind 思维导图默认输出路径**：`C:\Users\king\Documents\读书思维导图\`
- **XMind 文件命名规范**：`《书名》全书重点思维导图.xmind`
- **XMind 生成不保留中间 .md 文件**，只产出 .xmind（生成后清理临时 .md）
- **参考 XMind 格式**：`《错误的行为》全书核心思维导图.xmind`（用户指定作为格式参考）

### XMind 生成规范
- **大纲结构要求**：
  1. 第一分支固定为"书籍基础信息"，包含书名、作者、出版社、出版年份等
  2. 后续分支按书籍内容章节/主题划分
  3. 中心主题为书名
- **生成方式**：使用 xmind-generator skill 的 `generate_xmind.js`（Node.js xmind SDK）
- **Node.js 执行**：需用完整路径 `C:\Program Files\nodejs\node.exe`
- **输出文件类型**：仅 .xmind，不保留中间 .md 文件

## 环境信息
- **Node.js**：v24.15.0（`C:\Program Files\nodejs\node.exe`）
- **npm**：11.12.1（`C:\Program Files\nodejs\npm.cmd`）
- **pnpm**：全局安装在 `$env:APPDATA\npm\pnpm.cmd`
- **Python**：3.8（`C:\Users\king\AppData\Local\Programs\Python\Python38\python.exe`）
- **Shell 限制**：当前 shell PATH 不含 Node.js，需用完整路径或通过 `Start-Process` 执行
- **Python 执行方式**：必须通过 `Start-Process -RedirectStandardOutput/RedirectStandardError` 才能获取输出
- **xmind-generator skill**：依赖已安装（29 packages），路径 `C:\Users\king\.workbuddy\skills\xmind-generator\`

## Next.js 项目启动
- **项目路径**：`C:\Users\king\Documents\GitHub\zzz`
- **启动命令**：直接用 node 运行 `node_modules\next\dist\bin\next dev --webpack --port 5000`
- **完整命令**：`Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "node_modules\next\dist\bin\next","dev","--webpack","--port","5000"`
- **端口**：默认 5000（注意避免端口冲突）
- **首次启动**：需要先运行 `npm install --ignore-scripts`（安装 1069 个包）

## 项目功能（zzz 交易记录系统）
- 币安期权数据集成：实时从 Binance EAPI 拉取期权成交记录，只读显示
- Binance 数据不计入手动交易统计（资产走势图、盈利统计均排除）
- 环境变量：`BINANCE_OPTIONS_API_KEY`、`BINANCE_OPTIONS_API_SECRET`

### Binance API 签名修复 (2026-05-02)
- **问题**：签名验证失败 (错误码 -1022)
- **原因**：`URLSearchParams.toString()` 不保证参数按字母顺序输出，但 Binance API 要求参数必须按字母顺序签名
- **修复**：手动收集参数并排序后生成签名字符串
- **关键代码** (`src/lib/binance.ts`):
  ```typescript
  // 收集参数并按字母顺序排序
  signingParams.sort((a, b) => a[0].localeCompare(b[0]));
  const queryString = signingParams.map(([k, v]) => `${k}=${v}`).join('&');
  const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
  ```
- **recvWindow 不参与签名**：只用于请求，签名只包含业务参数（timestamp, startTime, endTime, limit 等）

### 交易列表自适应表格
- 手动交易：显示交易分级、仓位、平仓原因等
- Binance 期权：显示方向(买入/卖出)、类型(Call/Put)、数量、价格、手续费、已实现盈亏等
