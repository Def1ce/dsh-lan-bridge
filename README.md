# dsh-lan-bridge

A LAN bridge for the [DeepSeek Harness](https://github.com/deepseek-ai/dsh) web GUI (and any other local web app). One command, **zero dependencies**.

It injects a [`crypto.randomUUID`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) polyfill into the served HTML, so the harness UI works over **plain HTTP** on your phone — **no certificates, no warnings, no public tunnels**, works on old iOS too.

| 简体中文 | English |
| --- | --- |
| [中文说明](#中文说明) | [English](#english) |

---

## 中文说明

### 为什么会有这个项目

用手机访问 dsh 网页界面时会碰到一个隐蔽的坑：

```
crypto.randomUUID is not a function. (In 'crypto.randomUUID()', 'crypto.randomUUID' is undefined)
```

原因：

1. dsh 前端代码大量调用 `crypto.randomUUID()`（生成 RPC 消息 ID）。
2. 这个函数**只在 HTTPS（或 localhost）安全上下文中存在**，普通 `http://` 下是 `undefined`。
3. 更糟的是 **iOS 15.4 以下的 Safari/浏览器根本没有这个函数**，连 HTTPS 都没用。
4. 想补 HTTPS？自签名证书在 **iOS Safari 里会直接拒绝打开，连"继续访问"按钮都没有**；正式证书又要域名/公网。

于是手机访问陷入死循环：`http` 打不开功能，`https` 打不开网页。

### 解决办法

`crypto.getRandomValues()` 是**所有浏览器、所有环境**（包括 http、老 iOS）都有的 API。本项目在代理的页面里注入一段**极小的 polyfill**，用 `getRandomValues` 实现 `randomUUID`：

```js
if (typeof crypto === 'object' && crypto && !crypto.randomUUID && crypto.getRandomValues) {
  crypto.randomUUID = function () { /* 用 getRandomValues 生成 UUID v4 */ };
}
```

于是**纯 HTTP 就能完整使用 dsh**：零证书、零警告、任何浏览器、任何 iOS 版本。

### 安装与使用

```bash
# 本地直接运行（无需安装，dsh 默认在 127.0.0.1:3080）
npx dsh-lan-bridge

# 或安装后使用
npm install -g dsh-lan-bridge
dsh-lan-bridge

# 自定义参数
dsh-lan-bridge --backend http://127.0.0.1:3080 --http-port 8088
```

启动后，**手机连同一 WiFi**，打开：

```
http://<电脑局域网IP>:8088
```

例：`http://192.168.1.100:8088` —— 直接可用，无需任何设置（WebSocket 实时通道已自动转发）。

> 获取电脑局域网 IP：Windows 运行 `ipconfig`，找"IPv4 地址"。

### 桌面一键启动（Windows）

见 [`examples/launcher.bat`](examples/launcher.bat) —— 双击即可检查/启动 dsh 与 dsh-lan-bridge。

### 参数

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| `--backend <url>` | 要代理的后端 | `http://127.0.0.1:3080` |
| `--http-port <n>` | 监听端口 | `8088` |
| `--host <addr>` | 绑定地址 | `0.0.0.0` |
| `--help, -h` | 帮助 | |

### 安全提醒

- dsh 网页**没有登录认证**。本工具只适合在**可信局域网**内使用。
- 请不要把局域网端口直接暴露到公网（没有认证 = 控制权）。

### 许可证

MIT

---

## English

### Why this exists

Accessing the DeepSeek Harness web UI from a phone hits a nasty trap:

```
crypto.randomUUID is not a function
```

- The harness client calls `crypto.randomUUID()` for RPC/message ids.
- That function **only exists in secure contexts (HTTPS or localhost)**; under plain `http://` it is `undefined`.
- Worse, **Safari/iOS before 15.4 does not have it at all** — even over HTTPS.
- Adding HTTPS with a self-signed cert doesn't help on **iOS Safari, which hard-blocks invalid certificates with no "proceed anyway" button**; a trusted cert needs a real domain/public setup.

So phones are stuck: `http` breaks the app, `https` breaks the page.

### The fix

`crypto.getRandomValues()` exists **everywhere** (http, old iOS, every browser). This project injects a tiny polyfill that implements `randomUUID` on top of it, so the UI works over **plain HTTP** — zero certificates, zero warnings, any browser, any iOS.

### Usage

```bash
npx dsh-lan-bridge                        # dsh default backend :3080
# or
npm install -g dsh-lan-bridge && dsh-lan-bridge
dsh-lan-bridge --backend http://127.0.0.1:3080 --http-port 8088
```

Then, on a phone on the same Wi-Fi, open:

```
http://<your-lan-ip>:8088
```

No setup at all. WebSocket streams are forwarded automatically.

Find your LAN IP with `ipconfig` (Windows) / `ip addr` (Linux) / System Settings (macOS).

### Security note

The harness UI has **no authentication**. Use this only on a trusted LAN, and do not expose the LAN port to the public internet (no auth means full control).

### License

MIT
