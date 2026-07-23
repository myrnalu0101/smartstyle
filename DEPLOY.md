# 智绘衣橱 后端上云部署（Render）

把后端从本地搬到 Render 免费托管，小程序连云端 API。

## 一、准备：把项目推到 GitHub

Render 从 GitHub 拉代码，所以先建仓库：

```bash
cd "c:/Users/150254/Desktop/项目/智慧衣橱"
git init
git add .
git commit -m "smartstyle init"
# 在 GitHub 新建空仓库 smartstyle，然后：
git remote add origin https://github.com/<你的用户名>/smartstyle.git
git branch -M main
git push -u origin main
```

> 注意 `.gitignore` 已忽略 `node_modules`、`server/data/`、`server/uploads/`、`server/.env`，不会把本地数据和密钥推上去。

## 二、在 Render 创建 Web Service

1. 注册/登录 https://render.com ，New → **Web Service** → 连接上面的 GitHub 仓库。
2. 填写配置：

| 项 | 值 |
|---|---|
| Name | `smartstyle-api` |
| **Root Directory** | `server` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

3. 环境变量（Environment → Add）：

| Key | Value |
|---|---|
| `JWT_SECRET` | 一串随机字符串（如 `smartstyle-prod-xxxx`） |
| `PORT` | （可不填，Render 自动注入） |

4. Create Web Service。构建部署完成后，Render 给你一个域名，如 `https://smartstyle-api.onrender.com`。

## 三、配置持久磁盘（存数据库 + 图片，防重启丢失）

Free 实例默认无持久卷，重启后 `data/`、`uploads/` 会丢。Render 免费层不支持磁盘，**若要持久化需升级 Starter（约 $5/月）**：
- 服务 → Disks → Add Disk
- Mount Path 填 `/opt/render/project/src/data`（即 `server/data`），再加一块 `…/uploads`。
- 或退一步：免费层仅做功能验证，数据重启后清空，可接受。

## 四、改小程序连云端

打开 [utils/config.js](utils/config.js)，把 `SERVER_ORIGIN` 改成 Render 给的域名：

```js
const SERVER_ORIGIN = 'https://smartstyle-api.onrender.com';
```

## 五、微信开发者工具配置

云端是 HTTPS 域名，但小程序正式调用前要在后台加白名单：

1. **开发期**（开发者工具里调试）：详情 → 本地设置 → 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。这样开发版直接能用云端域名调通。
2. **体验版/正式版**：登录 https://mp.weixin.qq.com → 开发管理 → 开发设置 → 服务器域名 → request 合法域名里加 `https://smartstyle-api.onrender.com`（域名需已备案；`.onrender.com` 这类境外域名备案受限，正式发布需换成自己已备案域名或改用方案 B/C）。

## 六、验证

- 后端健康检查：浏览器访问 `https://smartstyle-api.onrender.com/api/health` → 应返回 `{"status":"ok",...}`
- 小程序登录：账号 `123456`、密码 `123456`，邮箱框填 `123456` 点登录。
- 首次部署时服务端日志会打印 `✓ 内置管理员账号已创建`。

## 备注

- `npm start` 依赖 `server/package.json` 的 `build`（`tsc`）产物 `dist/`，已在 Build Command 里执行。
- 上传图片会返回完整 `https://...onrender.com/uploads/xxx.png`，小程序 `<image>` 可直接加载。
- 若免费层休眠（15 分钟无请求会自动停机，首次唤醒约 30–50 秒冷启动），登录会先卡一会儿，属正常现象。
