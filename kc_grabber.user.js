// ==UserScript==
// @name         舰C拦截测试-本地验证版
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  测试能否拦截到舰C数据，无需后端
// @author       Qing-Feng
// @match        https://osapi.dmm.com/*
// @match        https://www.dmm.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let panel = null;
    let logCount = 0;

    function createPanel() {
        if (panel) return;
        panel = document.createElement('div');
        panel.id = 'kc-test-panel';
        panel.style.cssText = `
            position: fixed !important;
            bottom: 10px !important;
            right: 10px !important;
            width: 300px !important;
            max-height: 220px !important;
            background: rgba(0, 0, 0, 0.9) !important;
            color: #00ff41 !important;
            font-family: monospace !important;
            font-size: 11px !important;
            padding: 10px !important;
            border-radius: 8px !important;
            z-index: 2147483647 !important;
            border: 2px solid #00ff41 !important;
            overflow-y: auto !important;
            line-height: 1.4 !important;
        `;
        panel.innerHTML = `
            <div style="color:#fff;font-weight:bold;font-size:13px;margin-bottom:6px;">
                🐵 舰C拦截测试 v1.2
            </div>
            <div style="color:#888;margin-bottom:6px;">
                状态: <span id="kc-status" style="color:#ffd700;">等待游戏请求...</span>
            </div>
            <div id="kc-logs"></div>
        `;

        if (document.body) {
            document.body.appendChild(panel);
        } else {
            const waitBody = setInterval(() => {
                if (document.body) {
                    clearInterval(waitBody);
                    document.body.appendChild(panel);
                }
            }, 500);
        }
    }

    function addLog(msg) {
        if (!panel) createPanel();
        const logs = panel.querySelector('#kc-logs');
        const status = panel.querySelector('#kc-status');
        if (status) status.textContent = '工作中 ✅';
        if (logs) {
            logCount++;
            const entry = document.createElement('div');
            entry.style.cssText = 'margin-bottom:5px;border-bottom:1px solid #333;padding-bottom:4px;';
            entry.innerHTML = `<span style="color:#888;">#${logCount}</span> ${msg}`;
            logs.prepend(entry);
            while (logs.children.length > 10) {
                logs.removeChild(logs.lastChild);
            }
        }
    }

    const OriginalXHR = window.XMLHttpRequest;

    function FakeXHR() {
        const xhr = new OriginalXHR();
        const self = this;

        xhr.addEventListener('load', function() {
            try {
                const url = xhr.responseURL || '';
                if (url.includes('kcsapi') || url.includes('api_port')) {
                    let preview = '';
                    try {
                        preview = xhr.responseText.substring(0, 80).replace(/\s+/g, ' ');
                    } catch(e) {
                        preview = '(无法读取)';
                    }
                    const apiName = url.split('/').pop().split('?')[0];
                    addLog(`<span style="color:#00ff41;">拦截成功</span><br>API: <span style="color:#fff;">${apiName}</span><br>预览: ${preview}...`);
                }
            } catch (e) {}
        });

        return new Proxy(xhr, {
            get(target, prop) {
                if (typeof target[prop] === 'function') {
                    return target[prop].bind(target);
                }
                return self[prop] !== undefined ? self[prop] : target[prop];
            },
            set(target, prop, value) {
                self[prop] = value;
                target[prop] = value;
                return true;
            }
        });
    }

    window.XMLHttpRequest = FakeXHR;

    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            const url = typeof args[0] === 'string' ? args[0] : '';
            if (url.includes('kcsapi') || url.includes('api_port')) {
                try {
                    const clone = response.clone();
                    const text = await clone.text();
                    const apiName = url.split('/').pop().split('?')[0];
                    addLog(`<span style="color:#00ff41;">[fetch] 拦截</span> ${apiName}`);
                } catch(e) {}
            }
            return response;
        };
    }

    createPanel();
    addLog('<span style="color:#ffd700;">脚本已激活，等待舰C请求...</span>');

})();
