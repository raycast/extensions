// ==UserScript==
// @name         可灵和即梦AI去水印下载脚本 (兼容增强修复版)
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  自动监测可灵和即梦AI网页端生成的视频和照片，提供完全独立的预览、勾选和无水印批量下载功能 (增强兼容性与修复视频预览问题)
// @author       醉春风
// @license      Custom:ZuiChunFeng-Exclusive; 本脚本版权归"醉春风"所有，未经授权禁止复制、修改、分发或二次开发。仅限作者本人维护和更新。
// @match        https://app.klingai.com/*
// @match        https://klingai.kuaishou.com/*
// @match        https://klingai.com/*
// @match        https://jimeng.jianying.com/*
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_log
// @connect      *
// @run-at       document-idle
// ==/UserScript==
 
/*
 * =====================================================================
 * 版权声明：本脚本版权归"醉春风"所有，保留所有权利
 * 使用许可：仅限个人使用，未经授权禁止复制、修改、分发或二次开发
 * 维护权限：仅限作者本人维护和更新
 * 违规处理：任何未经授权的复制、修改或分发行为将被视为侵权
 * =====================================================================
 */
 
(function() {
    'use strict';
    
    // 版权信息
    console.log('[版权信息] 版权所有：醉春风');
 
    // --- 配置 --- 
    const CONFIG = {
        DEBUG: true,                // 是否开启调试日志
        INIT_DELAY: 5000,           // 初始延迟 (毫秒), 等待页面加载
        RETRY_DELAY: 3000,          // 重试延迟 (毫秒)
        MAX_RETRIES: 5,             // 最大重试次数
        BUTTON_CHECK_INTERVAL: 2000, // 按钮可见性检查间隔 (毫秒)
        AUTHOR: "醉春风",           // 作者署名
        VERSION: "3.4"              // 版本号
    };
 
    // --- 日志 --- 
    const log = (...args) => {
        if (CONFIG.DEBUG) {
            console.log(`[AI下载脚本 v${CONFIG.VERSION}]`, ...args);
            // GM_log(`[AI下载脚本 v${CONFIG.VERSION}] ` + args.join(' ')); // 可选：使用GM_log持久化日志
        }
    };
    const error = (...args) => {
        console.error(`[AI下载脚本 v${CONFIG.VERSION}]`, ...args);
        // GM_log(`[AI下载脚本 v${CONFIG.VERSION}] ERROR: ` + args.join(' ')); // 可选：使用GM_log持久化日志
    };
 
    // --- 样式注入 --- 
    GM_addStyle(`
        /* 主按钮样式 */
        .manus-ai-downloader-btn {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            background: linear-gradient(135deg, #3a8ffe 0%, #9259fe 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 10px 15px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            z-index: 2147483646 !important; /* Max z-index - 1 */
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
            display: flex !important;
            align-items: center !important;
            transition: all 0.3s ease !important;
        }
        .manus-ai-downloader-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
        }
        .manus-ai-downloader-btn svg {
            margin-right: 8px !important;
            fill: none !important;
            stroke: white !important;
            stroke-width: 2 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
        }
        
        /* 手动扫描按钮 */
        .manus-ai-manual-scan-btn {
            position: fixed !important;
            bottom: 70px !important;
            right: 20px !important;
            background: #444 !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 8px 12px !important;
            font-size: 14px !important;
            cursor: pointer !important;
            z-index: 2147483645 !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
            transition: all 0.3s ease !important;
        }
        .manus-ai-manual-scan-btn:hover {
            background: #555 !important;
            transform: translateY(-2px) !important;
        }
        
        /* 通知样式 */
        .manus-ai-downloader-notification {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 10px 15px !important;
            border-radius: 4px !important;
            z-index: 2147483647 !important; /* Max z-index */
            font-size: 14px !important;
            max-width: 300px !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
            animation: manusAiFadeInOut 3s forwards !important;
        }
        @keyframes manusAiFadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
        
        /* 错误通知样式 */
        .manus-ai-downloader-error {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: rgba(255, 59, 48, 0.9) !important;
            color: white !important;
            padding: 10px 15px !important;
            border-radius: 4px !important;
            z-index: 2147483647 !important; /* Max z-index */
            font-size: 14px !important;
            max-width: 300px !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
            animation: manusAiShakeError 0.5s forwards, manusAiFadeOutError 3s 0.5s forwards !important;
            display: flex !important;
            align-items: center !important;
        }
        .manus-ai-downloader-error svg {
            margin-right: 8px !important;
            fill: none !important;
            stroke: white !important;
            stroke-width: 2 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
        }
        @keyframes manusAiShakeError {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes manusAiFadeOutError {
            0%, 80% { opacity: 1; }
            100% { opacity: 0; transform: translateY(-20px); }
        }
        
        /* 预览面板样式 */
        .manus-ai-preview-panel {
            position: fixed !important;
            top: 10% !important;
            right: 0 !important;
            width: 30% !important;
            height: 80% !important;
            min-width: 300px !important;
            min-height: 400px !important;
            background: rgba(26, 26, 26, 0.95) !important; /* Slightly less transparent */
            border-radius: 8px 0 0 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
            z-index: 2147483646 !important; /* Max z-index - 1 */
            display: flex !important;
            flex-direction: column !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s ease !important;
            border-left: 2px solid #3a8ffe !important;
            color: white !important; /* Ensure text color */
            font-family: sans-serif !important; /* Reset font */
        }
        .manus-ai-preview-panel.show {
            transform: translateX(0) !important;
        }
        
        /* 预览面板头部 */
        .manus-ai-preview-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 15px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            flex-shrink: 0 !important;
        }
        .manus-ai-preview-title {
            color: white !important;
            font-size: 16px !important;
            font-weight: bold !important;
        }
        .manus-ai-author-credit {
            color: #ffcc00 !important;
            font-size: 12px !important;
            font-style: italic !important;
            margin-left: 10px !important;
            font-weight: normal !important;
        }
        .manus-ai-preview-close {
            color: white !important;
            background: none !important;
            border: none !important;
            cursor: pointer !important;
            font-size: 18px !important;
            padding: 5px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            width: 24px !important;
            height: 24px !important;
            transition: background 0.2s !important;
        }
        .manus-ai-preview-close:hover {
            background: rgba(255, 255, 255, 0.1) !important;
        }
        
        /* 预览面板工具栏 */
        .manus-ai-preview-toolbar {
            display: flex !important;
            padding: 10px 15px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            gap: 8px !important;
            flex-wrap: wrap !important;
            flex-shrink: 0 !important;
        }
        .manus-ai-preview-toolbar button {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 5px 10px !important;
            font-size: 12px !important;
            cursor: pointer !important;
            transition: background 0.2s !important;
        }
        .manus-ai-preview-toolbar button:hover {
            background: rgba(255, 255, 255, 0.2) !important;
        }
        .manus-ai-preview-counter {
            margin-left: auto !important;
            color: rgba(255, 255, 255, 0.7) !important;
            font-size: 12px !important;
            display: flex !important;
            align-items: center !important;
        }
        
        /* 预览内容区域 */
        .manus-ai-preview-content {
            flex: 1 !important;
            overflow-y: auto !important;
            padding: 15px !important;
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important;
            gap: 10px !important;
        }
        .manus-ai-preview-content::-webkit-scrollbar {
            width: 6px !important;
        }
        .manus-ai-preview-content::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1) !important;
        }
        .manus-ai-preview-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2) !important;
            border-radius: 3px !important;
        }
        
        /* 媒体项样式 (完全自定义) */
        .manus-ai-media-item {
            position: relative !important;
            width: 100% !important;
            padding-bottom: 100% !important; /* 1:1 Aspect Ratio */
            border-radius: 4px !important;
            overflow: hidden !important;
            cursor: pointer !important;
            transition: transform 0.2s, box-shadow 0.2s !important;
            background-color: #2a2a2a !important;
        }
        .manus-ai-media-item:hover {
            transform: scale(1.05) !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
            z-index: 1 !important;
        }
        .manus-ai-media-item.selected {
            border: 2px solid #3a8ffe !important;
            box-shadow: 0 0 0 2px rgba(58, 143, 254, 0.2) !important;
        }
        .manus-ai-media-thumbnail-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #2a2a2a !important;
        }
        .manus-ai-media-thumbnail-container svg {
            width: 32px !important;
            height: 32px !important;
            opacity: 1 !important;
            fill: none !important;
            stroke: #ffffff !important;
            stroke-width: 2 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
        }
        .manus-ai-media-checkbox {
            position: absolute !important;
            bottom: 5px !important;
            left: 5px !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid white !important;
            border-radius: 2px !important;
            background: rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: background 0.2s !important;
            z-index: 3 !important;
        }
        .manus-ai-media-checkbox.checked {
            background: #3a8ffe !important;
        }
        .manus-ai-media-checkbox.checked::after {
            content: "" !important;
            width: 10px !important;
            height: 5px !important;
            border-left: 2px solid white !important;
            border-bottom: 2px solid white !important;
            transform: rotate(-45deg) translate(1px, -1px) !important;
        }
        
        /* 视频特殊样式 */
        .manus-ai-media-item.video .manus-ai-media-thumbnail-container::after {
            content: "" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 0 !important;
            height: 0 !important;
            border-top: 10px solid transparent !important;
            border-bottom: 10px solid transparent !important;
            border-left: 15px solid rgba(255, 255, 255, 0.8) !important;
            filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5)) !important;
            z-index: 1 !important;
        }
        .manus-ai-media-duration {
            position: absolute !important;
            bottom: 5px !important;
            right: 5px !important;
            background: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            font-size: 10px !important;
            padding: 2px 4px !important;
            border-radius: 2px !important;
            z-index: 3 !important;
        }
        
        /* 预览面板底部 */
        .manus-ai-preview-footer {
            padding: 10px 15px !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            display: flex !important;
            justify-content: space-between !important;
            flex-shrink: 0 !important;
        }
        .manus-ai-download-btn {
            background: linear-gradient(135deg, #3a8ffe 0%, #9259fe 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 8px 15px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            display: flex !important;
            align-items: center !important;
        }
        .manus-ai-download-btn svg {
            margin-right: 6px !important;
            fill: none !important;
            stroke: white !important;
            stroke-width: 2 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
        }
        .manus-ai-download-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
        }
        .manus-ai-download-btn:disabled {
            background: #666 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .manus-ai-cancel-btn {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 8px 15px !important;
            font-size: 14px !important;
            cursor: pointer !important;
            transition: background 0.2s !important;
        }
        .manus-ai-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.2) !important;
        }
        
        /* 大预览样式 */
        .manus-ai-large-preview {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.9) !important;
            z-index: 2147483647 !important; /* Max z-index */
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease !important;
        }
        .manus-ai-large-preview.show {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        .manus-ai-large-preview-close {
            position: absolute !important;
            top: 20px !important;
            right: 20px !important;
            color: white !important;
            background: rgba(0, 0, 0, 0.5) !important;
            border: none !important;
            border-radius: 50% !important;
            width: 40px !important;
            height: 40px !important;
            font-size: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: background 0.2s !important;
            z-index: 2 !important;
        }
        .manus-ai-large-preview-close:hover {
            background: rgba(255, 255, 255, 0.2) !important;
        }
        .manus-ai-large-preview-container {
            max-width: 90% !important;
            max-height: 90% !important;
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        .manus-ai-large-preview-container img {
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            border-radius: 4px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
        }
        .manus-ai-large-preview-container video {
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            border-radius: 4px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
            background: #000 !important;
        }
        .manus-ai-video-controls {
            position: absolute !important;
            bottom: 10px !important;
            left: 0 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            padding: 10px !important;
            background: rgba(0, 0, 0, 0.5) !important;
            border-radius: 0 0 4px 4px !important;
            opacity: 0 !important;
            transition: opacity 0.3s !important;
        }
        .manus-ai-large-preview-container:hover .manus-ai-video-controls {
            opacity: 1 !important;
        }
        .manus-ai-video-error {
            color: white !important;
            background: rgba(255, 59, 48, 0.8) !important;
            padding: 10px 15px !important;
            border-radius: 4px !important;
            text-align: center !important;
            max-width: 80% !important;
        }
        
        /* 作者署名水印 */
        .manus-ai-author-watermark {
            position: absolute !important;
            bottom: 10px !important;
            left: 10px !important;
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 12px !important;
            font-style: italic !important;
            pointer-events: none !important;
            z-index: 1 !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
        }
    `);
 
    // --- 状态管理 --- 
    const state = {
        platform: null,
        mediaItems: [],
        selectedItems: [],
        isProcessing: false,
        isPanelOpen: false,
        downloadQueue: [],
        currentDownloading: null,
        largePreviewOpen: false,
        mediaMap: new Map(),
        mediaUrls: new Set(),
        windowLock: false,
        instanceId: 'manus_ai_downloader_' + Math.random().toString(36).substr(2, 9),
        initRetries: 0,
        observer: null, // MutationObserver实例
        buttonCheckIntervalId: null // 按钮检查定时器ID
    };
 
    // --- 图标 --- 
    const ICONS = {
        image: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        video: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`
    };
 
    // --- 媒体项类 --- 
    class MediaItem {
        constructor(element, type, url = null) {
            this.id = 'media_' + Math.random().toString(36).substr(2, 9);
            this.element = element; // 原始DOM元素引用 (可能为null)
            this.type = type; // 'image' 或 'video'
            this.url = url || (element ? (element.src || element.currentSrc) : null);
            this.highestQualityUrl = this.url;
            this.width = element ? (element.width || element.videoWidth || 0) : 0;
            this.height = element ? (element.height || element.videoHeight || 0) : 0;
            this.duration = type === 'video' && element ? element.duration : 0;
            this.selected = false;
            this.timestamp = Date.now(); // 添加时间戳
            this.videoLoaded = false; // 视频是否已加载成功
            this.thumbnailLoaded = false; // 缩略图是否已加载成功
 
            log(`创建媒体项: ${this.id}, 类型: ${this.type}, URL: ${this.url ? this.url.substring(0, 50) + '...' : 'N/A'}`);
        }
 
        // 创建缩略图元素 (完全自定义)
        createThumbnailElement() {
            const itemDiv = document.createElement('div');
            itemDiv.className = `manus-ai-media-item ${this.type}`;
            itemDiv.dataset.id = this.id;
 
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'manus-ai-media-thumbnail-container';
            
            // 尝试加载实际缩略图
            if (this.url) {
                try {
                    if (this.type === 'image') {
                        const img = document.createElement('img');
                        img.src = this.url;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        img.style.position = 'absolute';
                        img.style.top = '0';
                        img.style.left = '0';
                        img.crossOrigin = 'anonymous'; // 尝试解决跨域问题
                        img.loading = 'eager'; // 优先加载
                        img.decoding = 'async'; // 异步解码
                        
                        // 添加加载中占位符
                        const placeholder = document.createElement('div');
                        placeholder.innerHTML = ICONS.image;
                        placeholder.style.position = 'absolute';
                        placeholder.style.top = '0';
                        placeholder.style.left = '0';
                        placeholder.style.width = '100%';
                        placeholder.style.height = '100%';
                        placeholder.style.display = 'flex';
                        placeholder.style.alignItems = 'center';
                        placeholder.style.justifyContent = 'center';
                        placeholder.style.backgroundColor = '#2a2a2a';
                        thumbnailContainer.appendChild(placeholder);
                        
                        img.onload = () => {
                            this.thumbnailLoaded = true;
                            placeholder.remove();
                            log(`图片 ${this.id} 缩略图加载成功`);
                        };
                        
                        img.onerror = () => {
                            // 加载失败时保留占位符
                            log(`图片 ${this.id} 加载失败，保留占位符`);
                            
                            // 尝试使用备用方法加载
                            setTimeout(() => {
                                if (!this.thumbnailLoaded) {
                                    // 创建一个新的图片元素尝试再次加载
                                    const retryImg = new Image();
                                    retryImg.crossOrigin = 'anonymous';
                                    retryImg.src = this.url + '?retry=' + new Date().getTime(); // 添加时间戳避免缓存
                                    retryImg.onload = () => {
                                        img.src = retryImg.src;
                                        this.thumbnailLoaded = true;
                                        placeholder.remove();
                                        log(`图片 ${this.id} 重试加载成功`);
                                    };
                                }
                            }, 1000);
                        };
                        
                        thumbnailContainer.appendChild(img);
                    } else {
                        // 视频缩略图 - 尝试加载视频并获取第一帧
                        const video = document.createElement('video');
                        video.src = this.url;
                        video.crossOrigin = 'anonymous'; // 尝试解决跨域问题
                        video.muted = true;
                        video.preload = 'metadata'; // 只加载元数据
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.objectFit = 'cover';
                        video.style.position = 'absolute';
                        video.style.top = '0';
                        video.style.left = '0';
                        
                        // 添加视频占位符
                        const placeholder = document.createElement('div');
                        placeholder.innerHTML = ICONS.video;
                        placeholder.style.position = 'absolute';
                        placeholder.style.top = '0';
                        placeholder.style.left = '0';
                        placeholder.style.width = '100%';
                        placeholder.style.height = '100%';
                        placeholder.style.display = 'flex';
                        placeholder.style.alignItems = 'center';
                        placeholder.style.justifyContent = 'center';
                        placeholder.style.backgroundColor = '#2a2a2a';
                        thumbnailContainer.appendChild(placeholder);
                        
                        // 添加播放按钮图标覆盖层
                        const playIcon = document.createElement('div');
                        playIcon.style.position = 'absolute';
                        playIcon.style.top = '50%';
                        playIcon.style.left = '50%';
                        playIcon.style.transform = 'translate(-50%, -50%)';
                        playIcon.style.width = '30px';
                        playIcon.style.height = '30px';
                        playIcon.style.zIndex = '2';
                        playIcon.style.opacity = '0.8';
                        playIcon.innerHTML = ICONS.play;
                        
                        // 尝试加载视频并获取第一帧
                        video.addEventListener('loadeddata', () => {
                            this.videoLoaded = true;
                            this.thumbnailLoaded = true;
                            this.duration = video.duration || 0;
                            
                            // 更新时长显示
                            const durationEl = itemDiv.querySelector('.manus-ai-media-duration');
                            if (durationEl) {
                                durationEl.textContent = this.formatDuration(this.duration);
                            }
                            
                            // 视频加载成功，移除占位符
                            placeholder.remove();
                            thumbnailContainer.appendChild(playIcon);
                            log(`视频 ${this.id} 缩略图加载成功`);
                        });
                        
                        video.addEventListener('error', (e) => {
                            // 视频加载失败，保留占位符
                            log(`视频 ${this.id} 加载失败: ${e.target.error ? e.target.error.message : '未知错误'}`);
                            
                            // 尝试使用备用方法加载
                            setTimeout(() => {
                                if (!this.thumbnailLoaded) {
                                    // 尝试使用不同的方式加载视频
                                    const retryVideo = document.createElement('video');
                                    retryVideo.crossOrigin = 'anonymous';
                                    retryVideo.muted = true;
                                    retryVideo.src = this.url + '?retry=' + new Date().getTime(); // 添加时间戳避免缓存
                                    retryVideo.addEventListener('loadeddata', () => {
                                        video.src = retryVideo.src;
                                        this.videoLoaded = true;
                                        this.thumbnailLoaded = true;
                                        this.duration = retryVideo.duration || 0;
                                        
                                        // 更新时长显示
                                        const durationEl = itemDiv.querySelector('.manus-ai-media-duration');
                                        if (durationEl) {
                                            durationEl.textContent = this.formatDuration(this.duration);
                                        }
                                        
                                        placeholder.remove();
                                        thumbnailContainer.appendChild(playIcon);
                                        log(`视频 ${this.id} 重试加载成功`);
                                    });
                                }
                            }, 1000);
                        });
                        
                        thumbnailContainer.appendChild(video);
                        
                        // 设置一个超时，如果视频在一定时间内未加载，则保留占位符
                        setTimeout(() => {
                            if (!this.thumbnailLoaded) {
                                log(`视频 ${this.id} 加载超时，保留占位符`);
                            }
                        }, 5000);
                    }
                } catch (e) {
                    error('创建缩略图时出错:', e);
                    thumbnailContainer.innerHTML = this.type === 'image' ? ICONS.image : ICONS.video;
                }
            } else {
                thumbnailContainer.innerHTML = this.type === 'image' ? ICONS.image : ICONS.video;
            }
            
            itemDiv.appendChild(thumbnailContainer);
 
            if (this.type === 'video') {
                const durationSpan = document.createElement('span');
                durationSpan.className = 'manus-ai-media-duration';
                durationSpan.textContent = this.formatDuration(this.duration);
                itemDiv.appendChild(durationSpan);
            }
 
            const checkbox = document.createElement('div');
            checkbox.className = 'manus-ai-media-checkbox';
            if (this.selected) {
                checkbox.classList.add('checked');
            }
            itemDiv.appendChild(checkbox);
 
            itemDiv.addEventListener('click', (e) => {
                if (state.windowLock) return;
 
                const rect = checkbox.getBoundingClientRect();
                const isCheckboxClick = (
                    e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom
                );
 
                if (isCheckboxClick) {
                    this.toggleSelect();
                    UI.updateSelectedCounter();
                    UI.updateDownloadButton();
                } else {
                    if (!state.largePreviewOpen) {
                        state.windowLock = true;
                        setTimeout(() => { state.windowLock = false; }, 500);
                        UI.openLargePreview(this);
                    }
                }
            });
 
            return itemDiv;
        }
 
        toggleSelect() {
            this.selected = !this.selected;
            const itemElement = document.querySelector(`.manus-ai-media-item[data-id="${this.id}"]`);
            if (itemElement) {
                itemElement.classList.toggle('selected', this.selected);
                itemElement.querySelector('.manus-ai-media-checkbox').classList.toggle('checked', this.selected);
            }
            if (this.selected) {
                if (!state.selectedItems.includes(this.id)) state.selectedItems.push(this.id);
            } else {
                const index = state.selectedItems.indexOf(this.id);
                if (index !== -1) state.selectedItems.splice(index, 1);
            }
        }
 
        setSelected(selected) {
            if (this.selected !== selected) {
                this.toggleSelect();
            }
        }
 
        formatDuration(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            seconds = Math.round(seconds);
            const minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
 
    // --- UI 相关函数 --- 
    const UI = {
        // 创建主按钮 (增强)
        createMainButton: () => {
            const existingButton = document.querySelector('.manus-ai-downloader-btn');
            if (existingButton) {
                log('主按钮已存在');
                return existingButton;
            }
 
            const button = document.createElement('button');
            button.className = 'manus-ai-downloader-btn';
            button.innerHTML = `${ICONS.download} 无水印下载`;
            button.style.visibility = 'hidden'; // Initially hidden
 
            // Try appending to body first
            document.body.appendChild(button);
            log('尝试将按钮添加到 document.body');
 
            // Check visibility after a short delay
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    button.style.visibility = 'visible';
                    log('主按钮已成功添加到 body 并可见');
                } else {
                    error('主按钮添加到 body 后不可见，尝试其他容器');
                    // Fallback: Try appending to documentElement if body fails
                    document.documentElement.appendChild(button);
                    setTimeout(() => {
                        const rect2 = button.getBoundingClientRect();
                        if (rect2.width > 0 && rect2.height > 0) {
                            button.style.visibility = 'visible';
                            log('主按钮已成功添加到 documentElement 并可见');
                        } else {
                            error('主按钮添加到 documentElement 后仍不可见，注入失败！');
                            UI.showError('无法创建下载按钮，请联系开发者');
                            button.remove(); // Clean up invisible button
                        }
                    }, 500);
                }
            }, 500);
 
            button.addEventListener('click', () => {
                if (state.windowLock) return;
                state.windowLock = true;
                setTimeout(() => { state.windowLock = false; }, 500);
                UI.togglePreviewPanel();
            });
 
            // Start periodic check for button visibility
            UI.startButtonVisibilityCheck();
 
            return button;
        },
 
        // 创建手动扫描按钮
        createManualScanButton: () => {
            const existingButton = document.querySelector('.manus-ai-manual-scan-btn');
            if (existingButton) {
                log('手动扫描按钮已存在');
                return existingButton;
            }
 
            const button = document.createElement('button');
            button.className = 'manus-ai-manual-scan-btn';
            button.textContent = '手动扫描媒体';
            
            document.body.appendChild(button);
            
            button.addEventListener('click', () => {
                log('用户触发手动扫描');
                findAndProcessMedia();
                UI.showNotification('手动扫描完成，检测到 ' + state.mediaItems.length + ' 个媒体项');
            });
            
            return button;
        },
 
        // 定期检查按钮可见性
        startButtonVisibilityCheck: () => {
            if (state.buttonCheckIntervalId) {
                clearInterval(state.buttonCheckIntervalId);
            }
            state.buttonCheckIntervalId = setInterval(() => {
                const button = document.querySelector('.manus-ai-downloader-btn');
                if (button) {
                    const rect = button.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0 || button.style.display === 'none' || button.style.visibility === 'hidden') {
                        log('检测到下载按钮变得不可见，尝试重新显示...');
                        button.style.display = 'flex !important';
                        button.style.visibility = 'visible !important';
                        // Ensure it's still in the DOM, re-append if necessary
                        if (!document.body.contains(button) && !document.documentElement.contains(button)) {
                            log('按钮已从DOM移除，重新添加...');
                            document.body.appendChild(button);
                        }
                    }
                } else {
                    log('下载按钮丢失，尝试重新创建...');
                    UI.createMainButton(); // Recreate if lost
                }
                
                // 同时检查手动扫描按钮
                const scanButton = document.querySelector('.manus-ai-manual-scan-btn');
                if (!scanButton) {
                    log('手动扫描按钮丢失，重新创建...');
                    UI.createManualScanButton();
                }
            }, CONFIG.BUTTON_CHECK_INTERVAL);
        },
 
        // 创建预览面板 (单例)
        createPreviewPanel: () => {
            let panel = document.querySelector('.manus-ai-preview-panel');
            if (panel) return panel;
 
            panel = document.createElement('div');
            panel.className = 'manus-ai-preview-panel';
            panel.dataset.instanceId = state.instanceId;
            panel.innerHTML = `
                <div class="manus-ai-preview-header">
                    <div class="manus-ai-preview-title">媒体内容预览 <span class="manus-ai-author-credit">by ${CONFIG.AUTHOR}</span> (v${CONFIG.VERSION})</div>
                    <button class="manus-ai-preview-close">×</button>
                </div>
                <div class="manus-ai-preview-toolbar">
                    <button class="manus-ai-select-all">全选</button>
                    <button class="manus-ai-select-none">取消全选</button>
                    <button class="manus-ai-select-images">选择图片</button>
                    <button class="manus-ai-select-videos">选择视频</button>
                    <div class="manus-ai-preview-counter">已选: 0</div>
                </div>
                <div class="manus-ai-preview-content"></div>
                <div class="manus-ai-preview-footer">
                    <button class="manus-ai-download-btn" disabled>
                        ${ICONS.download}
                        下载选中项(0)
                    </button>
                    <button class="manus-ai-cancel-btn">取消</button>
                </div>
            `;
            document.body.appendChild(panel);
 
            panel.querySelector('.manus-ai-preview-close').addEventListener('click', () => UI.togglePreviewPanel(false));
            panel.querySelector('.manus-ai-cancel-btn').addEventListener('click', () => UI.togglePreviewPanel(false));
            panel.querySelector('.manus-ai-select-all').addEventListener('click', UI.selectAll);
            panel.querySelector('.manus-ai-select-none').addEventListener('click', UI.selectNone);
            panel.querySelector('.manus-ai-select-images').addEventListener('click', () => UI.selectByType('image'));
            panel.querySelector('.manus-ai-select-videos').addEventListener('click', () => UI.selectByType('video'));
            panel.querySelector('.manus-ai-download-btn').addEventListener('click', UI.startDownload);
 
            log('创建预览面板');
            return panel;
        },
 
        // 创建大预览 (单例)
        createLargePreview: () => {
            let preview = document.querySelector('.manus-ai-large-preview');
            if (preview) return preview;
 
            preview = document.createElement('div');
            preview.className = 'manus-ai-large-preview';
            preview.dataset.instanceId = state.instanceId;
            preview.innerHTML = `
                <button class="manus-ai-large-preview-close">×</button>
                <div class="manus-ai-large-preview-container"></div>
                <div class="manus-ai-author-watermark">© ${CONFIG.AUTHOR}</div>
            `;
            document.body.appendChild(preview);
 
            preview.addEventListener('click', (e) => { 
                if (e.target === preview) UI.closeLargePreview(); 
            });
            preview.querySelector('.manus-ai-large-preview-close').addEventListener('click', UI.closeLargePreview);
 
            log('创建大预览');
            return preview;
        },
 
        // 打开大预览
        openLargePreview: (mediaItem) => {
            if (state.largePreviewOpen) return;
            
            const preview = UI.createLargePreview();
            const container = preview.querySelector('.manus-ai-large-preview-container');
            container.innerHTML = ''; // 清除之前的内容
            
            if (!mediaItem || !mediaItem.url) {
                container.innerHTML = `<div class="manus-ai-video-error">无法加载媒体，URL无效</div>`;
                preview.classList.add('show');
                state.largePreviewOpen = true;
                return;
            }
            
            try {
                if (mediaItem.type === 'image') {
                    // 图片预览
                    const img = document.createElement('img');
                    img.src = mediaItem.url;
                    img.alt = '预览图片';
                    img.crossOrigin = 'anonymous'; // 尝试解决跨域问题
                    img.loading = 'eager'; // 优先加载
                    img.decoding = 'async'; // 异步解码
                    
                    // 添加加载中提示
                    const loadingDiv = document.createElement('div');
                    loadingDiv.textContent = '图片加载中...';
                    loadingDiv.style.position = 'absolute';
                    loadingDiv.style.top = '50%';
                    loadingDiv.style.left = '50%';
                    loadingDiv.style.transform = 'translate(-50%, -50%)';
                    loadingDiv.style.color = 'white';
                    loadingDiv.style.background = 'rgba(0,0,0,0.7)';
                    loadingDiv.style.padding = '10px 20px';
                    loadingDiv.style.borderRadius = '4px';
                    loadingDiv.style.zIndex = '3';
                    container.appendChild(loadingDiv);
                    
                    img.onload = () => {
                        loadingDiv.remove();
                        log(`大预览图片加载成功: ${mediaItem.url.substring(0, 50)}...`);
                    };
                    
                    img.onerror = () => {
                        loadingDiv.remove();
                        container.innerHTML = `<div class="manus-ai-video-error">图片加载失败</div>`;
                        error(`图片加载失败: ${mediaItem.url.substring(0, 50)}...`);
                        
                        // 尝试使用不同的方式加载图片
                        setTimeout(() => {
                            const retryImg = new Image();
                            retryImg.crossOrigin = 'anonymous';
                            retryImg.src = mediaItem.url + '?retry=' + new Date().getTime(); // 添加时间戳避免缓存
                            retryImg.onload = () => {
                                container.innerHTML = '';
                                const newImg = document.createElement('img');
                                newImg.src = retryImg.src;
                                newImg.alt = '预览图片';
                                container.appendChild(newImg);
                                log(`大预览图片重试加载成功: ${mediaItem.url.substring(0, 50)}...`);
                            };
                        }, 1000);
                    };
                    
                    container.appendChild(img);
                } else {
                    // 视频预览
                    const video = document.createElement('video');
                    video.src = mediaItem.url;
                    video.controls = true;
                    video.autoplay = true;
                    video.crossOrigin = 'anonymous'; // 尝试解决跨域问题
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '90vh';
                    
                    // 添加加载中提示
                    const loadingDiv = document.createElement('div');
                    loadingDiv.textContent = '视频加载中...';
                    loadingDiv.style.position = 'absolute';
                    loadingDiv.style.top = '50%';
                    loadingDiv.style.left = '50%';
                    loadingDiv.style.transform = 'translate(-50%, -50%)';
                    loadingDiv.style.color = 'white';
                    loadingDiv.style.background = 'rgba(0,0,0,0.7)';
                    loadingDiv.style.padding = '10px 20px';
                    loadingDiv.style.borderRadius = '4px';
                    loadingDiv.style.zIndex = '3';
                    container.appendChild(loadingDiv);
                    
                    // 视频加载成功
                    video.addEventListener('loadeddata', () => {
                        loadingDiv.remove();
                        log(`大预览视频加载成功: ${mediaItem.url.substring(0, 50)}...`);
                    });
                    
                    // 视频加载失败
                    video.addEventListener('error', (e) => {
                        loadingDiv.remove();
                        error(`视频加载失败:`, e.target.error);
                        
                        // 尝试使用不同的方式加载视频
                        container.innerHTML = `
                            <div class="manus-ai-video-error">
                                视频加载失败，可能是由于跨域限制或格式不支持。<br>
                                <a href="${mediaItem.url}" target="_blank" style="color:white;text-decoration:underline;">点击此处在新窗口打开视频</a>
                            </div>
                        `;
                        
                        // 尝试使用不同的方式加载视频
                        setTimeout(() => {
                            const retryVideo = document.createElement('video');
                            retryVideo.crossOrigin = 'anonymous';
                            retryVideo.muted = true;
                            retryVideo.src = mediaItem.url + '?retry=' + new Date().getTime(); // 添加时间戳避免缓存
                            retryVideo.addEventListener('loadeddata', () => {
                                container.innerHTML = '';
                                const newVideo = document.createElement('video');
                                newVideo.src = retryVideo.src;
                                newVideo.controls = true;
                                newVideo.autoplay = true;
                                newVideo.style.maxWidth = '100%';
                                newVideo.style.maxHeight = '90vh';
                                container.appendChild(newVideo);
                                log(`大预览视频重试加载成功: ${mediaItem.url.substring(0, 50)}...`);
                            });
                        }, 1000);
                    });
                    
                    container.appendChild(video);
                    
                    // 设置超时，如果视频长时间未加载则显示错误
                    setTimeout(() => {
                        if (container.contains(loadingDiv)) {
                            loadingDiv.remove();
                            if (video.readyState < 3) { // HAVE_FUTURE_DATA
                                error(`视频加载超时: ${mediaItem.url.substring(0, 50)}...`);
                                container.innerHTML = `
                                    <div class="manus-ai-video-error">
                                        视频加载超时，可能是由于网络问题或格式不支持。<br>
                                        <a href="${mediaItem.url}" target="_blank" style="color:white;text-decoration:underline;">点击此处在新窗口打开视频</a>
                                    </div>
                                `;
                            }
                        }
                    }, 10000); // 10秒超时
                }
                
                preview.classList.add('show');
                state.largePreviewOpen = true;
                log(`打开大预览: ${mediaItem.type}, ${mediaItem.url ? mediaItem.url.substring(0, 50) + '...' : 'N/A'}`);
                
            } catch (e) {
                error('打开大预览时出错:', e);
                container.innerHTML = `<div class="manus-ai-video-error">预览加载失败: ${e.message}</div>`;
                preview.classList.add('show');
                state.largePreviewOpen = true;
            }
        },
 
        // 关闭大预览
        closeLargePreview: () => {
            const preview = document.querySelector('.manus-ai-large-preview');
            if (preview) {
                preview.classList.remove('show');
                // 清除视频以停止播放
                const container = preview.querySelector('.manus-ai-large-preview-container');
                if (container) {
                    const video = container.querySelector('video');
                    if (video) {
                        video.pause();
                        video.src = '';
                        video.load();
                    }
                    container.innerHTML = '';
                }
            }
            state.largePreviewOpen = false;
            log('关闭大预览');
        },
 
        // 显示通知
        showNotification: (message, duration = 3000) => {
            const notification = document.createElement('div');
            notification.className = 'manus-ai-downloader-notification';
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, duration);
        },
 
        // 显示错误
        showError: (message, duration = 3000) => {
            const notification = document.createElement('div');
            notification.className = 'manus-ai-downloader-error';
            notification.innerHTML = `${ICONS.error} ${message}`;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, duration);
        },
 
        togglePreviewPanel: (show = null) => {
            const panel = UI.createPreviewPanel();
            const isCurrentlyShown = panel.classList.contains('show');
            const shouldShow = show !== null ? show : !isCurrentlyShown;
 
            if (shouldShow) {
                panel.classList.add('show');
                state.isPanelOpen = true;
                UI.refreshPreviewContent();
                log('打开预览面板');
            } else {
                panel.classList.remove('show');
                state.isPanelOpen = false;
                log('关闭预览面板');
            }
        },
 
        refreshPreviewContent: () => {
            const contentContainer = document.querySelector('.manus-ai-preview-content');
            if (!contentContainer) {
                error('找不到预览内容容器');
                return;
            }
            contentContainer.innerHTML = ''; // Clear previous items
 
            if (state.mediaItems.length === 0) {
                contentContainer.innerHTML = '<div style="grid-column: 1 / -1; color: #aaa; text-align: center; padding: 20px;">暂无检测到的媒体内容<br>请尝试点击"手动扫描媒体"按钮</div>';
            } else {
                // Sort items by timestamp, newest first
                const sortedItems = [...state.mediaItems].sort((a, b) => b.timestamp - a.timestamp);
                sortedItems.forEach(item => {
                    const thumbnailElement = item.createThumbnailElement();
                    contentContainer.appendChild(thumbnailElement);
                });
            }
 
            UI.updateSelectedCounter();
            UI.updateDownloadButton();
            log(`刷新预览内容，共 ${state.mediaItems.length} 项`);
        },
 
        updateSelectedCounter: () => {
            const counter = document.querySelector('.manus-ai-preview-counter');
            if (counter) counter.textContent = `已选: ${state.selectedItems.length}`;
        },
 
        updateDownloadButton: () => {
            const downloadBtn = document.querySelector('.manus-ai-preview-footer .manus-ai-download-btn');
            if (downloadBtn) {
                const count = state.selectedItems.length;
                downloadBtn.disabled = count === 0;
                downloadBtn.innerHTML = `${ICONS.download} 下载选中项(${count})`;
            }
        },
 
        selectAll: () => {
            state.mediaItems.forEach(item => item.setSelected(true));
            UI.updateSelectedCounter();
            UI.updateDownloadButton();
            log('全选媒体项');
        },
 
        selectNone: () => {
            state.mediaItems.forEach(item => item.setSelected(false));
            UI.updateSelectedCounter();
            UI.updateDownloadButton();
            log('取消全选');
        },
 
        selectByType: (type) => {
            state.mediaItems.forEach(item => item.setSelected(item.type === type));
            UI.updateSelectedCounter();
            UI.updateDownloadButton();
            log(`按类型选择: ${type}`);
        },
 
        startDownload: () => {
            // 下载逻辑实现
            UI.showNotification('开始下载选中项...');
            
            // 获取选中的媒体项
            const selectedMediaItems = state.mediaItems.filter(item => 
                state.selectedItems.includes(item.id)
            );
            
            if (selectedMediaItems.length === 0) {
                UI.showError('没有选中任何媒体项');
                return;
            }
            
            // 下载选中的媒体项
            selectedMediaItems.forEach((item, index) => {
                setTimeout(() => {
                    try {
                        if (!item.url) {
                            UI.showError(`媒体项 #${index+1} URL无效`);
                            return;
                        }
                        
                        // 生成文件名
                        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
                        const fileExt = item.type === 'video' ? 
                            (item.url.match(/\.(mp4|webm|mov)($|\?)/i) ? RegExp.$1 : 'mp4') : 
                            (item.url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i) ? RegExp.$1 : 'jpg');
                        const fileName = `${item.type === 'video' ? 'video' : 'image'}_${timestamp}_${index}.${fileExt}`;
                        
                        // 使用GM_download下载
                        if (typeof GM_download !== 'undefined') {
                            GM_download({
                                url: item.url,
                                name: fileName,
                                onload: () => log(`媒体项 #${index+1} 下载完成`),
                                onerror: (e) => {
                                    error(`媒体项 #${index+1} 下载失败:`, e);
                                    UI.showError(`媒体项 #${index+1} 下载失败，请尝试右键另存为`);
                                }
                            });
                        } else {
                            // 回退方案：创建下载链接
                            const a = document.createElement('a');
                            a.href = item.url;
                            a.download = fileName;
                            a.target = '_blank';
                            a.style.display = 'none';
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                                document.body.removeChild(a);
                            }, 100);
                        }
                        
                        UI.showNotification(`正在下载 ${index+1}/${selectedMediaItems.length}`);
                    } catch (e) {
                        error(`下载媒体项 #${index+1} 时出错:`, e);
                        UI.showError(`下载出错: ${e.message}`);
                    }
                }, index * 500); // 每隔500ms下载一个，避免浏览器限制
            });
            
            UI.showNotification(`已开始下载 ${selectedMediaItems.length} 个媒体项`);
        }
    };
 
    // --- 工具函数 --- 
    const utils = {
        // 检测当前平台
        detectPlatform: () => {
            const url = window.location.href.toLowerCase();
            
            // 通过URL检测
            if (url.includes('klingai') || url.includes('kuaishou')) {
                return 'keling';
            } else if (url.includes('jimeng') || url.includes('jianying')) {
                return 'jimeng';
            }
            
            // 通过DOM特征检测
            if (document.querySelector('.kl-container') || document.querySelector('[data-kl]')) {
                return 'keling';
            }
            if (document.querySelector('.jm-container') || document.querySelector('[data-jm]')) {
                return 'jimeng';
            }
            
            // 如果无法确定，尝试通过页面标题或其他特征检测
            const title = document.title.toLowerCase();
            if (title.includes('可灵') || title.includes('kling')) {
                return 'keling';
            }
            if (title.includes('即梦') || title.includes('jimeng')) {
                return 'jimeng';
            }
            
            // 默认返回null，表示未知平台
            return null;
        },
 
        // 检查元素是否已处理 (使用URL)
        isUrlProcessed: (url) => {
            if (!url) return true; // Ignore empty URLs
            return state.mediaUrls.has(url);
        },
 
        // 标记URL为已处理
        markUrlAsProcessed: (url) => {
            if (url) {
                state.mediaUrls.add(url);
            }
        },
 
        // 清理重复的媒体项 (基于URL)
        cleanupDuplicateMedia: () => {
            const uniqueUrls = new Set();
            const uniqueItems = [];
            // Iterate in reverse to keep the latest instance if URLs are the same
            for (let i = state.mediaItems.length - 1; i >= 0; i--) {
                const item = state.mediaItems[i];
                if (item.url && !uniqueUrls.has(item.url)) {
                    uniqueUrls.add(item.url);
                    uniqueItems.push(item);
                }
            }
            // Reverse back to original order (or keep newest first)
            uniqueItems.reverse(); 
 
            if (state.mediaItems.length !== uniqueItems.length) {
                log(`清理重复媒体项: ${state.mediaItems.length} -> ${uniqueItems.length}`);
                state.mediaItems = uniqueItems;
            }
        }
    };
 
    // --- 平台特定处理 --- 
    const platforms = {
        keling: { 
            selectors: [
                'video[src]', 
                'img[src]', 
                '.media-container img', 
                '.media-preview img',
                '.media-item video',
                '.image-container img',
                '.video-container video',
                '.preview-container img',
                '.preview-container video',
                '.result-container img',
                '.result-container video',
                // 添加更多可能的选择器
                '[class*="media"] img',
                '[class*="image"] img',
                '[class*="photo"] img',
                '[class*="video"] video',
                '[class*="preview"] img',
                '[class*="preview"] video',
                '[class*="result"] img',
                '[class*="result"] video'
            ] 
        },
        jimeng: { 
            selectors: [
                'video[src]', 
                'img[src]',
                '.media-preview-item img',
                '.media-gallery img',
                '.video-container video',
                '.image-container img',
                '.preview-container img',
                '.preview-container video',
                '.result-container img',
                '.result-container video',
                // 添加更多可能的选择器
                '[class*="media"] img',
                '[class*="image"] img',
                '[class*="photo"] img',
                '[class*="video"] video',
                '[class*="preview"] img',
                '[class*="preview"] video',
                '[class*="result"] img',
                '[class*="result"] video'
            ]
        }
    };
 
    // --- 网络请求监听 ---
    function setupNetworkListener() {
        log('设置网络请求监听');
        
        // 监听XHR请求
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            
            xhr.open = function() {
                this.addEventListener('load', function() {
                    try {
                        const url = this.responseURL;
                        if (url && (url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)($|\?)/i) || 
                                   url.includes('/image/') || 
                                   url.includes('/video/'))) {
                            log(`检测到媒体URL: ${url}`);
                            // 创建新的媒体项
                            const type = url.match(/\.(mp4|webm|mov)($|\?)/i) || url.includes('/video/') ? 'video' : 'image';
                            if (!utils.isUrlProcessed(url)) {
                                const mediaItem = new MediaItem(null, type, url);
                                state.mediaItems.push(mediaItem);
                                utils.markUrlAsProcessed(url);
                                utils.cleanupDuplicateMedia();
                                if (state.isPanelOpen) {
                                    UI.refreshPreviewContent();
                                }
                            }
                        }
                    } catch (e) {
                        error('处理XHR响应时出错:', e);
                    }
                });
                return originalOpen.apply(this, arguments);
            };
            
            return xhr;
        };
        
        // 监听Fetch请求
        const originalFetch = window.fetch;
        window.fetch = function() {
            const fetchPromise = originalFetch.apply(this, arguments);
            
            fetchPromise.then(response => {
                try {
                    const url = response.url;
                    if (url && (url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)($|\?)/i) || 
                               url.includes('/image/') || 
                               url.includes('/video/'))) {
                        log(`检测到Fetch媒体URL: ${url}`);
                        // 创建新的媒体项
                        const type = url.match(/\.(mp4|webm|mov)($|\?)/i) || url.includes('/video/') ? 'video' : 'image';
                        if (!utils.isUrlProcessed(url)) {
                            const mediaItem = new MediaItem(null, type, url);
                            state.mediaItems.push(mediaItem);
                            utils.markUrlAsProcessed(url);
                            utils.cleanupDuplicateMedia();
                            if (state.isPanelOpen) {
                                UI.refreshPreviewContent();
                            }
                        }
                    }
                } catch (e) {
                    error('处理Fetch响应时出错:', e);
                }
            });
            
            return fetchPromise;
        };
        
        log('网络请求监听已设置');
    }
 
    // --- 核心逻辑 --- 
 
    // 查找并处理媒体元素
    function findAndProcessMedia() {
        log('开始扫描媒体元素...');
        log(`当前平台: ${state.platform}, 使用选择器: ${platforms[state.platform].selectors.join(', ')}`);
        
        let newMediaFound = false;
        const platformConfig = platforms[state.platform];
        if (!platformConfig) {
            error('未找到平台配置');
            return false;
        }
 
        platformConfig.selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                log(`选择器 ${selector} 找到 ${elements.length} 个元素`);
                
                elements.forEach(element => {
                    const url = element.src || element.currentSrc;
                    if (!url || utils.isUrlProcessed(url)) {
                        return; // Skip already processed URLs
                    }
 
                    // Basic filtering (e.g., ignore tiny images)
                    if (element.tagName === 'IMG' && (element.naturalWidth < 100 || element.naturalHeight < 100)) {
                        log(`忽略小图片: ${url.substring(0, 50)}...`);
                        return;
                    }
 
                    const type = element.tagName === 'VIDEO' ? 'video' : 'image';
                    
                    // Mark URL as processed immediately
                    utils.markUrlAsProcessed(url);
 
                    // Create MediaItem (element reference might be less reliable now)
                    const mediaItem = new MediaItem(null, type, url);
                    mediaItem.width = element.naturalWidth || element.videoWidth || 0;
                    mediaItem.height = element.naturalHeight || element.videoHeight || 0;
                    if (type === 'video') {
                        mediaItem.duration = element.duration || 0;
                    }
 
                    state.mediaItems.push(mediaItem);
                    newMediaFound = true;
                    log(`通过选择器 ${selector} 检测到新 ${type}: ${mediaItem.id}, URL: ${url.substring(0, 50)}...`);
                });
            } catch (e) {
                error(`使用选择器 ${selector} 时出错:`, e);
            }
        });
 
        // 如果没有找到媒体，输出调试信息
        if (!newMediaFound) {
            log('未找到媒体项，可能原因：选择器不匹配或媒体尚未加载');
            // 输出页面中所有img和video元素的信息，帮助调试
            document.querySelectorAll('img, video').forEach((el, i) => {
                if (el.src) {
                    log(`调试 - 元素 #${i}: ${el.tagName}, src: ${el.src.substring(0, 50)}..., 可见: ${el.offsetParent !== null}`);
                }
            });
        }
 
        if (newMediaFound) {
            utils.cleanupDuplicateMedia(); // Cleanup duplicates based on URL
            if (state.isPanelOpen) {
                UI.refreshPreviewContent();
            }
            UI.showNotification(`检测到 ${state.mediaItems.length} 个媒体项`);
        }
        log('媒体元素扫描结束.');
        return newMediaFound;
    }
 
    // 启动MutationObserver
    function startObserver() {
        if (state.observer) {
            state.observer.disconnect(); // Disconnect previous observer if any
        }
        
        log('启动 MutationObserver');
        state.observer = new MutationObserver((mutations) => {
            let potentiallyNewMedia = false;
            for (const mutation of mutations) {
                // Check added nodes or attribute changes that might indicate new media
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    potentiallyNewMedia = true;
                    break;
                }
                if (mutation.type === 'attributes' && (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')) {
                     potentiallyNewMedia = true;
                     break;
                }
            }
 
            if (potentiallyNewMedia) {
                log('MutationObserver 检测到潜在变化，重新扫描媒体...');
                // Debounce the scan slightly
                setTimeout(findAndProcessMedia, 500);
            }
        });
 
        state.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'currentSrc'] // Observe src changes
        });
    }
 
    // 初始化函数 (增强)
    function initializeScript() {
        log(`尝试初始化脚本 (第 ${state.initRetries + 1} 次)`);
        state.platform = utils.detectPlatform();
        if (!state.platform) {
            error('不支持的平台');
            UI.showError('不支持的平台，脚本可能无法正常工作');
            state.platform = 'keling'; // 默认使用可灵平台配置
        }
        log(`检测到平台: ${state.platform}`);
 
        // 1. 创建UI元素 (按钮和面板)
        UI.createMainButton();
        UI.createManualScanButton(); // 添加手动扫描按钮
        UI.createPreviewPanel(); // Create panel but don't show
        UI.createLargePreview(); // Create large preview container
 
        // 2. 设置网络请求监听
        setupNetworkListener();
 
        // 3. 初始扫描
        const foundInitially = findAndProcessMedia();
 
        // 4. 启动Observer
        startObserver();
 
        // 5. 如果初始扫描未找到任何内容且未达到最大重试次数，则安排重试
        if (!foundInitially && state.initRetries < CONFIG.MAX_RETRIES) {
            state.initRetries++;
            log(`初始扫描未找到媒体，将在 ${CONFIG.RETRY_DELAY}ms 后重试 (第 ${state.initRetries} 次)`);
            setTimeout(initializeScript, CONFIG.RETRY_DELAY);
            return; // Don't show success notification yet
        }
 
        // 6. 初始化完成 (或达到最大重试次数)
        if (foundInitially) {
            log(`可灵和即梦AI去水印下载脚本 (v${CONFIG.VERSION}) 已初始化`);
            UI.showNotification(`AI下载脚本 (v${CONFIG.VERSION}) 已启用 - by ${CONFIG.AUTHOR}`);
        } else {
            log(`达到最大重试次数 (${CONFIG.MAX_RETRIES})，仍未找到媒体。脚本将保持运行状态。`);
            UI.showNotification(`AI下载脚本 (v${CONFIG.VERSION}) 已启用 (未检测到媒体，请尝试手动扫描) - by ${CONFIG.AUTHOR}`);
        }
    }
 
    // --- 启动脚本 --- 
    log(`脚本开始执行，等待初始延迟... (v${CONFIG.VERSION} by ${CONFIG.AUTHOR})`);
    setTimeout(initializeScript, CONFIG.INIT_DELAY);
 
})();