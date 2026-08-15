# About dsh-lan-bridge

**让 DeepSeek Harness 网页界面在手机上"开箱即用"。**

| | |
| --- | --- |
| 类型 | DeepSeek Harness 插件 + 轻量反向代理 |
| 语言 | JavaScript（Node.js ≥ 18，零运行时依赖） |
| 许可证 | MIT |

## 它解决什么问题

用手机（尤其 iPhone）访问 dsh 网页界面时，几乎必然遇到：

```
crypto.randomUUID is not a function
```

因为 dsh 前端依赖 `crypto.randomUUID()`，而这个函数：
- **只在 HTTPS 或 localhost 下存在**——纯 HTTP 局域网访问时是 `undefined`；
- **iOS 15.4 以下根本没有**——连 HTTPS 也救不了；
- 而 iOS Safari 又会**直接拒绝自签名证书**，连"继续访问"的按钮都不给。

于是手机陷入死循环：`http` 打不开功能，`https` 打不开网页。

## 它是怎么解决的

`crypto.getRandomValues()` 是**所有浏览器、所有环境**都有的老 API。本项目在 dsh 返回的页面里注入一段**极小的 polyfill**，用 `getRandomValues` 实现 `randomUUID`——**一行补丁，彻底绕开证书、HTTPS、浏览器策略和系统版本问题**。

两种用法，按需选择：

1. **dsh 插件（推荐）**：装进 harness 后，dsh 通过 `webServer.tapIndex` 自己注入补丁——**零额外进程**，手机直接打开 dsh 端口（`http://<IP>:3080`）即可。
2. **独立 CLI 代理**：`bin/dsh-bridge.cjs` 代理任何本地 Web 应用，补丁注入 + WebSocket 转发，手机打开 `http://<IP>:8088`。

## 核心理念

- **零依赖、零证书、零配置**——一条命令，手机就能用。
- **只服务可信局域网**——dsh 本身没有登录认证，请勿把端口暴露到公网。
- **开源、可审计**——全部代码只有几百行，MIT 许可。

---

# About dsh-lan-bridge (English)

**Make the DeepSeek Harness web UI work on phones out of the box.**

| | |
| --- | --- |
| Type | DeepSeek Harness plugin + lightweight reverse proxy |
| Language | JavaScript (Node.js ≥ 18, zero runtime dependencies) |
| License | MIT |

## The problem

Opening the dsh web UI on a phone (especially iPhone) almost always hits:

```
crypto.randomUUID is not a function
```

The harness frontend depends on `crypto.randomUUID()`, which:
- exists **only in secure contexts (HTTPS or localhost)** — `undefined` over plain LAN HTTP;
- is **missing entirely on iOS < 15.4** — HTTPS alone doesn't help;
- and iOS Safari **hard-blocks self-signed certificates** with no "proceed anyway" button.

Phones are stuck in a loop: `http` breaks the app, `https` breaks the page.

## The fix

`crypto.getRandomValues()` works **everywhere**. This project injects a tiny polyfill that implements `randomUUID` on top of it — one small patch that sidesteps certs, HTTPS, browser policy, and OS version entirely.

Two ways to use it:

1. **dsh plugin (recommended)** — the harness injects the polyfill itself via `webServer.tapIndex`; no extra process, the phone opens dsh's own port (`http://<ip>:3080`).
2. **Standalone CLI proxy** — `bin/dsh-bridge.cjs` proxies any local web app with the polyfill and WebSocket forwarding; the phone opens `http://<ip>:8088`.

## Principles

- **Zero dependencies, zero certs, zero config** — one command, done.
- **Trusted LAN only** — the harness UI has no authentication; never expose it to the public internet.
- **Open & auditable** — a few hundred lines of MIT-licensed code.
