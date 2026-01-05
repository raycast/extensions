# Git 提交压缩操作指南

> 记录如何压缩最近一段时间内特定类型的 Git 提交

## 场景

当你频繁添加域名到规则文件时，会产生大量琐碎的提交，如：
- `add: domain1.com`
- `add: domain2.com`
- `add: domain3.com`

这些提交可以定期压缩成一个有意义的提交，保持 Git 历史清晰。

---

## 方法：交互式 Rebase + 手动筛选

### 步骤 1：查看最近 N 天的提交

```bash
# 查看最近 10 天的提交（带日期）
git log --since="10 days ago" --oneline --date=short --pretty=format:"%h %ad %s"
```

**输出示例：**
```
abc123 2024-12-10 add: domain1.com
def456 2024-12-09 add: domain2.com
ghi789 2024-12-08 fix: 修复 bug
jkl012 2024-12-07 add: domain3.com
mno345 2024-12-06 feat: 新功能
```

### 步骤 2：筛选特定类型的提交

```bash
# 查找包含 "add" 关键词的提交
git log --since="10 days ago" --oneline --grep="add"

# 查找修改了特定文件的提交
git log --since="10 days ago" --oneline -- rulesets/custom/direct.list

# 组合条件：包含关键词 AND 修改了特定文件
git log --since="10 days ago" --oneline --grep="add" -- rulesets/custom/direct.list
```

### 步骤 3：找到时间范围内的第一个提交

```bash
# 找到 10 天前的第一个提交（最旧的）
FIRST_COMMIT=$(git log --since="10 days ago" --reverse --oneline | head -1 | cut -d' ' -f1)

# 查看找到的提交
echo $FIRST_COMMIT
```

### 步骤 4：开始交互式 Rebase

```bash
# 从第一个提交的父提交开始 rebase
git rebase -i $FIRST_COMMIT^

# 或者手动指定提交哈希
git rebase -i abc123^
```

### 步骤 5：在编辑器中标记要合并的提交

编辑器会打开，显示类似内容：

```bash
pick abc123 add: domain1.com
pick def456 add: domain2.com
pick ghi789 fix: 修复 bug
pick jkl012 add: domain3.com
pick mno345 feat: 新功能
```

**修改为：**

```bash
pick abc123 add: domain1.com
squash def456 add: domain2.com   # 改为 squash 或 s
pick ghi789 fix: 修复 bug
squash jkl012 add: domain3.com   # 改为 squash 或 s
pick mno345 feat: 新功能
```

**说明：**
- `pick`（p）：保留这个提交
- `squash`（s）：合并到上一个 pick 的提交
- `reword`（r）：保留提交但修改提交信息
- `drop`（d）：删除这个提交

### 步骤 6：编辑合并后的提交信息

保存后，Git 会让你编辑合并后的提交信息：

```
# This is a combination of 3 commits.
# This is the 1st commit message:

add: domain1.com

# This is the commit message #2:

add: domain2.com

# This is the commit message #3:

add: domain3.com
```

**修改为更有意义的信息：**

```
feat(direct): 本周新增直连域名

- domain1.com
- domain2.com
- domain3.com

共计 3 个域名
```

### 步骤 7：推送到远程

```bash
# 使用 --force-with-lease 安全地强制推送
git push --force-with-lease

# 或者如果你确定没有其他人在使用这个分支
git push --force
```

---

## ⚠️ 重要注意事项

### 1. 何时可以修改历史？

✅ **可以修改：**
- 你自己的功能分支
- 还没有被其他人拉取的提交
- 个人项目的 main 分支（只有你一个人使用）

❌ **不要修改：**
- 已经被其他人拉取的公共分支
- 团队协作的 main/master 分支
- 已发布的版本标签

### 2. --force-with-lease vs --force

```bash
# 推荐：更安全，只在远程没有新提交时才强制推送
git push --force-with-lease

# 危险：无论如何都强制推送，可能覆盖别人的提交
git push --force
```

### 3. 撤销 Rebase（如果出错）

```bash
# 查看 reflog 找到 rebase 前的提交
git reflog

# 重置到 rebase 前的状态
git reset --hard HEAD@{n}  # n 是 reflog 中的编号
```

---

## 🎯 实用技巧

### 技巧 1：按提交信息格式筛选

```bash
# 查找以 "add:" 开头的提交
git log --since="10 days ago" --oneline --grep="^add:"

# 查找包含 "DOMAIN-SUFFIX" 的提交
git log --since="10 days ago" --oneline -S "DOMAIN-SUFFIX"
```

### 技巧 2：预览 Rebase 影响范围

```bash
# 查看将要 rebase 的提交数量
git log --oneline $FIRST_COMMIT^..HEAD | wc -l

# 查看详细的提交列表
git log --oneline $FIRST_COMMIT^..HEAD
```

### 技巧 3：使用 Git Alias 简化操作

在 `~/.gitconfig` 中添加：

```ini
[alias]
    # 查找最近 N 天的提交
    recent = "!f() { git log --since=\"${1:-7} days ago\" --oneline --date=short --pretty=format:\"%h %ad %s\"; }; f"

    # 交互式 rebase 最近 N 天
    rebase-days = "!f() { \
        DAYS=${1:-10}; \
        FIRST=$(git log --since=\"$DAYS days ago\" --reverse --oneline | head -1 | cut -d' ' -f1); \
        [ -n \"$FIRST\" ] && git rebase -i $FIRST^ || echo \"No commits found\"; \
    }; f"
```

使用方式：

```bash
# 查看最近 7 天的提交
git recent 7

# 交互式 rebase 最近 10 天的提交
git rebase-days 10
```

---

## 📝 完整示例

```bash
# 1. 查看最近 10 天的提交
git log --since="10 days ago" --oneline

# 2. 筛选出 "add" 相关的提交
git log --since="10 days ago" --oneline --grep="add"

# 3. 找到第一个提交（假设是 abc123）
FIRST_COMMIT=$(git log --since="10 days ago" --reverse --oneline | head -1 | cut -d' ' -f1)

# 4. 开始 rebase
git rebase -i $FIRST_COMMIT^

# 5. 在编辑器中标记要合并的提交（把 pick 改为 squash）

# 6. 编辑合并后的提交信息

# 7. 推送
git push --force-with-lease
```

---

## 🔗 相关资源

- [Git Rebase 官方文档](https://git-scm.com/docs/git-rebase)
- [Git Reflog 官方文档](https://git-scm.com/docs/git-reflog)
- [交互式 Rebase 教程](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

---

**最后更新：** 2024-12-12
