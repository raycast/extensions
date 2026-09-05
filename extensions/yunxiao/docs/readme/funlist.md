# 功能清单

## 基础能力

**配置**

- PAT
- 组织 ID
- 接入点
- 接入点 URL

**Icon**

- 测试管理 : assets/testhub.png
- 制品仓库 : assets/packages.png
- 我的云效 : assets/my.png
- 企业管理后台 : assets/org-admin.png

## 云效入口

### 资料

- icon : assets/icon.svg

### Sections

**「Section 1」工作台**

- [x] 工作台 (cmd + shift + h) : https://devops.aliyun.com/workbench

**「Section 2」项目协作**

- [x] 项目协作 (cmd + shift + p) : https://devops.aliyun.com/projex/project
- [x] 项目协作（个人工作项）(cmd + shift + a) : https://devops.aliyun.com/projex/workitem#viewIdentifier=441e17ad4f72718076eedcf5

**「Section 3」测试管理**

- [x] 测试管理 (cmd + shift + t) : https://devops.aliyun.com/testhub/repo

**「Section 4」代码管理**

- [x] 代码管理 (cmd + shift + c) : https://codeup.aliyun.com/
- [x] 代码库 (cmd + shift + b) : https://codeup.aliyun.com/?navKey=mine
- [x] 代码组 (cmd + shift + g) : https://codeup.aliyun.com/groups?navKey=mine
- [x] 合并请求 (cmd + shift + e) : https://codeup.aliyun.com/changes?navKey=all&search=created

**「Section 5」制品仓库**

- [x] 制品仓库 (cmd + shift + r) : https://packages.aliyun.com/

**「Section 6」企业管理后台**

- [x] 企业管理后台 (cmd + shift + m) : https://devops.aliyun.com/org-admin/{organization_id}/members/member

**「Section 7」个人设置**

- [x] 个人设置 (cmd + shift + s) : https://account-devops.aliyun.com/settings/profile

## 项目协作

### 资料

- icon : assets/project.svg

### Sections

**「Section 1」我的项目**

- [x] 负责的工作项 ⌘⇧A → https://devops.aliyun.com/projex/workitem
- [x] 参与的项目 ⌘⇧P → https://devops.aliyun.com/projex/project

**「Section 2」项目列表**

- [x] 列出项目 / 支持名称搜索(本地过滤)
    - [x] 回车 -> 进入项目工作项清单, 筛选项内容是(全部 / 任务 / 需求...)
        - [x] 选中工作项（回车）-> https://devops.aliyun.com/projex/project/{project_id}/{type}/{workitem_id}
- [x] 操作
    - [x] 所有工作项(cmd+shift+a) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/workitem#viewIdentifier=b3d95a58f1270afe4d4c7ae746
    - [x] 查看迭代(cmd+shift+alt+s) -> 查询所有迭代列表, 迭代id 是 {sprint_id}
        - [x] 访问{迭代名称}(回车) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/sprint/{sprint_id}
    - [x] 访问迭代(cmd+shift+s) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/sprint/backlog
    - [x] 查看测试计划(cmd+shift+alt+t) -> 查询所有测试计划, 计划id 是 {plan_id}
        - [x] 访问{测试计划}(回车) -> 访问Url : https://devops.aliyun.com/testhub/plan/{plan_id}/dashboard
    - [x] 访问测试计划(cmd+shift+p) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/testplan
    - [x] 概览(cmd+shift+v) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}
    - [x] 查看需求(cmd+shift+r) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/req
    - [x] 查看任务(cmd+shift+t) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/task
    - [x] 查看缺陷(cmd+shift+b) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/bug
    - [x] 查看主题(cmd+shift+z) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/topic
    - [x] 查看原始诉求(cmd+shift+o) -> 访问Url : https://devops.aliyun.com/projex/project/{project_id}/request

## 代码管理

### 资料

- icon : assets/codeup.png

### 顶层命令

- [x] 代码库 (`list-repositories`) : 列出我参与的所有代码库，支持本地搜索 + 回车跳转
- [x] 合并请求 (`list-merge-requests`) : 列出合并请求，支持按开启 / 已合并 / 已关闭 状态筛选

> Codeup 浏览器快速入口（代码库 / 代码组 / 合并请求）已迁移到 `yunxiao-entry` 的「代码管理」分组，避免重复入口。

## 测试管理

### 资料

- icon : assets/testhub.png

### 顶层命令

- [x] 测试计划 (`list-test-plans`) : 进入命令后直接列出当前组织所有可见测试计划；搜索栏右侧 `项目 · 状态` 组合下拉可按项目 / TODO / DOING / DONE 进一步过滤；回车在 Testhub 中打开 `https://devops.aliyun.com/testhub/plan/{plan_id}/dashboard`；附「复制计划 ID」动作。

### Sections

**「Section 1」按状态分组**

- [x] 测试计划列表（`项目 · 状态` 组合下拉：项目过滤默认 `全部项目`；状态过滤：全部 / TODO / DOING / DONE / 本地搜索：名称、ID、状态原值、状态中文、负责人 ID、项目 ID、项目名）
- [x] 操作：在 Testhub 中打开、复制计划 ID

**「Section 2」项目列表内嵌入口（`list-projects`）**

- [x] 查看测试计划(cmd+shift+alt+t) -> 查询所有测试计划, 计划id 是 {plan_id}
    - [x] 访问{测试计划}(回车) -> 访问Url : https://devops.aliyun.com/testhub/plan/{plan_id}/dashboard
