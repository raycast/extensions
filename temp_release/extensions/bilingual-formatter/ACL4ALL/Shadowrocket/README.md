# Shadowrocket 配置与模块

适用于 iOS 的 Shadowrocket 配置文件、模块与脚本。

## 📁 目录结构

```
Shadowrocket/
├── config/          # 配置文件
│   ├── lazy_group.conf        # 基础版
│   └── lazy_group_4me.conf    # 定制版
├── modules/         # .sgmodule 模块
│   └── VVeboFix4Shadowrocket.sgmodule
└── scripts/         # 脚本
    └── vvebo-combined.js
```

## 🚀 使用方式

### 导入配置

Shadowrocket → 配置 → 添加配置 → URL

```
https://testingcf.jsdelivr.net/gh/whjstc/ACL4ALL@main/Shadowrocket/config/lazy_group_4me.conf
```

### 导入模块

Shadowrocket → 模块 → + → 远程 → 粘贴模块地址

```
https://raw.githubusercontent.com/whjstc/ACL4ALL/main/Shadowrocket/modules/VVeboFix4Shadowrocket.sgmodule
```

## 🔧 VVebo 修复模块

- 修复用户主页时间线显示
- 净化粉丝列表（移除"感兴趣的人"推荐）
- 需开启：重写、脚本、HTTPS 解密（MITM）

## ⚠️ 安全提示

- 不要提交包含订阅链接或节点信息的配置文件
- 公开仓库仅包含规则和模板