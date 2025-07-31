// ==UserScript==
// @name         Cyber HUD Widget (Black & White Minimal Optimized V3)
// @namespace    https://github.com/votre-projet
// @version      1.4.0
// @description  Minimalist, ultra-reliable security widget for web pages – optimized to filter known domains and standard requests.
// @author       robinviola
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ======= CONFIGURATION =======
    const WHITELIST_DOMAINS = [
        location.hostname,
        'cdnjs.cloudflare.com',
        'fonts.googleapis.com',
    ];
    const KNOWN_DOMAINS = [
        'amazon.fr', 'amazon.com', 'google.com', 'google.fr', 'gstatic.com', 'facebook.com',
        'twitter.com', 'instagram.com', 'microsoft.com', 'apple.com', 'bing.com',
        'yahoo.com', 'cloudfront.net', 'cdn.jsdelivr.net', 'github.com', 'githubusercontent.com',
    ];
    const STATIC_EXTENSIONS = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
        '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.map',
        '.mp4', '.webm', '.mp3', '.ogg', '.wav', '.m4a',
    ];

    // ======= UTILS =======
    function isHttpProtocol() {
        return location.protocol === 'http:';
    }
    function getPasswordFields() {
        return Array.from(document.querySelectorAll('input[type="password"]'));
    }
    function getTextFields() {
        return Array.from(document.querySelectorAll('input[type="text"], textarea'));
    }
    function isDomainWhitelisted(url) {
        try {
            const u = new URL(url, location.origin);
            return WHITELIST_DOMAINS.some(domain =>
                u.hostname === domain || u.hostname.endsWith('.' + domain)
            );
        } catch {
            return false;
        }
    }
    function isKnownDomain(url) {
        try {
            const u = new URL(url, location.origin);
            return KNOWN_DOMAINS.some(domain =>
                u.hostname === domain || u.hostname.endsWith('.' + domain)
            );
        } catch {
            return false;
        }
    }
    function isStaticResource(url) {
        try {
            const u = new URL(url, location.origin);
            const pathname = u.pathname.toLowerCase();
            return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
        } catch {
            return false;
        }
    }
    function sanitizeHTML(str) {
        return str.replace(/[<>&"'`]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
        })[c]);
    }

    // ======= WIDGET =======
    const WIDGET_ID = 'cyber-hud-widget';
    let state = {
        httpAlert: false,
        passwordCount: 0,
        xssDetected: false,
        xssFields: [],
        unknownRequests: [],
        lastXssChecked: new WeakSet(),
    };

    function createWidget() {
        if (document.getElementById(WIDGET_ID)) return;
        const widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.innerHTML = `
            <div id="cyber-hud-log" style="margin-bottom:8px;"></div>
            <button id="cyber-hud-reanalyse" style="background:transparent;border:1px solid #fff;color:#fff;padding:2px 8px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:14px;transition:background .1s;">🔍 Re-analyze</button>
        `;
        Object.assign(widget.style, {
            position: 'fixed',
            bottom: '20px',
            right: '24px',
            zIndex: 2147483647,
            background: '#101010e0',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '15px',
            border: '1.5px solid #fff',
            borderRadius: '8px',
            boxShadow: '0 0 14px #000a',
            padding: '17px 20px',
            minWidth: '200px',
            maxWidth: '340px',
            userSelect: 'none',
            letterSpacing: '0.04em',
        });
        document.body.appendChild(widget);
        document.getElementById('cyber-hud-reanalyse').onclick = runSecurityAnalysis;
        document.getElementById('cyber-hud-reanalyse').onmouseenter = function () {
            this.style.background = "#fff";
            this.style.color = "#101010";
        };
        document.getElementById('cyber-hud-reanalyse').onmouseleave = function () {
            this.style.background = "transparent";
            this.style.color = "#fff";
        };
    }

    function updateWidget() {
        const log = document.getElementById('cyber-hud-log');
        if (!log) return;
        log.innerHTML = `
            <div style="font-size:13px;opacity:0.7;">${new Date().toLocaleTimeString()}</div>
            <div>Protocol: <b style="color:${state.httpAlert ? '#fff' : '#fff'};background:${state.httpAlert ? '#b30000' : '#222'};padding:0 5px;border-radius:3px;">${isHttpProtocol() ? 'HTTP ⚠️' : 'HTTPS'}</b></div>
            <div>Password fields: <span>${state.passwordCount}</span></div>
            <div>XSS detected: <b style="color:${state.xssDetected ? '#b30000' : '#fff'};background:${state.xssDetected ? '#fff' : '#222'};padding:0 5px;border-radius:3px;">${state.xssDetected ? 'YES ⚠️' : 'NO'}</b></div>
            ${state.xssDetected ? `<div style="margin-left:12px;font-size:13px;">Fields: ${state.xssFields.map(f => `<code>${sanitizeHTML(f.name || f.id || '[unnamed]')}</code>`).join(', ')}</div>` : ''}
            <div>Potentially suspicious requests: <b style="color:${state.unknownRequests.length ? '#b30000' : '#fff'};background:${state.unknownRequests.length ? '#fff' : '#222'};padding:0 5px;border-radius:3px;">${state.unknownRequests.length}</b></div>
            ${state.unknownRequests.length ? `<div style="margin-left:12px;font-size:13px;">${state.unknownRequests.map(req => `<code>${sanitizeHTML(req)}</code>`).join('<br>')}</div>` : ''}
        `;
    }

    // ======= ANALYSIS =======
    function analyseProtocol() {
        state.httpAlert = isHttpProtocol();
    }
    function analysePasswordFields() {
        state.passwordCount = getPasswordFields().length;
    }
    function analyseXSS() {
        state.xssDetected = false;
        state.xssFields = [];
        const payload = "<svg/onload=alert('xss')>";
        getTextFields().forEach(field => {
            if (state.lastXssChecked.has(field)) return;
            try {
                if (field.disabled || field.readOnly || field.offsetParent === null) return;
                const oldValue = field.value;
                field.value = payload;
                if (field.value === payload) {
                    state.xssDetected = true;
                    state.xssFields.push(field);
                }
                field.value = oldValue;
                state.lastXssChecked.add(field);
            } catch {}
        });
    }
    function monitorRequests() {
        if (!window._cyberHudFetchPatched) {
            const origFetch = window.fetch;
            window.fetch = function (...args) {
                const url = args[0];
                if (
                    typeof url === 'string'
                    && !isDomainWhitelisted(url)
                    && !isKnownDomain(url)
                    && !isStaticResource(url)
                    && !state.unknownRequests.includes(url)
                ) {
                    state.unknownRequests.push(url);
                    updateWidget();
                }
                return origFetch.apply(this, args);
            };
            window._cyberHudFetchPatched = true;
        }
        if (!window._cyberHudXhrPatched) {
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                if (
                    typeof url === 'string'
                    && !isDomainWhitelisted(url)
                    && !isKnownDomain(url)
                    && !isStaticResource(url)
                    && !state.unknownRequests.includes(url)
                ) {
                    state.unknownRequests.push(url);
                    updateWidget();
                }
                return origOpen.apply(this, [method, url, ...rest]);
            };
            window._cyberHudXhrPatched = true;
        }
    }

    // ======= EXECUTION =======
    function runSecurityAnalysis() {
        analyseProtocol();
        analysePasswordFields();
        analyseXSS();
        updateWidget();
    }

    // ======= INITIALIZATION =======
    let debounceTimeout = null;
    function debounceAnalysis() {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(runSecurityAnalysis, 300);
    }

    function init() {
        createWidget();
        monitorRequests();
        runSecurityAnalysis();
        const observer = new MutationObserver(debounceAnalysis);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
