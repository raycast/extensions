/**
 * 云效入口（yunxiao-entry）。
 *
 * 按业务域分组的常用门户跳转：
 *   - 工作台 / 项目协作 / 项目协作(个人工作项) / 测试管理 /
 *     代码管理（Codeup 主页 + 三个快速入口） / 制品仓库 /
 *     企业管理后台 / 个人设置
 *
 * 绝大多数是静态深链，直接 Action.OpenInBrowser；
 * 「企业管理后台」URL 含 {organization_id}，从偏好读取：
 *   - 已配置 Organization Id 时直接生成完整 URL；
 *   - 未配置时该项主动作改为 toast 提示设置 Organization Id。
 *
 * 设计上尽量不依赖网络：除「企业管理后台」之外，其他条目无网络请求，
 * PAT 凭证缺失也不会阻塞（这些链接走浏览器登录态）。
 */

import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { organizationAdminUrl } from "./utils/urls";

const BASE = "https://devops.aliyun.com";

/** 跳到 devops 测试/制品等其它子域的根 */
const CODEUP_ROOT = "https://codeup.aliyun.com/";
const PACKAGES_ROOT = "https://packages.aliyun.com/";
const ACCOUNT_ROOT = "https://account-devops.aliyun.com";

/** 「个人工作项」视图的 viewIdentifier（云效固定值，从官方页面 URL 复制） */
const PERSONAL_WORKITEM_VIEW_ID = "441e17ad4f72718076eedcf5";

interface OrgAdminPreferences {
    organizationId?: string;
}

type SectionId = "workbench" | "projex" | "test" | "codeup" | "packages" | "admin" | "settings";

interface PortalItem {
    id: string;
    /** 业务域分组，决定该条目渲染到哪个 List.Section */
    section: SectionId;
    title: string;
    subtitle: string;
    /** 静态 URL；不可用时为 null */
    url: string | null;
    /** 列表项主快捷键（可选，未填则在 ActionPanel 里不带快捷键） */
    shortcut?: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };
    /** URL 不可用时 toast 文案；缺省表示 URL 永远可用 */
    unavailableMessage?: string;
}

/** 「企业管理后台」依赖偏好里的 Organization Id */
const ORGANIZATION_ID = (getPreferenceValues<OrgAdminPreferences>().organizationId ?? "").trim();

const ORG_ADMIN_UNAVAILABLE = "缺少 Organization Id，请在扩展偏好中设置后再试。";
const ORG_ADMIN_SUBTITLE_READY = "Members / Permissions";
const ORG_ADMIN_SUBTITLE_MISSING = "请先在扩展偏好中设置 Organization Id";

const PORTAL_ITEMS: PortalItem[] = [
    // 工作台
    {
        id: "workbench",
        section: "workbench",
        title: "工作台",
        subtitle: "Todos / Recent Access",
        url: `${BASE}/workbench`,
        shortcut: { modifiers: ["cmd", "shift"], key: "h" },
    },

    // 项目协作
    {
        id: "projex",
        section: "workbench",
        title: "项目",
        subtitle: "My Projects",
        url: `${BASE}/projex/project`,
        shortcut: { modifiers: ["cmd", "shift"], key: "p" },
    },
    {
        id: "projex-mine",
        section: "workbench",
        title: "工作项",
        subtitle: "All My Active Work Items",
        url: `${BASE}/projex/workitem#viewIdentifier=${PERSONAL_WORKITEM_VIEW_ID}`,
        shortcut: { modifiers: ["cmd", "shift"], key: "a" },
    },

    // 测试管理
    {
        id: "testhub",
        section: "projex",
        title: "测试管理",
        subtitle: "Testhub / Testcases",
        url: `${BASE}/testhub/repo`,
        shortcut: { modifiers: ["cmd", "shift"], key: "t" },
    },

    // 代码管理（Codeup）：主页 + 三个快速入口
    {
        id: "codeup",
        section: "projex",
        title: "代码仓库",
        subtitle: "Codeup Repo Homepage",
        url: CODEUP_ROOT,
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
    },
    // 制品仓库
    {
        id: "packages",
        section: "projex",
        title: "制品库",
        subtitle: "Packages",
        url: PACKAGES_ROOT,
        shortcut: { modifiers: ["cmd", "shift"], key: "r" },
    },

    // 企业管理后台
    {
        id: "org-admin",
        section: "settings",
        title: "企业管理后台",
        subtitle: ORGANIZATION_ID ? ORG_ADMIN_SUBTITLE_READY : ORG_ADMIN_SUBTITLE_MISSING,
        url: ORGANIZATION_ID ? organizationAdminUrl(ORGANIZATION_ID) : null,
        unavailableMessage: ORG_ADMIN_UNAVAILABLE,
        shortcut: { modifiers: ["cmd", "shift"], key: "m" },
    },

    // 个人设置
    {
        id: "personal-settings",
        section: "settings",
        title: "个人设置",
        subtitle: "PAT / User Settings / Avatar",
        url: `${ACCOUNT_ROOT}/settings/profile`,
        shortcut: { modifiers: ["cmd", "shift"], key: "s" },
    },
];

/** 业务域分组的渲染顺序与中文标题 */
const SECTION_LAYOUT: { id: SectionId; title: string }[] = [
    { id: "workbench", title: "Workbench" },
    { id: "projex", title: "Projects" },
    { id: "settings", title: "Settings" },
];

/* ---------- 主命令 ---------- */

export default function YunxiaoEntry() {
    function showUnavailable(item: PortalItem) {
        void showToast({
            style: Toast.Style.Failure,
            title: "无法跳转",
            message: item.unavailableMessage ?? "没有可用的链接。",
        });
    }

    return (
        <List searchBarPlaceholder="搜索云效入口…">
            {SECTION_LAYOUT.map((section) => {
                const sectionItems = PORTAL_ITEMS.filter((item) => item.section === section.id);
                if (sectionItems.length === 0) return null;
                return (
                    <List.Section key={section.id} title={section.title}>
                        {sectionItems.map((item) => {
                            const resolvedUrl = item.url;
                            return (
                                <List.Item
                                    key={item.id}
                                    icon={Icon.Globe}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    actions={
                                        <ActionPanel>
                                            {resolvedUrl ? (
                                                <Action.OpenInBrowser
                                                    title={item.title}
                                                    url={resolvedUrl}
                                                    {...(item.shortcut ? { shortcut: item.shortcut } : {})}
                                                />
                                            ) : (
                                                <Action
                                                    title={item.title}
                                                    icon={Icon.Globe}
                                                    {...(item.shortcut ? { shortcut: item.shortcut } : {})}
                                                    onAction={() => showUnavailable(item)}
                                                />
                                            )}
                                            <Action.CopyToClipboard
                                                title="复制链接"
                                                content={
                                                    resolvedUrl ?? `${BASE}/org-admin/{organization_id}/members/member`
                                                }
                                            />
                                        </ActionPanel>
                                    }
                                />
                            );
                        })}
                    </List.Section>
                );
            })}
        </List>
    );
}
