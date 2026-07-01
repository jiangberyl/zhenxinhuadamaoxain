# 落地页数据上报接口使用指南

本文档供产品使用 Skill 生成落地页时参考，指导如何在落地页中接入数据上报能力，包括 **页面埋点上报** 和 **事件回传**。

---

## 接口信息

- **路径**: `POST https://testuniuni.html5.qq.com/api/external-report/reportExternal`
- **Content-Type**: `application/json`

---

## 请求参数

```json
{
  "urlParams": { "...页面 URL 上的全部查询参数，整体透传即可..." },
  "sceneName": "string（必填，场景标识，由页面自定义传入，如 xianxia、wuxia 等）",
  "eventName": "string（必填，事件名称，见下方事件枚举）",
  "eventTime": "number（选填，页面停留时长，单位 ms，仅页面关闭时上报）",
  "content": "string（选填，纯文本描述/摘要，最大 10000 字符，用于带到聊天记录中作为事件描述）",
  "contentId": "string（选填，页面进入时生成的随机字符串，用于标识同一次游戏会话）"
}
```

### 参数说明

| 参数        | 位置 | 类型   | 必填 | 说明                                                                                                                                                                     |
| ----------- | ---- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `urlParams` | body | object | ✅   | **页面 URL 上的全部查询参数，整体透传即可，不需要前端解析。** 其中包含 `userToken`（用户标识）等字段，由上游入口页面在跳转时自动挂载到 URL 上 |
| `sceneName` | body | string | ✅   | 场景标识，由页面自定义传入，用于区分不同游戏/场景类型（如 `xianxia`、`wuxia`）                                                                                          |
| `eventName` | body | string | ✅   | 事件名称，具体取值见「事件枚举」                                                                                                                                         |
| `eventTime` | body | number | ❌   | **页面停留时长（毫秒）**，即从页面打开到关闭的时间差。仅在页面关闭/离开时上报                                                                                            |
| `content`   | body | string | ❌   | 纯文本描述/摘要，用于带到聊天记录中作为事件描述（非 JSON，直接传纯文本即可）                                                                                             |
| `contentId` | body | string | ❌   | 页面进入时生成的随机字符串，用于标识同一次游戏会话，多次上报携带相同 `contentId` 可关联同一局游戏的所有事件                                                                |

### 参数长度限制

| 参数        | 最大长度   |
| ----------- | ---------- |
| `userToken` | 512 字符   |
| `sceneName` | 256 字符   |
| `eventName` | 256 字符   |
| `content`   | 10000 字符 |
| `contentId` | 256 字符   |

---

## 响应格式

**成功：**

```json
{
  "code": 0,
  "msg": "success",
  "data": { "code": 0 }
}
```

**失败：**

```json
{
  "code": -1,
  "msg": "错误信息描述"
}
```

---

## 事件类型与命名规范

### 事件分类

落地页埋点事件分为三类：

| 类型     | 前缀      | 触发时机           | 说明                           |
| -------- | --------- | ------------------ | ------------------------------ |
| 页面访问 | `pv`      | 页面加载完成时     | 固定值，每个页面只上报一次     |
| 页面曝光 | `exp`     | **页面卸载时**上报 | 需携带 `eventTime`（停留时长） |
| 按钮点击 | `xxx_clk` | 用户点击按钮时     | 根据按钮用途命名，支持多种类型 |

### eventName 可选值

#### 固定事件

| eventName | 含义     | 触发时机                                      | 是否携带 eventTime |
| --------- | -------- | --------------------------------------------- | ------------------ |
| `pv`      | 页面 PV  | 页面加载完成时上报，每次访问上报一次          | ❌                 |
| `exp`     | 页面曝光 | **页面卸载时上报**（后台杀掉 APP / 离开页面） | ✅ 停留时长（ms）  |

#### 点击事件（`xxx_clk` 格式）

点击事件命名规则：**`{按钮用途}_clk`**，按钮用途使用小写英文 + 下划线，清晰描述按钮功能。

| eventName    | 含义             | 示例场景                    |
| ------------ | ---------------- | --------------------------- |
| `start_clk`  | 开始游戏按钮点击 | 用户点击「开始游戏」        |
| `next_clk`   | 下一步按钮点击   | 用户点击「下一步」/「继续」 |
| `submit_clk` | 提交按钮点击     | 用户点击「提交」            |
| `share_clk`  | 分享按钮点击     | 用户点击「分享给好友」      |
| `retry_clk`  | 重试按钮点击     | 用户点击「再来一次」        |
| `back_clk`   | 返回按钮点击     | 用户点击「返回」            |

> **命名要求：**
>
> - 统一使用 `{用途}_clk` 格式，如 `start_clk`、`share_clk`
> - 用途部分使用小写英文，多个单词用下划线分隔，如 `add_friend_clk`
> - 不要使用中文或特殊字符
> - 如果页面有自定义按钮，按照同样的规则自行命名即可

### eventTime 说明

