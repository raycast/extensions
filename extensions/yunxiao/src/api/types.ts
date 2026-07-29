/**
 * 云效 OpenAPI 共享类型定义。
 *
 * 官方文档：https://help.aliyun.com/document_detail/460575.html
 */

/** 工作项的大类型。官方取值：Req/Bug/Task/Risk/Request/Topic。 */
export type WorkitemCategory = "Req" | "Bug" | "Task" | "Risk" | "Request" | "Topic";

/** 全部类别数组，便于在 UI 中下拉枚举。 */
export const WORKITEM_CATEGORIES: WorkitemCategory[] = ["Req", "Bug", "Task", "Risk", "Request", "Topic"];

export interface Project {
    id: string;
    /** 项目名 */
    name?: string;
    /** 项目标识，例如 PROJ */
    identifier?: string;
    /** 项目可见性。文档约定：private/public */
    visibility?: "private" | "public" | string;
    /** 项目图标 URL，可选 */
    iconUrl?: string;
}

export interface WorkitemStatusRef {
    id?: string;
    name?: string;
    category?: string;
}

export interface WorkitemPriorityRef {
    id?: string;
    name?: string;
    /** 数值级别，越小越紧急 */
    level?: number;
}

export interface WorkitemUserRef {
    id?: string;
    name?: string;
    /** 工号 */
    employeeId?: string;
}

export interface Workitem {
    id: string;
    /** 可读 id，例如 PROJ-123 */
    identifier?: string;
    subject: string;
    serialNumber: string;
    categoryId: string;
    status?: WorkitemStatusRef;
    priority?: WorkitemPriorityRef;
    assignee?: WorkitemUserRef | null;
    creator?: WorkitemUserRef | null;
    category?: WorkitemCategory;
    /** ISO 时间字符串 */
    updatedAt?: string;
    createdAt?: string;
    /** 项目 id */
    projectId?: string;
    description?: string;
    /** 处理人列表 */
    participants?: WorkitemUserRef[];
}

export interface PaginatedResult<T> {
    items: T[];
    nextToken?: string;
}

/** 官方 ListSprints 状态枚举。 */
export type SprintStatus = "TODO" | "DOING" | "ARCHIVED";

/** 迭代下的简单用户引用（creator / modifier / owners 通用）。 */
export interface SprintUserRef {
    id?: string;
    name?: string;
}

export interface Sprint {
    /** 迭代 id */
    id: string;
    /** 迭代名称 */
    name?: string;
    /** 状态：TODO / DOING / ARCHIVED */
    status?: SprintStatus | string;
    /** 计划开始时间，官方字段 startDate */
    startDate?: string;
    /** 计划结束时间，官方字段 endDate */
    endDate?: string;
    /** 容量（小时） */
    capacityHours?: number;
    /** 描述 */
    description?: string;
    /** 创建时间，官方字段 gmtCreate */
    createdAt?: string;
    /** 最近修改时间，官方字段 gmtModified */
    updatedAt?: string;
    /** 是否锁定 */
    locked?: boolean;
    /** 创建人 */
    creator?: SprintUserRef;
    /** 最近修改人 */
    modifier?: SprintUserRef;
    /** 负责人列表 */
    owners?: SprintUserRef[];
}

export interface TestPlan {
    /** 测试计划 ID（对应官方返回的 testPlanIdentifier） */
    id: string;
    /** 测试计划名称 */
    name?: string;
    /** 状态：TODO / DOING / DONE（官方 ListTestPlan 返回值） */
    status?: string;
    /** 关联的项目 id（对应官方返回的 spaceIdentifier） */
    projectId?: string;
    /** 负责人 id（取 managers[0]） */
    ownerId?: string;
    /** ISO 创建时间（官方返回的 gmtCreate） */
    createdAt?: string;
    /** 计划开始时间（归一化自 gmtStart / startTime / startDate） */
    startTime?: string;
    /** 计划结束时间（归一化自 gmtEnd / endTime / endDate） */
    endTime?: string;
    /** 全部负责人 id（官方返回的 managers） */
    managerIds?: string[];
}

export class YunxiaoApiError extends Error {
    readonly status: number;
    readonly bodyText?: string;
    readonly url?: string;
    readonly method?: string;

    constructor(status: number, message: string, opts: { bodyText?: string; url?: string; method?: string } = {}) {
        super(message);
        this.name = "YunxiaoApiError";
        this.status = status;
        this.bodyText = opts.bodyText;
        this.url = opts.url;
        this.method = opts.method;
    }
}

export class UnauthorizedError extends YunxiaoApiError {
    constructor(bodyText?: string, url?: string) {
        super(401, "Personal Access Token 无效或缺失，请在扩展偏好中重新设置。", { bodyText, url });
        this.name = "UnauthorizedError";
    }
}

export class NotFoundError extends YunxiaoApiError {
    constructor(message: string, bodyText?: string, url?: string) {
        super(404, message, { bodyText, url });
        this.name = "NotFoundError";
    }
}
