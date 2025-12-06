# 资源系统 (Asset System)

这是一个可扩展的游戏资源加载和管理系统，支持多种资源类型，让游戏从简单形状进化到真正的像素艺术风格。

## 快速切换资源模式

游戏支持两种渲染模式，通过环境变量切换：

```bash
# 使用 SVG 矢量图（默认）
npm run dev

# 使用 Canvas 形状渲染
VITE_ASSET_TYPE=canvas npm run dev
```

或者在 `.env` 文件中设置：

```env
# 可选值: 'svg' (默认) 或 'canvas'
VITE_ASSET_TYPE=svg
```

## 设计理念

遵循**业界最佳实践**（参考 Phaser、PixiJS）：

1. **预加载机制** - 所有资源在游戏开始前加载完毕
2. **统一资源缓存** - 通过 `key` 引用资源，不关心底层实现
3. **渐进增强** - 默认使用 Canvas 形状，可逐步替换为图片
4. **向后兼容** - 不破坏现有代码

## 支持的资源类型

| 类型 | 用途 | 文件格式 |
|------|------|----------|
| `CANVAS` | 程序化绘图（当前系统） | 代码定义 |
| `IMAGE` | 静态精灵图 | PNG, JPG, WEBP |
| `SPRITESHEET` | 帧动画 | PNG (多帧合并) |
| `SVG` | 矢量图形 | SVG |
| `ANIMATED_IMAGE` | 动图 | GIF, APNG |

## 快速开始

### 1. 使用默认形状（零配置）

```typescript
import { assetManager, DEFAULT_CANVAS_ASSETS } from './assets';

// 初始化默认资源
await assetManager.init(DEFAULT_CANVAS_ASSETS);

// 绘制敌人
assetManager.draw(ctx, 'enemy_balloon', x, y);
```

### 2. 添加图片资源

```typescript
import { assetManager, DEFAULT_CANVAS_ASSETS, AssetSourceType } from './assets';

// 自定义图片资源
const customAssets = [
  {
    key: 'enemy_balloon', // 覆盖默认的 Canvas 资源
    sourceType: AssetSourceType.IMAGE,
    url: '/sprites/enemies/balloon.png',
  },
];

// 合并资源（图片覆盖同名形状）
await assetManager.init([...DEFAULT_CANVAS_ASSETS, ...customAssets]);
```

### 3. 使用 Spritesheet 动画

```typescript
import { assetManager, AssetSourceType, AnimationDef } from './assets';

// 定义 spritesheet
const assets = [
  {
    key: 'player_sheet',
    sourceType: AssetSourceType.SPRITESHEET,
    url: '/sprites/player.png',
    frameWidth: 32,
    frameHeight: 32,
    framesPerRow: 4,
  },
];

// 定义动画
const animations: AnimationDef[] = [
  {
    key: 'player_walk',
    assetKey: 'player_sheet',
    frames: [0, 1, 2, 3],
    frameRate: 8,
    loop: true,
  },
];

await assetManager.init(assets, animations);

// 在渲染中使用
const animState = createAnimationState('player_walk');
assetManager.drawAnimated(ctx, animState, x, y, deltaMs);
```

## 文件结构

```
assets/
├── index.ts       # 统一导出
├── types.ts       # 类型定义
├── loader.ts      # 资源加载器
├── manager.ts     # 资源管理器（单例）
├── defaults.ts    # 默认 Canvas 资源
├── examples.ts    # 使用示例
└── README.md      # 本文档

public/
└── sprites/       # 放置图片资源
    ├── players/
    ├── enemies/
    ├── items/
    └── tiles/
```

## 资源命名约定

| 实体类型 | 资源键格式 | 示例 |
|---------|-----------|------|
| 敌人 | `enemy_{type}` | `enemy_balloon`, `enemy_boss_slime` |
| 玩家 | `player_{id}` | `player_1`, `player_2` |
| 道具 | `item_{type}` | `item_BOMB_UP`, `item_SPEED_UP` |
| 炸弹 | `bomb_{variant}` | `bomb_normal`, `bomb_mega` |
| 爆炸 | `explosion_{part}` | `explosion_center`, `explosion_end_up` |
| 地砖 | `tile_{type}` | `tile_floor`, `tile_wall_soft` |

## 加载进度

```typescript
await assetManager.init(assets, [], (progress) => {
  console.log(`加载中: ${progress.percent}% - ${progress.current}`);
  // 更新加载界面
  loadingBar.style.width = `${progress.percent}%`;
});
```

## 主题系统

支持通过主题切换整套视觉风格：

```typescript
import { ThemeConfig } from './assets';

const retroTheme: ThemeConfig = {
  players: {
    1: { idle: 'retro_player_1', walk: 'retro_player_1_walk' },
    2: { idle: 'retro_player_2', walk: 'retro_player_2_walk' },
  },
  enemies: {
    BALLOON: { idle: 'retro_balloon' },
    // ...
  },
  // ...
};

assetManager.setTheme(retroTheme);
```

## 推荐的素材来源

### 免费素材
- [OpenGameArt](https://opengameart.org/) - 开源游戏素材
- [itch.io Game Assets](https://itch.io/game-assets/free) - 独立开发者素材
- [Kenney Assets](https://kenney.nl/assets) - 高质量免费素材

### 像素艺术工具
- [Aseprite](https://www.aseprite.org/) - 专业像素画编辑器
- [Piskel](https://www.piskelapp.com/) - 免费在线工具
- [GraphicsGale](https://graphicsgale.com/) - 免费动画编辑

### Spritesheet 生成
- [TexturePacker](https://www.codeandweb.com/texturepacker) - 自动打包工具
- [ShoeBox](https://renderhjs.net/shoebox/) - 免费 spritesheet 工具

## 性能建议

1. **使用 Spritesheet** - 减少 HTTP 请求，GPU 纹理切换更少
2. **合理尺寸** - 32x32 或 48x48 像素足够，不需要高分辨率
3. **预加载** - 所有资源在游戏开始前加载完毕
4. **使用 WEBP** - 比 PNG 更小，现代浏览器都支持

## 未来扩展

- [ ] 支持 Spine 骨骼动画
- [ ] 支持 DragonBones
- [ ] 资源热重载（开发模式）
- [ ] 多分辨率支持（@2x, @3x）
- [ ] 资源包打包工具
