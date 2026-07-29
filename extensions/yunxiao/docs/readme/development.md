# 开发说明

面向贡献者：架构、构建、扩展点。

## 1. 技术栈

- **运行时**：Node + Raycast Extension API (`@raycast/api`)
- **语言**：TypeScript（React 函数式组件 + Hooks）
- **构建**：Raycast 自带的 `ray build` / `ray develop`
- **静态检查**：`ray lint`（内部跑 ESLint + Prettier + manifest 校验）
- **包管理**：npm

## 2. 目录结构

````
src/
├── api/                  # 云效 OpenAPI 客户端
│   ├── client.ts         # 通用 request 封装 + Raycast 偏好读取 + 错误类
│   ├── projects.ts       # SearchProjects（POST /oapi/v1/projex/.../projects）
│   ├── sprints.ts        # SearchSprints（POST .../sprints:search）
│   ├── testplans.ts      # ListTestPlans（POST .../testplans:search）
│   ├── workitems.ts      # SearchWorkitems
│   ├── codeup.ts         # ListRepositories / ListOpenMergeRequests（GET /oapi/v1/codeup/...）
│   └── types.ts          # 共享类型 + YunxiaoApiError
├── utils/
│   ├── credentials.ts   # 可独立测试的凭证校验与规范化
│   ├── urls.ts          # 统一的云效浏览器 URL 构造（含 Codeup 入口与安全 HTTPS 校验）
│   └── format.ts        # 类别本地化、日期格式化等
├── menu.tsx              # 根菜单
├── yunxiao-entry.tsx     # 云效门户入口（按业务域分组：工作台 / 项目协作 / 测试管理 / 代码管理 / 制品仓库 / 企业管理后台 / 个人设置）
├── list-projects.tsx     # 项目列表（含查看工作项 / 迭代 / 测试计划 三个子视图 + 内联的工作项详情）
└── list-test-plans.tsx   # 测试计划列表（直接列出当前组织所有可见的测试计划；搜索栏右侧下拉按项目 / 状态过滤）

## 3. 核心架构

### 3.1 接入层（`src/api/`）

- **`client.ts`**
    - `resolveCredentials()`：从 `getPreferenceValues()` 读取偏好，再交给 `utils/credentials.ts` 的纯解析器统一校验
    - `buildProjexPath(creds, suffix)`：按 `mode` 拼 projex 命名空间 path
        - `central` → `/oapi/v1/projex/organizations/{orgId}/{suffix}`
        - `region` → `/oapi/v1/projex/{suffix}`（不拼 orgId 段）
    - `request<T>(path, options)`：通用 GET / POST 封装，错误转 `YunxiaoApiError`（带 `status` / `url` / `bodyText` / `method`），并从诊断内容中移除 PAT

- **`utils/credentials.ts`**：纯函数校验 PAT、Organization Id 和 Region URL；Region URL 会 trim、去除尾部 `/`，并要求带主机名的完整 HTTPS URL。共享的脱敏 helper 会替换诊断文本中 PAT 的所有出现位置。
- **`utils/urls.ts`**：集中构造项目、typed 工作项、迭代、测试计划和企业管理 URL；所有动态 path segment 都编码。

- **`projects.ts` / `workitems.ts`**：调用 `request<T>`，按官方 `:search` 端点要求用 POST + JSON body。响应是裸数组；详情接口响应是对象。

### 3.2 UI 层（`src/*.tsx`）

- 每个命令一个文件，导出默认组件。
- 列表加载模式：先 `useState(null)` 表示"未加载"，再用 `useEffect` 异步拉取，加载完成 set 到 items；出错 set 到 error 并 toast 提示。
- EmptyView 在错误状态下提供「重新加载」与「复制错误详情」动作（见 `list-projects.tsx`）。

### 3.3 偏好（`package.json` 的 `preferences`）

| name                  | type      | required | 说明                                 |
| --------------------- | --------- | -------- | ------------------------------------ |
| `personalAccessToken` | password  | 是       | PAT，存放在 Raycast 加密偏好         |
| `organizationId`      | textfield | 是       | 中心版与 Region 版都必填             |
| `endpointMode`        | dropdown  | 是       | `central` / `region`，默认 `central` |
| `regionUrl`           | textfield | 否       | Region 模式下必填且必须使用 HTTPS    |

## 4. 常用命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev               # 等价于 ray develop

# 无第三方依赖的纯 helper 测试（Node 24）
npm test

# 静态检查（manifest + icon + eslint + prettier）
npm run lint

# 类型检查
npx tsc --noEmit

# 构建（产出 .raycast 目录）
npm run build             # 等价于 ray build
````

## 5. 端点契约（中心版 / Region 版对照）

> 鉴权头：`x-yunxiao-token: <PAT>`（两种模式通用）