`eventTime` 为 **页面停留时长（毫秒）**，即「页面打开 → 页面关闭」的时间差。

- **仅在 `exp`（页面曝光）事件中上报**，其他事件不需要
- 在页面卸载时计算：`eventTime = 当前时间 - 页面打开时间`

---

## 使用场景

### 场景一：页面埋点上报

用于上报页面曝光、点击等行为数据。**不需要** `content` 字段。

#### 1. 获取 URL 参数

页面 URL 上的查询参数整体透传给后台，**不需要逐个解析**：

```javascript
/**
 * 获取页面 URL 上的全部查询参数，整体作为 urlParams 传给后台
 * @returns {object}
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * 生成随机字符串作为 contentId，用于标识同一次游戏会话
 * @returns {string}
 */
function generateContentId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// 页面加载时缓存，避免重复解析
const urlParams = getUrlParams();
// 进入页面时生成本次游戏会话标识
const contentId = generateContentId();
// 场景标识，由页面自定义（如 'xianxia'、'wuxia' 等）
const sceneName = 'your_scene_name';
```

#### 2. 封装上报函数

```javascript
// 记录页面打开时间，用于计算停留时长
const pageEnterTime = Date.now();

/**
 * 数据上报通用函数
 * @param {string} eventName - 事件名称（pv / exp / clk）
 * @param {object} [options] - 可选参数
 * @param {boolean} [options.withStayDuration] - 是否附带停留时长（页面关闭时设为 true）
 * @param {string} [options.content] - 事件描述（纯文本），用于带到聊天记录中
 */
function reportEvent(eventName, options = {}) {
  const body = {
    urlParams,
    sceneName,
    eventName,
    contentId,
  };

  // 页面关闭时附带停留时长
  if (options.withStayDuration) {
    body.eventTime = Date.now() - pageEnterTime;
  }

  // 仅在需要时添加 content
  if (options.content) {
    body.content = options.content;
  }

  return fetch('https://testuniuni.html5.qq.com/api/external-report/reportExternal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) => console.error('上报失败:', err));
}
```

#### 3. 埋点调用示例

```javascript
// ===== 页面 PV 上报 =====
// 页面加载完成时调用，只报一次
window.addEventListener('load', () => {
  reportEvent('pv');
});

// ===== 按钮点击上报 =====
// 每个按钮使用 {用途}_clk 格式命名
document.getElementById('start-game-btn').addEventListener('click', () => {
  reportEvent('start_clk');
});

document.getElementById('next-btn').addEventListener('click', () => {
  reportEvent('next_clk');
});

document.getElementById('share-btn').addEventListener('click', () => {
  reportEvent('share_clk');
});

// ===== 页面曝光 + 停留时长上报（页面卸载时） =====
// 页面隐藏时上报（覆盖切后台、切 tab、关闭等场景）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reportEvent('exp', { withStayDuration: true });
  }
});

// 兜底：页面卸载时上报（使用 fetch + keepalive 确保不丢数据）
window.addEventListener('pagehide', () => {
  const body = JSON.stringify({
    urlParams,
    sceneName,
    eventName: 'exp',
    eventTime: Date.now() - pageEnterTime,
    contentId,
  });

  fetch('https://testuniuni.html5.qq.com/api/external-report/reportExternal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
});
```

---

### 场景二：带描述的事件上报

当需要在聊天记录中展示事件描述时，使用 `content` 字段传入纯文本摘要。

`content` 为**纯文本字符串**（非 JSON），直接传入要展示的描述内容即可，该内容会作为事件描述出现在聊天记录中。

```javascript
// 示例：回传游戏结果描述
reportEvent('game_result', {
  content: '得分：100 分，关卡：3，用时 60 秒',
});

// 示例：回传表单提交描述
reportEvent('form_submit', {
  content: '用户提交了反馈表单，评分 5 星，评论：很好用',
});
```

---

## 注意事项

1. **`urlParams` 整体透传**：将页面 URL 上的全部查询参数作为一个对象整体传给后台即可，不需要前端逐个解析字段。`userToken` 等参数由上游入口页面在跳转时自动挂载到 URL 上
2. **`eventTime` 是停留时长**：值为「页面打开 → 关闭」的毫秒数，仅在页面关闭/离开时上报
3. **离开页面上报使用 `fetch` + `keepalive: true`**，确保页面卸载时请求不被浏览器取消
4. **content 字段最大 10000 字符**，超出会被后台拒绝，请控制回传数据体积
5. **不要在 content 中传入 HTML 或脚本代码**，后台会对所有字符串字段进行 XSS 过滤
6. **`contentId` 在同一次游戏会话中保持不变**：进入页面时生成一个随机字符串，同一页面内所有上报请求都携带相同的 `contentId`，后台可据此关联同一局游戏的所有埋点事件
7. 所有上报均为 **异步非阻塞**，不会影响页面正常交互
8. 上报失败不应影响用户体验，建议对 `reportEvent` 的调用做好异常捕获，不要阻断主流程
