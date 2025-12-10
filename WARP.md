# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 项目概述

Bubble Couple 是一个实时多人炸弹人风格游戏，采用 pnpm monorepo 架构：
- **client**: React 19 + Vite + TypeScript 前端
- **server**: Colyseus + Express 游戏服务器

支持本地多人（共享屏幕）和在线多人（WebSocket）两种模式。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发（仅前端本地多人）
pnpm dev

# 开发（前端+服务器在线多人）
pnpm dev:all
# 或分开运行：
pnpm dev:server  # 终端1: Colyseus 服务器 (端口 2567)
pnpm dev         # 终端2: Vite 前端 (端口 3000)

# 构建
pnpm build          # 仅前端
pnpm build:all      # 前端+服务器

# Docker 部署
docker-compose up -d
```

## 架构要点

### 双模式游戏引擎
- **本地模式**: `client/src/hooks/useGameEngine.ts` - 自包含游戏引擎
- **在线模式**: `server/src/rooms/BubbleRoom.ts` 为权威服务器，`client/src/hooks/useOnlineGame.ts` 处理客户端预测

### 关键性能模式
**必须使用 React ref 存储游戏状态，禁止使用 useState**：
```typescript
// ✅ 正确：refs 用于游戏循环
const gameStateRef = useRef<GameState>({ ... });

// ❌ 错误：state 会导致 60 FPS 重渲染
const [gameState, setGameState] = useState<GameState>({ ... });
```
仅 UI 数据（HUD、菜单）使用 `useState`。

### 网格系统
- 15×13 格子 (`GRID_W` × `GRID_H`)
- 坐标转换使用 `utils/gameUtils.ts` 中的 `getPixelCoords()` / `getGridCoords()`

### 状态同步
- Colyseus Schema 使用 `@type` 装饰器自动同步
- 客户端通过 `room.send("input", {...})` 发送输入

## 开发规范

### 文件组织约定
- `client/src/hooks/`: 游戏逻辑 hooks (use\*Engine, use\*Game)
- `client/src/components/`: React 组件
- `server/src/rooms/`: Colyseus 房间逻辑 + Schema 定义
- `client/src/types.ts` 和 `client/src/constants.ts`: 客户端/服务器共享类型（需保持同步）

### 添加新功能流程
**新敌人类型**:
1. `types.ts` 添加 `EnemyType` 枚举
2. `constants.ts` 添加 `ENEMY_STATS`
3. `useGameEngine.ts` → `updateEnemies()` 实现 AI
4. `server/src/rooms/BubbleRoom.ts` 镜像逻辑
5. 两个 Canvas 组件添加渲染

**新道具**:
1. `types.ts` 添加 `ItemType` 枚举
2. `utils/gameUtils.ts` 和 `server/src/utils/gameLogic.ts` 更新 `applyItemEffect()`

### 调试在线多人
- Colyseus Monitor: `http://localhost:2567/colyseus` (仅开发模式)
- 服务器日志在 `BubbleRoom.ts` 中使用 `console.log()`

## 反模式警告

- ❌ 不要用 `useState` 存储游戏实体（玩家、炸弹、敌人）
- ❌ 不要直接修改 Colyseus schema 对象，使用构造函数 `new PlayerSchema()`
- ❌ 修改类型时必须同步 `types.ts` 和 `server/src/utils/` 中的常量
- ❌ 游戏逻辑不要放在 React 组件中，应放在 hooks 或 utils

## 环境变量

客户端 `.env.local`:
```env
VITE_WS_URL=ws://localhost:2567
```

## 回复语言

永远用中文回复我。
