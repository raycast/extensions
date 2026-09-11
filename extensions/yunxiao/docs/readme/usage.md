# 使用说明

面向最终用户：在 Raycast 中安装并使用云效扩展。

## 1. 安装

1. 克隆本仓库或下载源码
2. 在仓库根目录执行 `npm install`
3. 在 Raycast 中通过 `Import Extension` 选择本目录完成本地安装；或在 Raycast Store 上架后用 `Install Extension`

## 2. 偏好设置

进入 Raycast → `Manage Extensions` → 找到 **云效** → 填下列字段：

| 字段                     | 必填             | 说明                                                                                                                          |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Personal Access Token`  | 是               | 在 devops.aliyun.com → 个人信息 → 个人访问令牌 中生成。建议至少勾选「项目」「工作项」读权限；多企业用户还需要「组织」读权限。 |
| `Organization Id`        | 是               | 企业标识。devops.aliyun.com 登录后 URL 中 `/organization/<id>/...` 的 `<id>` 段，或在"成员管理"页面查看。                     |
| `接入点`                 | 是               | 下拉选择 `中心版`（默认）或 `Region 版`。中心版对应阿里云 rdc 统一接入层；Region 版用于自部署或非中心地域实例。               |
| `Region 版 API Base URL` | 仅 Region 版必填 | 必须是带主机名的完整 HTTPS URL，例如 `https://devops.cn-hangzhou.aliyuncs.com` 或你公司的 HTTPS 接入地址。中心版无需填写。    |

> 令牌仅在首次创建时返回，请在生成后立即保存。偏好存放在 Raycast 加密存储里，本扩展不会写入仓库文件，也不会上传到云效以外的任何服务。

## 3. 命令清单

| 命令                  | 入口关键字 | 行为                                                                                                              |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `menu`                | `云效`     | 根菜单，分子集（云效入口 / 项目 / 代码 / 测试）                                                                   |
| `yunxiao-entry`       | `云效入口` | 一键直达常用门户，按业务域分组（工作台 / 项目协作 / 测试管理 / 代码管理 / 制品仓库 / 企业管理后台 / 个人设置）    |
| `list-projects`       | `项目列表` | 列出当前 organization 下可访问的项目 → 「查看工作项」子视图（类别筛选 + 本地搜索 + 详情跳转）；同时支持关键字筛选 |
| `list-repositories`   | `代码库`   | 列出当前组织下可访问的代码库，支持名称 / 路径 / 命名空间本地搜索，回车在 Codeup 中打开                            |
| `list-merge-requests` | `合并请求` | 列出合并请求，支持按开启 / 已合并 / 已关闭 状态筛选                                                               |
| `list-test-plans`     | `测试计划` | 直接列出当前组织下所有可见的测试计划；搜索栏右侧下拉可按项目 / 状态进一步过滤，回车在 Testhub 中打开              |

### 3.1 云效入口（`yunxiao-entry`）

按 ⌘ 打开 Raycast → 输入 `云效入口` 进入。List 按业务域分组（工作台 / 项目协作 / 测试管理 / 代码管理 / 制品仓库 /
企业管理后台 / 个人设置），选中条目 → 回车直接打开浏览器；每行都带一个 ⌘⇧ + 字母 的主快捷键：

**工作台**

| 条目   | 主快捷键 | 跳转 URL                      | 备注 |
| ------ | -------- | ----------------------------- | ---- |
| 工作台 | ⌘⇧H      | `devops.aliyun.com/workbench` | -    |

**项目协作**

| 条目             | 主快捷键 | 跳转 URL                                                       | 备注               |
| ---------------- | -------- | -------------------------------------------------------------- | ------------------ |
| 项目协作         | ⌘⇧P      | `devops.aliyun.com/projex/project`                             | -                  |
| 项目协作（个人） | ⌘⇧A      | `devops.aliyun.com/projex/workitem#viewIdentifier=441e17ad...` | 我负责的全部工作项 |

**测试管理**

| 条目     | 主快捷键 | 跳转 URL                         | 备注                  |
| -------- | -------- | -------------------------------- | --------------------- |
| 测试管理 | ⌘⇧T      | `devops.aliyun.com/testhub/repo` | Testhub 仓库 / 用例库 |

**代码管理**

| 条目     | 主快捷键 | 跳转 URL                                              | 备注             |
| -------- | -------- | ----------------------------------------------------- | ---------------- |
| 代码管理 | ⌘⇧C      | `codeup.aliyun.com/`                                  | Codeup 主页      |
| 代码库   | ⌘⇧B      | `codeup.aliyun.com/?navKey=mine`                      | 我参与的代码库   |
| 代码组   | ⌘⇧G      | `codeup.aliyun.com/groups?navKey=mine`                | 我参与的代码组   |
| 合并请求 | ⌘⇧E      | `codeup.aliyun.com/changes?navKey=all&search=created` | 我创建的合并请求 |

