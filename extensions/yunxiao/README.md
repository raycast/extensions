# 云效（Yunxiao）Raycast 扩展

使用阿里云 [云效](https://devops.aliyun.com) 的个人访问令牌（Personal Access Token）在 Raycast 中快速查看项目、工作项、迭代、测试计划、代码库与合并请求，**无需打开网页**。

## 功能

- **云效入口**（`Yunxiao`）—— 一键直达工作台、项目协作、测试管理、代码管理（Codeup）、制品仓库、企业管理后台与个人设置；除企业管理后台依赖 `Organization Id` 偏好外，其余均为静态深链，无网络请求。
- **项目列表**（`Project List`）—— 列出当前 organization 下可访问的项目，支持关键字筛选。每个项目上可展开：
    - **查看工作项**：按类别（全部 / 需求 / 任务 / 缺陷 / 主题 / 原始诉求 / 风险）筛选 + 本地搜索，回车在云效中打开；
    - **查看迭代**：列出 TODO / DOING 状态的迭代，显示起止时间（`YYYY-MM-DD`）与负责人；
    - **查看测试计划**：跳转到全组织测试计划列表；
    - **概览 / 各类别 / 迭代 Backlog / 测试计划列表** 等一键深链。
- **代码库**（`List Repositories`）—— 列出当前组织下可访问的代码库，支持名称 / 路径 / 命名空间本地搜索，回车在 Codeup 中打开；显示最近活动日期。
- **合并请求**（`List Merge Requests`）—— 按状态（开启 / 已合并 / 已关闭）筛选合并请求（默认开启），支持标题 / 仓库 / 分支 / 作者本地搜索，显示 `sourceBranch → targetBranch` 与作者。
- **测试计划**（`Search Test Plan`）—— 直接展示当前 organization 下所有可见的测试计划（前后端均不过滤项目），按状态（全部 / 未开始 / 进行中 / 已完成）筛选（默认 DOING），显示状态、起止时间、项目名。

> 详细使用与排查请见 [docs/readme/usage.md](docs/readme/usage.md)；开发说明见 [docs/readme/development.md](docs/readme/development.md)；功能清单与待办见 [docs/readme/funlist.md](docs/readme/funlist.md)。

## 偏好设置

进入 Raycast → 输入 `Manage Extensions` → 找到 **云效** → 填写：

| 字段                     | 必填             | 说明                                                                                                      |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `Personal Access Token`  | 是               | 在 devops.aliyun.com → 个人信息 → 个人访问令牌 中生成；建议至少勾选「项目」「工作项」「代码管理」读权限。 |
| `Organization Id`        | 是               | 企业标识。devops.aliyun.com 登录后 URL 中 `/organization/<id>/...` 的 `<id>` 段，或在"成员管理"页面获取。 |
| `接入点`                 | 是               | 下拉：`中心版`（默认）/`Region 版`。中心版走 rdc 统一接入层；Region 版用于自部署或其他地域实例。          |
| `Region 版 API Base URL` | 仅 Region 版必填 | 自部署域名，例如 `https://devops.cn-hangzhou.aliyuncs.com`。中心版无需填写。                              |

## 命令清单

| 命令名                | Raycast 入口          | 行为                                                                         |
| --------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `yunxiao-entry`       | `Yunxiao`             | 多门户深链（工作台 / 项目 / 测试 / Codeup / 制品库 / 企业管理后台 / 设置）。 |
| `list-projects`       | `Project List`        | 浏览项目 → 工作项 / 迭代 / 测试计划 / 概览 / 各类别子视图与深链。            |
| `list-repositories`   | `List Repositories`   | 浏览代码库，本地搜索 + 在 Codeup 中打开。                                    |
| `list-merge-requests` | `List Merge Requests` | 按状态（开启 / 已合并 / 已关闭，默认开启）浏览合并请求，本地搜索。           |
| `list-test-plans`     | `Search Test Plan`    | 浏览当前 organization 下所有可见的测试计划，按状态过滤（默认进行中）。       |

## 开发

```bash
npm install
npm run dev        # ray develop
npm test           # Node 原生测试（test/*.test.mjs）
npm run lint       # ray lint  (manifest + icons + eslint + prettier)
npm run build      # ray build
npx tsc --noEmit   # 类型检查
```

> 架构、目录结构、扩展点见 [docs/readme/development.md](docs/readme/development.md)。
> 本项目使用 TypeScript + ESLint（flat config）+ Prettier。`eslint.config.js` 将 `@raycast/eslint-config` 中可能嵌套的数组（`typescript.configs.recommended`）扁平化以兼容 ESLint 10+。

## API 参考

> 鉴权：所有端点统一使用 `x-yunxiao-token: <PAT>` 头。

| 操作               | 文档                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| SearchProjects     | https://help.aliyun.com/zh/yunxiao/developer-reference/searchprojects  |
| SearchWorkitems    | https://help.aliyun.com/zh/yunxiao/developer-reference/searchworkitems |
| GetWorkitem        | https://help.aliyun.com/zh/yunxiao/developer-reference/getworkitem     |
| ListProjectMembers | https://help.aliyun.com/document_detail/2870170.html                   |
| ListSprints        | https://help.aliyun.com/document_detail/460575.html                    |
| ListTestPlan       | https://help.aliyun.com/document_detail/460575.html                    |
| ListRepositories   | https://help.aliyun.com/document_detail/460575.html                    |
| ListChangeRequests | https://help.aliyun.com/document_detail/460575.html                    |
| API 列表总览       | https://help.aliyun.com/document_detail/460575.html                    |

## 路线图

- [ ] 工作项创建 / 编辑 / 状态切换
- [ ] 详情面板：工作项详情用 Raycast `Detail` 内联展示（当前只有列表）
- [ ] 分页加载更多（项目工作项一次性拉满 200 条）
- [ ] 本地缓存以避免每次重新拉取
- [ ] 通知中心 / 待办事项（云效通知 API）

## 隐私

PAT 仅存储在 Raycast 偏好中（已加密），扩展不会写入任何仓库文件，也不会上传云效以外的服务。错误信息中不会泄露令牌。
