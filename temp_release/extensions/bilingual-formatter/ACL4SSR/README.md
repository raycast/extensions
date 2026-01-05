# SSR去广告规则/GFWList规则/Clash规则碎片

* 项目基于CC-BY-SA-4.0协议发布  [![CC-BY-SA-4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh)
* 仅推荐未root的安卓手机使用。
* Telegram频道订阅地址：**[https://t.me/ACL4SSR](https://t.me/ACL4SSR)**
* [关于中国的互联网](https://github.com/ACL4SSR/ACL4SSR/wiki/关于中国的互联网)
  
# 安卓 SSR 去广告ACL规则
  * 屏蔽小米手机和魅族flyme rom系统广告
  * 国内网站均直接连接
  * 屏蔽常用视频网站广告
  * 屏蔽常用网站广告、其他流媒体网站广告
  * 屏蔽部分应用程序开屏广告
  * 屏蔽部分运营商劫持网页弹出的漂浮球广告、流量统计
  * 拦截常用应用程序的隐私跟踪、行为分析、数据统计



# 版本解释

## SSR直接可用的规则

文件               | 默认  | 去广告  | 局域网 |   国内IP段  |   国内域名    |     国外
----              | ----  |  ----  | ----  |   ----     |     ----     |    ----
[banAD.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/banAD.acl)         |  代理  |   是   |  直连  |    有-直连  | 常用域名-直连  |  代理-常用国外域名增强
[onlybanAD.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/onlybanAD.acl)     |  代理  |   是   |  直连  |    无      |    无         |  代理-常用国外域名增强
[nobanAD.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/nobanAD.acl)       |  代理  |   否   |  直连  |    有-直连  |  常用域名-直连 |  全局代理
[backcn-banAD.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/backcn-banAD.acl)  |  代理  |   是   |  直连  |    有-代理  |    无         | 直连-gfwlist列表 
[gfwlist-banAD.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/gfwlist-banAD.acl) |  直连  |   是   |  直连  |    无      |    无         |  代理-gfwlist列表
[fullgfwlist.acl](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/fullgfwlist.acl )   |  直连  |   否   |  直连  |    无      |    无         |  代理-gfwlist列表
[gfwlist-user.rule](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Acl/gfwlist-user.rule) |  直连  |   是   |  直连  |    无      |     无        |  代理-gfwlist列表



## 其他规则转换 clash Quantumul Surge Surfboard Trojan

​	前后端都是开源的，自己随便搭建。自建的话，只自建后端已经足够

前端：[sub-web]( https://github.com/CareyWang/sub-web)

后端：[subconverter](https://github.com/tindy2013/subconverter/blob/master/README-cn.md) 

**支持类型**

| 类型                         | 作为源类型 | 作为目标类型 | 参数                |
| ---------------------------- | :--------: | :----------: | ------------------- |
| Clash                        |     ✓      |      ✓       | clash               |
| ClashR                       |     ✓      |      ✓       | clashr              |
| Quantumult (完整配置)        |     ✓      |      ✓       | quan                |
| Quantumult X (完整配置)      |     ✓      |      ✓       | quanx               |
| Loon                         |     ✓      |      ✓       | loon                |
| Mellow                       |     ✓      |      ✓       | mellow              |
| SS (SIP002)                  |     ✓      |      ✓       | ss                  |
| SS (软件订阅)                |     ✓      |      ✓       | sssub               |
| SSD                          |     ✓      |      ✓       | ssd                 |
| SSR                          |     ✓      |      ✓       | ssr                 |
| Surfboard                    |     ✓      |      ✓       | surfboard           |
| Surge 2                      |     ✓      |      ✓       | surge&ver=2         |
| Surge 3                      |     ✓      |      ✓       | surge&ver=3         |
| Surge 4                      |     ✓      |      ✓       | surge&ver=4         |
| Trojan                       |     ✓      |      ✓       | trojan              |
| V2Ray                        |     ✓      |      ✓       | v2ray               |
| 类 TG 代理的 HTTP/Socks 链接 |     ✓      |      ×       | 仅支持 `&url=` 调用 |



## Clash规则碎片

主要文件在clash文件夹下，只是一些规则碎片，可以配合一些订阅转换进行使用。

具体怎么使用需要看对应软件配置是怎么写的，还要请大家阅读你所使用的软件文档，看是否能使用

示例：项目里/Clash/config/目录下存放的是 [subconverter](https://github.com/tindy2013/subconverter/blob/master/README-cn.md#外部配置)的 配置示例

| 文件                   | 类型                 | 解释                                                         |
| ---------------------- | -------------------- | ------------------------------------------------------------ |
| BanAD.list             | 规则碎片-去广告      | 只包含常见广告关键字、广告联盟。无副作用，放心使用           |
| BanProgramAD.list      | 规则碎片-去广告      | 包含常用应用的各种去广告规则。可能有轻微副作用，可放心使用。（如果网站功能和广告冲突，会删掉去广告规则） |
| BanEasyListChina.list  | 规则碎片-去广告      | AdblockPlus中的中国所有的屏蔽域名                            |
| LocalAreaNetwork.list  | 规则碎片-直连        | 本地地址和路由器直连域名啥的                                 |
| ChinaDomain.list       | 规则碎片-直连        | 国内常见域名、直连CDN等。（很全，常用网址都有）              |
| ChinaCompanyIp.list    | 规则碎片-直连        | 国内BAT公司及云服务厂商的IP段。所有在该云服务上的网站都可以直连。比如你网站在阿里云香港都可以直连。 |
| ChinaIp.list           | 规则碎片-直连        | IPIP的国内地址段。比GeoIp更好。电脑性能好，可以引入          |
| Download.list          | 规则碎片-直连        | 一些下载用的域名                                             |
| Apple.list             | 规则碎片             | 苹果公司的所有域名                                           |
| Microsoft.list         | 规则碎片             | 微软公司的所有域名                                           |
| OneDrive.list          | 规则碎片             | OneDrive                                                     |
| GoogleCN.list          | 规则碎片-直连        | 谷歌在中国能直连的网址列表                                   |
| Telegram.list          | 规则碎片-代理        | Telegram的所有域名                                           |
| Netflix.list           | 规则碎片-代理        | Netflix的所有域名                                            |
| ProxyGFWlist.list      | 规则碎片-代理        | GFW的全量列表                                                |
| ProxyLite.list         | 规则碎片-代理        | 比较精简的代理列表，包含常用的，以及被污染的域名             |
| GeneralClashConfig.yml | clash配置文件        | 放行一堆国内的常用域名，配合系统代理更牛逼。 配置很全，自带中文注释。可以自行使用 |
| pref.ini               | subconverter配置文件 | 更改了一些基础配置，将规则变成ACL4SSR                        |



# ♻️ SS/SSR ACL Files Download：
* ACL更新地址（**白名单**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/banAD.acl
* ACL更新地址（**黑名单**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/gfwlist-banAD.acl
* ACL更新地址（**全局**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/onlybanAD.acl
* ACL更新地址（**仅GFWList**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/fullgfwlist.acl （原版SS**能且仅能**使用此规则）
* ACL更新地址（**国内代理**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/backcn-banAD.acl
* ACL更新地址（**白名单，无去广告**）：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/nobanAD.acl
* SSR C# GFWList user.rule ：https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/gfwlist-user.rule


# Root手机推荐：
* 1.自带去广告的VIA浏览器 http://www.coolapk.com/apk/mark.via
* 2.HOSTS 广告快走中国版 http://www.coolapk.com/apk/mark.via
* 3.HOSTS 广告快走开AdAway http://www.coolapk.com/apk/org.adaway
* https://github.com/neko-dev/neohosts
* Google Hosts 请移步 https://github.com/googlehosts/hosts


# 注：

* 浏览器内部广告太多了，单凭几百条规则可能过滤不过来。少许遗漏，请谅解

* 有问题请发issue,说明状况和所用规则。

# License		
[![](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh)
* CC-BY-SA-4.0
