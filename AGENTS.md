这是一个黑客松现场组队的系统，名字叫 HackMate，是一个网页应用。

## 目录结构与文件

- `@docs` 目录下是本系统开发中所需要使用的文档资料
- `@docs/idea.md` 是本项目的初始需求文档，由用户进行编写和维护，对于本产品的创意、要求等信息，都写在本文档内了
- `@docs/draft-edited.md` 中是本系统关键地方的详细设计，`@draft.md` 是它的旧版本，不需要看
- `@docs/test-cases.md` 是本系统的测试用例

## 技术栈

本项目前后端分离，`@backend` 是后端的项目目录，`@frontend` 是前端的项目目录。

### 后端

后端使用 python, fastapi 进行开发，使用 uv 进行 python 环境的管理，数据库使用 sqlite。

### 前端

前端使用 reactjs, vitejs, typescript, tailwindcss, shadcn/ui, lucide-react。 

## 产品设计

- 产品的设计风格为 `@DESIGN.md`，遵守其中的要求来设计本产品

## 本阶段实现要求

- `@docs/idea.md` 中提到的在组队时可以上传文件、图片、视频等，这个功能目前不需要实现，其他功能本阶段都需要实现