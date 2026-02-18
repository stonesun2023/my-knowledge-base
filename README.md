# 超级大脑 🚀

> 一个简洁、优雅、功能强大的智能链接管理工具

[![在线访问](https://img.shields.io/badge/在线访问-GitHub%20Pages-brightgreen)](https://stonesun2023.github.io/my-knowledge-base/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ 项目简介

**超级大脑**是一个基于纯前端技术开发的链接收藏和管理工具，帮助你整理、搜索和分类互联网上的知识资源。

🌐 **在线体验：** https://stonesun2023.github.io/my-knowledge-base/

---

## 🎯 核心特性

### 📝 链接管理
- ✅ 快速添加链接（URL + 标题 + 笔记）
- ✅ 编辑和删除已保存的链接
- ✅ 数据持久化存储（localStorage）

### 🔍 强大的搜索和筛选
- ✅ 实时搜索（支持标题、URL、笔记）
- ✅ 关键词高亮显示
- ✅ 7 种预设标签分类
- ✅ 标签筛选（可与搜索联动）

### 💾 数据安全
- ✅ 一键导出所有数据（JSON 格式）
- ✅ 智能导入（支持合并和替换）
- ✅ 自动去重功能
- ✅ 数据永不丢失

### 🎨 优秀体验
- ✅ 苹果风格设计
- ✅ 流畅的动画效果
- ✅ 响应式布局
- ✅ 优雅的空状态提示

---

## 🚀 快速开始

### 在线使用

直接访问：https://stonesun2023.github.io/my-knowledge-base/

无需安装，打开即用！

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/stonesun2023/my-knowledge-base.git

# 2. 进入项目目录
cd my-knowledge-base

# 3. 使用 http-server（需要先安装 Node.js）
npm install -g http-server
http-server

# 或者直接在浏览器打开 index.html
```

---

## 📸 功能展示

### 主界面
- 清爽的苹果风格设计
- 一目了然的操作界面

### 标签筛选
- 点击标签按钮快速筛选
- 显示每个标签的链接数量
- 筛选和搜索可以同时使用

### 数据导出/导入
- 一键导出所有数据为 JSON 文件
- 支持从文件恢复数据
- 智能合并，避免重复

### 搜索功能
- 实时搜索，即时响应
- 关键词黄色高亮
- 支持标题、URL、笔记全文搜索

---

## 🛠️ 技术栈

### 前端技术
- **HTML5** - 语义化结构
- **CSS3** - 现代样式和动画
- **JavaScript (ES6+)** - 核心交互逻辑

### 数据存储
- **localStorage** - 浏览器本地存储
- **JSON** - 数据导出格式

### 部署
- **GitHub Pages** - 静态网站托管
- **Git** - 版本控制

### 开发工具
- **VS Code** - 代码编辑器
- **http-server** - 本地开发服务器
- **Node.js & npm** - 工具链

---

## 📂 项目结构

```
my-knowledge-base/
│
├── index.html          # 主页面（包含所有代码）
├── package.json        # npm 配置文件
├── README.md           # 项目说明文档
│
├── hello.js            # Node.js 学习示例
├── file-demo.js        # 文件操作示例
└── output.txt          # 示例输出文件
```

---

## 🎮 使用指南

### 添加链接

1. 在"添加新链接"区域填写信息：
   - **链接 URL**：必填，完整的网址
   - **标题**：必填，给链接起个名字
   - **笔记**：可选，添加备注说明
   - **标签**：可选，选择分类标签

2. 点击"立即收藏"按钮保存

### 搜索链接

- 在搜索框输入关键词
- 实时显示匹配结果
- 匹配的关键词会黄色高亮

### 按标签筛选

- 点击标签按钮（如"AI"、"编程"）
- 只显示该标签的链接
- 点击"全部"恢复显示所有链接

### 编辑链接

1. 点击链接卡片上的"✏️ 编辑"按钮
2. 内容自动填充到表单
3. 修改后点击"立即收藏"完成编辑

### 删除链接

1. 点击链接卡片上的"🗑️ 删除"按钮
2. 确认删除操作
3. 链接立即移除

### 导出数据

1. 点击"📤 导出数据"按钮
2. 自动下载 JSON 文件
3. 文件名格式：`超级大脑备份_2026-2-16.json`

### 导入数据

1. 点击"📥 导入数据"按钮
2. 选择之前导出的 JSON 文件
3. 选择"合并"或"替换"模式
4. 数据自动恢复

---

## 🔧 开发指南

### 环境要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- Node.js 18+ （用于本地开发）

### 本地开发

```bash
# 安装依赖（首次）
npm install

# 启动开发服务器（方式1）
npm start

# 或使用不同端口（方式2）
npm run dev
```

### 部署更新

```bash
# 1. 添加更改
git add .

# 2. 提交
git commit -m "更新说明"

# 3. 推送到 GitHub
git push

# 或使用快捷命令
npm run deploy
```

等待 1-2 分钟，GitHub Pages 会自动部署最新版本。

---

## 📝 开发日志

### v1.2.0 (2026-02-16)
- ✨ 新增数据导出/导入功能
- ✨ 支持 JSON 格式备份
- ✨ 智能合并和去重
- 🔧 优化代码结构
- 📚 添加 Node.js 学习示例

### v1.1.0 (2026-02-16)
- ✨ 新增标签筛选功能
- ✨ 筛选和搜索可以联动
- 🎨 优化代码注释和结构
- 🐛 修复若干 bug

### v1.0.0 (2026-02-15)
- 🎉 项目初始版本
- ✨ 实现链接添加、编辑、删除
- ✨ 实现实时搜索功能
- ✨ 实现标签分类系统
- ✨ 实现数据持久化
- 🎨 苹果风格 UI 设计
- 🚀 部署到 GitHub Pages

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 报告问题

如果发现 bug 或有功能建议，请在 [Issues](https://github.com/stonesun2023/my-knowledge-base/issues) 中提出。

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- 设计灵感来自 Apple 官网
- 感谢所有使用和支持本项目的朋友
- 特别感谢 Claude AI 在开发过程中的指导

---

## 📧 联系方式

- **项目主页：** https://github.com/stonesun2023/my-knowledge-base
- **在线演示：** https://stonesun2023.github.io/my-knowledge-base/
- **问题反馈：** [GitHub Issues](https://github.com/stonesun2023/my-knowledge-base/issues)

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！

---

**用心整理知识，用超级大脑管理世界！** 🚀✨
