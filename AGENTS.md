# IBM PC 5150（1981）装配模拟

复刻 IBM Personal Computer 5150 主板：Intel 8088 @4.77MHz、8253/8237/8259/8255、
IBM BIOS/BASIC ROM、4 组 ×9 片 4164 内存、5 个 ISA 插槽（MDA/FDC 卡垂直插入）、
键盘 DIN、扬声器。POST 阶段内存计数 0→64KB，最后启动 Cassette BASIC。

## 启动方式
- HTTP：`python3 tools/serve.py 8080`（禁缓存）→ http://127.0.0.1:8080
- 双击 index.html：经典 `<script>` 无模块，file:// 行为一致。

## 交互
拖动旋转 / 滚轮缩放 / 点击零件 / 空格暂停 / R 重播 / 1-8 跳阶段
（core → banks → cards → io → power → post → boot → home）。

## 验收
按 6（post）：内存计数到 64KB + BEEP；按 7（boot）：白色文字屏打出
"The IBM Personal Computer Basic ... Ready"。控制台无错误。
