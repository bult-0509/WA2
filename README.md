# WEMOVE SPORTS

Next.js + NestJS + PostgreSQL 网站重构工程。第一阶段已贯通后台商品维护、公开目录与详情、联系留资、后台处理。真实邮件和交易服务尚未接通，完整需求仍保留在追踪表。

官网与后台界面支持 English／中文切换。语言偏好保存在 `wm_locale` Cookie 中，刷新和页面跳转后继续生效；后台录入的商品及品牌正文按原录入语言展示。

## 直接运行

本机依赖、数据库和开发账号已准备好。双击项目根目录中的 `start.bat` 即可一键启动；首次运行若缺少 `.env`，批处理会生成随机本机开发凭据。如果是全新设备，仍需先准备项目本地 PostgreSQL 二进制并执行 `scripts/initialize-postgres.ps1` 与 `npm.cmd run db:setup`。也可在命令行手动执行：

```powershell
& .\scripts\local-postgres.ps1 -Action start
npm.cmd run dev
```

- 官网：http://127.0.0.1:3100/
- 后台：http://127.0.0.1:3100/admin/login
- 工程状态：http://127.0.0.1:3100/dev-status

后台开发账号保存在 .local/dev-admin.json。登录需要邮箱、密码和动态验证码；执行 `npm.cmd run admin:code` 获取当前验证码。同一码成功使用后不可重放，请等待下一周期。

后台 Products 创建草稿，补全主图、卖点、安全说明和 SEO 后发布，官网随即展示。Contact 提交后在 Inquiries 查看编号、更新状态和备注；Homepage 修改首页文案；Activity 查看操作记录。当前包含 24 件演示商品及配套图片，商品清单位于 `data/products.mjs`；执行 `npm.cmd run db:products` 可重复恢复或更新这批商品。

## 内部资料

- `docs/WEMOVE大模型辅助开发说明.md`：课程验收使用的大模型辅助与提示词微调说明。
- 项目需求理解.md：开发理解与决策背景，不是课程交付报告。
- docs/需求追踪.csv：198 个原始需求编号及阶段覆盖范围。
- docs/运行准备.md：环境、启动、凭据与迁移说明。
- docs/阶段一验证.md：25 项真实数据库集成测试及浏览器检查。
- docs/WEMOVE体育用品宣传网站项目验收讲解文档.docx：面向教师的框架、流程与原理讲解稿。
- design-system/wemove/MASTER.md：UI 基线与当前实现边界。

源码在 apps/web、apps/api，迁移在 database/migrations。验证命令：`npm.cmd run check:comments`、`npm.cmd run typecheck`、`npm.cmd run build`、`npm.cmd run check:runtime`、`npm.cmd run test:catalog`。其中注释率按纯注释行除以全部非空源码行计算，当前为 35.13%。生产构建前关闭开发进程，避免同时写入 .next。
