# Sprites 目录

在此目录中放置游戏精灵图资源。

## 推荐目录结构

```
sprites/
├── players/       # 玩家角色
│   ├── player1.png
│   ├── player1_sheet.png  # 动画 spritesheet
│   ├── player2.png
│   └── player2_sheet.png
│
├── enemies/       # 敌人
│   ├── balloon.png
│   ├── ghost.png
│   ├── minion.png
│   ├── frog.png
│   ├── tank.png
│   ├── boss_slime.png
│   └── boss_mecha.png
│
├── items/         # 道具
│   ├── bomb_up.png
│   ├── range_up.png
│   ├── speed_up.png
│   ├── kick.png
│   ├── ghost.png
│   └── shield.png
│
├── effects/       # 效果
│   ├── bomb.png
│   ├── explosion_center.png
│   ├── explosion_h.png
│   └── explosion_v.png
│
└── tiles/         # 地形
    ├── floor.png
    ├── wall_hard.png
    └── wall_soft.png
```

## Spritesheet 规格

推荐的 spritesheet 格式：

- **帧尺寸**: 32x32 或 48x48 像素
- **布局**: 4帧/行（走路动画）
- **行顺序**: 下、左、右、上（标准 RPG Maker 格式）

## 颜色调色板

为了保持一致的像素艺术风格，建议使用限制调色板：

- [Pico-8 调色板](https://lospec.com/palette-list/pico-8) (16色)
- [Endesga 32](https://lospec.com/palette-list/endesga-32) (32色)
- [DB32](https://lospec.com/palette-list/dawnbringer-32) (32色)
