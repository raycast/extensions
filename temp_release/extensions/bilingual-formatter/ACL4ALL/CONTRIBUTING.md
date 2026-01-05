# 开发指南

## 📝 规则文件工作流程

### 重要说明

- ✅ **只维护 `.list` 文件** - 这是源文件
- 🤖 **`.yaml` 文件自动生成** - 由 GitHub Actions 自动创建
- 🚫 **YAML 已被 gitignore** - 本地不需要提交

### 推荐流程

```bash
# 1. 修改 .list 源文件
vim rulesets/custom/direct.list

# 2. （可选）验证配置
python3 scripts/validate_config.py

# 3. 只提交 .list 文件
git add rulesets/custom/*.list
git add subconverter/advanced.ini  # 如果有修改
git add clash/meta-template.yaml   # 如果有修改

# 4. 提交并推送
git commit -m "feat: 更新规则"
git push

# 5. GitHub Actions 自动生成 YAML
# ✅ 自动检测 .list 变化
# ✅ 自动生成 .yaml 文件
# ✅ 自动提交到仓库
```

### 本地预览（可选）

如果想在推送前查看 YAML 效果：

```bash
# 生成 YAML（不会被 git 追踪）
node scripts/list2yaml.js

# 查看效果
cat rulesets/custom/direct.yaml

# 验证配置
python3 scripts/validate_config.py
```

### 文件说明

| 文件 | 状态 | 说明 |
|------|------|------|
| `*.list` | ✅ Git 追踪 | 源文件，手动维护 |
| `*.yaml` | 🚫 已 ignore | 自动生成，不提交 |
| `advanced.ini` | ✅ Git 追踪 | Subconverter 配置 |
| `meta-template.yaml` | ✅ Git 追踪 | Clash Meta 模板 |

### GitHub Actions

工作流 `.github/workflows/convert-rules.yml`:
- 触发条件: 推送 `*.list` 文件到 main 分支
- 功能: 自动将 `.list` 转换为 `.yaml`
- 提交信息: `chore: auto-convert LIST to YAML [skip ci]`

### 配置验证

推送前建议运行：

```bash
python3 scripts/validate_config.py
```

检测内容：
- ✅ INI/YAML 格式错误
- ✅ 策略组定义正确性
- ✅ 配置文件一致性