| 操作         | 中心版 path                                                              | Region 版 path                                     | Method | Body                                                                                          |
| ------------ | ------------------------------------------------------------------------ | -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| 列出项目     | `/oapi/v1/projex/organizations/{orgId}/projects:search`                  | `/oapi/v1/projex/projects:search`                  | POST   | `{page,perPage,orderBy,sort,conditions?}`                                                     |
| 搜索工作项   | `/oapi/v1/projex/organizations/{orgId}/workitems:search`                 | `/oapi/v1/projex/workitems:search`                 | POST   | `{spaceId,spaceType,category?,page,perPage,orderBy,sort}`                                     |
| 工作项详情   | `/oapi/v1/projex/organizations/{orgId}/workitems/{id}?spaceId={spaceId}` | `/oapi/v1/projex/workitems/{id}?spaceId={spaceId}` | GET    | —                                                                                             |
| 列出迭代     | `/oapi/v1/projex/organizations/{orgId}/projects/{id}/sprints`            | `/oapi/v1/projex/projects/{id}/sprints`            | GET    | query: `{page,perPage,status?,name?}`（status 取值：TODO / DOING / ARCHIVED，多选用逗号分隔） |
| 列出测试计划 | `/oapi/v1/projex/organizations/{orgId}/testPlan/list`                    | `/oapi/v1/projex/testPlan/list`                    | POST   | query: `{page,perPage,projectIdentifier?,sprintIdentifier?,status?,name?}`                    |

| 列出代码库 | `/oapi/v1/codeup/organizations/{orgId}/repositories` | `/oapi/v1/codeup/repositories` | GET | `{page,perPage,orderBy,sort,search?,archived?}` |
| 查询合并请求 | `/oapi/v1/codeup/organizations/{orgId}/changeRequests` | `/oapi/v1/codeup/changeRequests` | GET | `{page,perPage,projectIds?,authorIds?,reviewerIds?,state=opened,search?,orderBy,sort,createdAfter?,createdBefore?}`（state 取值：opened / merged / closed，默认 opened） |

> 历史教训：`/organization/{orgId}/listProjects` 这类 `devops/2021-06-25` 端点需要阿里云 ROA 签名（AccessKey），不能用 PAT；本扩展已避开。

## 6. 扩展点

### 6.1 新增命令

1. 在 `src/` 添加 `xxx.tsx`，导出默认 React 组件
2. 在 `package.json` 的 `commands` 里登记：`{ "name": "xxx", "title": "...", "mode": "view" }`
3. 在 `src/menu.tsx` 的 `MENU_ITEMS` 加一条

### 6.2 新增 API 调用

1. 在 `src/api/types.ts` 加响应类型
2. 新建 `src/api/<resource>.ts`，导出 `listX()` / `getX()`，复用 `request()` + `buildProjexPath()`
3. UI 层在 `useEffect` 里调用，参考 `list-projects.tsx` 的错误展示模式

### 6.3 新增云效门户入口（`yunxiao-entry`）

`src/yunxiao-entry.tsx` 是一个**纯浏览器跳转**命令，与 PAT 无关；条目按业务域分到不同 `List.Section` 中渲染，新增条目只需在 `PORTAL_ITEMS` 数组中追加一个 `PortalItem`，并指定 `section`：

```ts
{
  id: "testhub",
  section: "test",  // 工作台 / projex / test / codeup / packages / admin / settings
  title: "测试管理",
  subtitle: "Testhub 仓库 / 用例库",
  url: `${BASE}/testhub/repo`,
  shortcut: { modifiers: ["cmd", "shift"], key: "t" },
}
```

- 分组由 `section` 字段决定；新增分组时同时在 `SECTION_LAYOUT` 数组里登记 `id` 与中文标题，否则条目不会渲染。
- 静态 URL 条目使用 `Action.OpenInBrowser`，直接由 Raycast 接管打开。
- 需要从偏好拼 URL 的条目（例如「企业管理后台」需要 `organizationId`）：把 `url` 留 `null` 并提供 `unavailableMessage`；当偏好缺失时主动作改为 toast 提示用户在偏好中补齐，不要再做项目选择器之类的二级流程。
- 图标：仅 `package.json` 顶层 `icon` 必须 PNG；列表项 `icon={{ source: "assets/x.png" }}` 接受 PNG（PNG 比 SVG 渲染更可靠，建议统一使用 PNG）。
- Codeup 浏览器快速入口（代码库 / 代码组 / 合并请求）由本命令的「代码管理」分组承担；不要在其他命令里重复添加。

### 6.4 错误展示约定

- Toast 只放一行短因（`status · message[0]`）
- EmptyView 描述放一行短因
- `Action.CopyToClipboard` 提供完整诊断（baseUrl + mode + orgId + URL + status + response body + 排查建议）
- 不要在错误里打印 token

## 7. CI / 检查清单

提交前必须通过：

- [ ] `npm test` 全部通过
- [ ] `npm run lint` 无 error（warning 视情况）
- [ ] `npx tsc --noEmit` 无错误
- [ ] 没有 `console.log` / `debugger` 残留
- [ ] 没有把 token 写入日志或返回值
- [ ] API 端点改动同时检查中心版 / Region 版两种 path
- [ ] 偏好字段改动同步更新 `README.md` 与 `docs/readme/usage.md`