**制品仓库**

| 条目     | 主快捷键 | 跳转 URL               | 备注                |
| -------- | -------- | ---------------------- | ------------------- |
| 制品仓库 | ⌘⇧R      | `packages.aliyun.com/` | Packages 私有制品库 |

**企业管理后台**

| 条目         | 主快捷键 | 跳转 URL                                                       | 备注                                                   |
| ------------ | -------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| 企业管理后台 | ⌘⇧M      | `devops.aliyun.com/org-admin/{organization_id}/members/member` | 直接用偏好中的 Organization Id；未配置时提示去偏好设置 |

**个人设置**

| 条目     | 主快捷键 | 跳转 URL                                     | 备注 |
| -------- | -------- | -------------------------------------------- | ---- |
| 个人设置 | ⌘⇧S      | `account-devops.aliyun.com/settings/profile` | -    |

> 这些 URL 走浏览器登录态，与本扩展的 PAT 无关；如果在浏览器未登录云效则会被 SSO 重定向。

### 3.2 项目列表操作（`list-projects`）

进入 `项目列表`
后，按回车（或主动作「查看工作项」）会直接打开该项目的工作项列表子视图，不再经过二次提交表单。列表顶部类别下拉包含「全部、需求、缺陷、任务、风险、原始诉求、主题」；搜索会在本地匹配工作项标题、编号、类别原值及中文名、负责人和状态，不会发起额外
API 请求。

工作项的「在云效中打开」动作只在项目 ID、工作项 ID 与已知类别都完整时显示，使用 canonical URL：
`https://devops.aliyun.com/projex/project/{project_id}/{type}/{workitem_id}`。其中 `type` 严格对应 `req`、`bug`、`task`、`
risk`、`request`、`topic`。

选中任意项目行 → ActionPanel 展开项目操作，所有项目直达 URL 绑定快捷键：

| 操作             | 快捷键 | 跳转 URL                                                                          |
| ---------------- | ------ | --------------------------------------------------------------------------------- |
| 所有工作项       | ⌘⇧A    | `/projex/project/{project_id}/workitem#viewIdentifier=b3d95a58f1270afe4d4c7ae746` |
| 访问迭代 Backlog | ⌘⇧S    | `/projex/project/{project_id}/sprint/backlog`                                     |
| 访问测试计划     | ⌘⇧P    | `/projex/project/{project_id}/testplan`                                           |
| 概览             | ⌘⇧V    | `/projex/project/{project_id}`                                                    |
| 查看需求         | ⌘⇧R    | `/projex/project/{project_id}/req`                                                |
| 查看任务         | ⌘⇧T    | `/projex/project/{project_id}/task`                                               |
| 查看缺陷         | ⌘⇧B    | `/projex/project/{project_id}/bug`                                                |
| 查看主题         | ⌘⇧Z    | `/projex/project/{project_id}/topic`                                              |
| 查看原始诉求     | ⌘⇧O    | `/projex/project/{project_id}/request`                                            |

需要先拉取列表再二次跳转的：

| 操作         | 快捷键 | 行为                                         |
| ------------ | ------ | -------------------------------------------- |
| 查看迭代     | ⌘⇧⌥S   | 拉取该项目迭代列表 → 选迭代 → 浏览器打开     |
| 查看测试计划 | ⌘⇧⌥T   | 拉取该项目测试计划列表 → 选计划 → 浏览器打开 |

> `list-projects` 内部 ⌘⇧P（访问测试计划）和 `yunxiao-entry` 内部 ⌘⇧P（项目协作）按命令域独立，无冲突。

### 3.3 代码管理（`list-repositories` / `list-merge-requests`）

代码管理命令目前是两个顶层列表命令：

- `list-repositories`：列出当前 organization 下可访问的代码库，按名称 / 路径 / 命名空间本地搜索，回车可在 Codeup 浏览器中打开。
- `list-merge-requests`：列出合并请求，搜索栏右侧带状态下拉，可切换「开启 / 已合并 / 已关闭」，默认 `opened`
  ；切换会立即重新拉取对应状态的合并请求（与官方 `ListChangeRequests` 的 `state` 参数对应），搜索框 placeholder 与节标题也会随之更新。

`list-repositories` 与 `list-merge-requests` 内部都按页加载所有可见结果（每页 100 条，最多 150 页以避免无界拉取）。Codeup
浏览器快速入口（代码库 / 代码组 / 合并请求）已迁移到 `yunxiao-entry` 的「代码管理」分组。

