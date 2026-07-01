/**
 * ============================================================
 *  玩法埋点上报标准实现（report.js）
 * ============================================================
 *
 *  这是经过线上验证的埋点上报标准代码，对接的接口规范见同目录 func.md。
 *
 *  【给 AI 的说明】
 *  - 生成玩法时，请直接复用本文件的全部函数，不要自行重写上报逻辑。
 *  - 尤其是「页面卸载上报」（visibilitychange + pagehide + keepalive），
 *    这是最容易写错导致 exp 停留时长数据丢失的地方，本文件已正确处理，照抄即可。
 *  - 单文件玩法可把本文件内容整段粘进 <script> 里；
 *    多文件玩法可用 <script src="report.js"></script> 引入。
 *
 *  【每个新玩法只需改 3 处】见下方 REPORT_CONFIG。
 * ============================================================
 */

/* ============================================================
 *  ① 配置区：每个新玩法必须修改这里
 * ============================================================ */
const REPORT_CONFIG = {
  // 接口地址：测试环境。正式上线前由 @danilowang / 前端确认是否替换为正式域名。
  api_url: 'https://testuniuni.html5.qq.com/api/external-report/reportExternal',

  // 【必改 1】场景标识：每个玩法定一个，全程不变。小写英文+下划线。
  //          例：'xiaomai_icebreaking'（小麦破冰）、'xianxia'（修仙）、'haiguitang'（海龟汤）
  sceneName: 'your_scene_name',

  // 【必改 2】bot 信息：用于生成回传给对话模型的摘要文本（content 字段）
  bot_name: 'XXX',     // bot 显示名，如 '小麦'
  game_name: 'XXX想了解你多一点', // 玩法名称，用于摘要开头
};

/* ============================================================
 *  ② 基础工具：以下函数无需修改，直接使用
 * ============================================================ */

// 抓取页面 URL 上的全部查询参数，整体透传给后台（含 userToken，无需解析）
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

// 生成一局游戏的唯一标识（contentId），同一局所有上报都用它，后台据此串联事件
function generateContentId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

/* ============================================================
 *  ③ 上报状态：页面进入时初始化一次
 * ============================================================ */
const REPORT_STATE = {
  urlParams: getUrlParams(),
  contentId: generateContentId(),
  pageEnterTime: Date.now(), // 记录进入时间，用于算停留时长
};

/* ============================================================
 *  ④ 通用上报函数（正常运行中调用）
 * ============================================================ */
/**
 * @param {string} eventName  事件名：'pv' / 'exp' / 'xxx_clk'
 * @param {object} [options]
 * @param {boolean} [options.withStayDuration] 是否带停留时长（仅 exp 用 true）
 * @param {string}  [options.content]          回传给对话模型的纯文本摘要
 */
function reportEvent(eventName, options = {}) {
  const body = {
    urlParams: REPORT_STATE.urlParams,
    sceneName: REPORT_CONFIG.sceneName,
    eventName: eventName,
    contentId: REPORT_STATE.contentId,
  };

  if (options.withStayDuration) {
    body.eventTime = Date.now() - REPORT_STATE.pageEnterTime;
  }
  if (options.content) {
    body.content = options.content;
  }

  // 异步上报，失败不阻断玩法主流程
  fetch(REPORT_CONFIG.api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/* ============================================================
 *  ⑤ 页面卸载上报（关键！不要改动逻辑）
 *     浏览器在关页面瞬间会取消普通请求，必须用 keepalive 兜底，
 *     否则 exp（停留时长）这个核心留存指标会大量丢失。
 * ============================================================ */
function reportEventBeacon(eventName, options = {}) {
  const body = {
    urlParams: REPORT_STATE.urlParams,
    sceneName: REPORT_CONFIG.sceneName,
    eventName: eventName,
    contentId: REPORT_STATE.contentId,
  };
  if (options.withStayDuration) {
    body.eventTime = Date.now() - REPORT_STATE.pageEnterTime;
  }
  if (options.content) {
    body.content = options.content;
  }

  // 优先 sendBeacon；不支持时退回 fetch + keepalive
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (navigator.sendBeacon && navigator.sendBeacon(REPORT_CONFIG.api_url, blob)) {
      return;
    }
  } catch (e) {}

  fetch(REPORT_CONFIG.api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/* ============================================================
 *  ⑥ 标准生命周期埋点：直接挂上即可
 * ============================================================ */
// 页面打开 → pv（只报一次）
window.addEventListener('load', () => {
  reportEvent('pv');
});

// 切后台 / 切 tab → exp + 停留时长
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reportEventBeacon('exp', { withStayDuration: true });
  }
});

// 关闭页面 → exp 兜底（keepalive 确保送达）
window.addEventListener('pagehide', () => {
  reportEventBeacon('exp', { withStayDuration: true });
});

/* ============================================================
 *  ⑦ 业务埋点怎么用（示例，按你的玩法替换）
 * ============================================================
 *
 *  // 用户点「开始」
 *  startBtn.addEventListener('click', () => reportEvent('start_clk'));
 *
 *  // 用户点「提交/完成」，并把摘要回传给 bot
 *  reportEvent('submit_clk', { content: buildSummaryText() });
 *
 *  // 用户点「再来一次」：重新开一局时记得刷新 contentId 和计时
 *  function restartGame() {
 *    REPORT_STATE.contentId = generateContentId();
 *    REPORT_STATE.pageEnterTime = Date.now();
 *    reportEvent('retry_clk');
 *  }
 *
 *  -- content 字段（回传给 bot 的摘要）的注意事项 --
 *  1. 必须是纯文本（不是 JSON），最大 10000 字符
 *  2. 不要含 HTML/脚本（后台会做 XSS 过滤）
 *  3. 尽量用规则拼接生成，不要调 LLM
 *  4. 内容是「自然语言叙述」，让 bot 读完能直接开启个性化对话
 * ============================================================
 */