Codeup 浏览器快速入口（已迁移到 `yunxiao-entry` 的「代码管理」分组）：

| 入口     | 主快捷键 | URL                                                           |
| -------- | -------- | ------------------------------------------------------------- |
| 代码库   | ⌘⇧B      | `https://codeup.aliyun.com/?navKey=mine`                      |
| 代码组   | ⌘⇧G      | `https://codeup.aliyun.com/groups?navKey=mine`                |
| 合并请求 | ⌘⇧E      | `https://codeup.aliyun.com/changes?navKey=all&search=created` |

### 3.4 测试计划（`list-test-plans`）

进入 `测试计划` 命令后直接显示当前组织下所有可见的测试计划， **项目**作为搜索栏右侧下拉中的可选项（默认 `全部项目`）：

- 项目过滤：搜索栏右侧下拉的 `项目 · 状态` 组合里，第一段是项目（默认 `全部项目`）；选中项目后只拉取该项目的测试计划（请求中带
  `projectIdentifier`）。项目下拉内容来源于 `listProjects`，加载失败时只影响项目名显示，列表本身仍可正常按状态过滤。
- 状态过滤：同一组合下拉的第二段；全部 / 未开始（TODO）/ 进行中（DOING）/ 已完成（DONE）；切换会按官方 ListTestPlan 的 `status`
  查询参数重新拉取。
- 搜索覆盖计划名、计划 ID、状态原值、状态中文、负责人 ID、项目 ID 与项目名（解析自下拉里的项目），大小写不敏感。
- 选中计划 → 「在 Testhub 中打开」跳转到 `https://devops.aliyun.com/testhub/plan/{plan_id}/dashboard`；「复制计划 ID」把 `
testPlanIdentifier` 写入剪贴板。
- 底层走 `POST /oapi/v1/projex/organizations/{orgId}/testPlan/list`（Region 版去掉 `organizations/{orgId}/` 段），参数通过
  query 传递：`page`、`perPage`、`projectIdentifier`、`sprintIdentifier?`、`status?`、`name?`。分页信息通过响应头 `x-page` /
  `x-per-page` / `x-total` / `x-next-page` / `x-total-pages` 携带；本命令一次拉一页（默认 `perPage=200`，官方上限 1000）。

## 4. 接入点选哪个

- **中心版（默认）**：你登录的 devops.aliyun.com 是中心组织（统一多地域），保持默认即可。底层走
  `https://openapi-rdc.aliyuncs.com`，鉴权 `x-yunxiao-token: <PAT>`。
- **Region 版**：你的组织部署在某个地域（如 `cn-hangzhou`）或自建实例，需要在偏好里切换"接入点 = Region 版"，并填入对应的
  `Region 版 API Base URL`。该地址必须是带主机名的完整 HTTPS URL；Region 版的请求 path 不带
  `organizations/{organizationId}/` 段。

## 5. 故障排查

如果「项目列表」加载失败：

1. 选中空白项 → 按 **⌘⇧C** 复制"错误详情"
2. 看到的状态码与含义：

    | 状态                         | 含义                                               | 修法                                     |
    | ---------------------------- | -------------------------------------------------- | ---------------------------------------- |
    | `401 Invalid token`          | PAT 无效 / 过期 / 复制时漏字符                     | 重发令牌并更新偏好                       |
    | `404 InvalidAction.NotFound` | 接入点选错：Region 版的 URL 填了中心版地址，或反之 | 在偏好里切换接入点 / 修正 Region URL     |
    | `403 Operate.NoPermission`   | PAT 没勾选「项目协作 / 项目 / 读」                 | 重发令牌并勾上                           |
    | 网络层错误 `fetch failed`    | DNS / TLS / 路由不可达                             | 切换网络、确认 host 可解析、检查代理设置 |

3. 也可以选 **复制请求 URL 模板**，拿到 curl 命令手动验证：

    ```bash
    curl -X POST 'https://openapi-rdc.aliyuncs.com/oapi/v1/projex/organizations/<你的 orgId>/projects:search' \
      -H 'x-yunxiao-token: <你的 PAT>' \
      -H 'Content-Type: application/json' \
      -d '{"page":1,"perPage":50,"orderBy":"gmtCreate","sort":"desc"}'
    ```

## 6. 隐私

- 错误信息里只打印 baseUrl / mode / organizationId / status / response body， **绝不打印 token**。
- 偏好修改不需要重启 Raycast；扩展内部缓存的凭证在每次请求前重新读取。
- 本扩展不会写入任何仓库文件，也不会在云端保存你的查询结果。
