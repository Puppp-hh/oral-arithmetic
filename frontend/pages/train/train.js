/**
 * 文件说明：训练页逻辑
 * 系统作用：
 *   1. 配置难度/题型/数量 → 请求出题
 *   2. 逐题展示，计时，接受用户输入
 *   3. 提交答案 → 展示判题结果（对/错 + 正确答案 + 解题步骤）
 *   4. 全部答完后展示本次会话汇总
 *
 * 调用链：
 *   配置 → GET /api/problems/generate?difficulty_level=&count=
 *   答题 → POST /api/problems/submit
 */
const { request } = require('../../utils/request');

// 运算类型选项
const OP_TYPES = [
  { label: '全部',  value: '' },
  { label: '加法',  value: 'addition' },
  { label: '减法',  value: 'subtraction' },
  { label: '乘法',  value: 'multiplication' },
  { label: '除法',  value: 'division' },
  { label: '混合',  value: 'mixed' }
];

Page({
  data: {
    // ── 配置阶段 ──
    phase: 'config',           // 'config' | 'training' | 'summary'
    level: 1,
    opTypeIndex: 0,
    opTypes: OP_TYPES,
    count: 10,
    countOptions: [5, 10, 15, 20],
    countIndex: 1,

    // ── 训练阶段 ──
    problems: [],
    currentIndex: 0,
    currentProblem: null,
    userAnswer: '',
    submitLoading: false,
    showResult: false,
    lastResult: null,          // 上次判题结果
    timer: 0,
    sessionId: '',

    // ── 汇总 ──
    summary: null
  },

  _timerHandle: null,

  onLoad() {
    this.setData({ opTypes: OP_TYPES });
  },

  onUnload() {
    this._clearTimer();
  },

  // ── 配置 ──────────────────────────────────────────────────

  onLevelChange(e) {
    this.setData({ level: Number(e.detail.value) });
  },

  onOpTypeChange(e) {
    this.setData({ opTypeIndex: Number(e.detail.value) });
  },

  onCountChange(e) {
    this.setData({ countIndex: Number(e.detail.value) });
  },

  // ── 开始训练 ──────────────────────────────────────────────

  async onStart() {
    const { level, opTypes, opTypeIndex, countOptions, countIndex } = this.data;
    const opType = opTypes[opTypeIndex].value;
    const count  = countOptions[countIndex];

    wx.showLoading({ title: '出题中...' });
    try {
      const query = `difficulty_level=${level}&count=${count}${opType ? `&operation_type=${opType}` : ''}`;
      const res = await request({ url: `/api/problems/generate?${query}` });
      const problems = res.data.problems;

      if (!problems || problems.length === 0) {
        wx.showToast({ title: '暂无题目，请换一个难度', icon: 'none' });
        return;
      }

      const sessionId = this._makeSessionId();
      this.setData({
        phase: 'training',
        problems,
        currentIndex: 0,
        currentProblem: problems[0],
        userAnswer: '',
        showResult: false,
        lastResult: null,
        sessionId,
        timer: 0
      });
      this._startTimer();

    } catch { /* request 内部已提示 */ } finally {
      wx.hideLoading();
    }
  },

  // ── 答题 ──────────────────────────────────────────────────

  onAnswerInput(e) {
    this.setData({ userAnswer: e.detail.value });
  },

  async onSubmit() {
    const { currentProblem, userAnswer, sessionId } = this.data;

    if (userAnswer.trim() === '') {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    this._clearTimer();
    this.setData({ submitLoading: true });

    try {
      const res = await request({
        url: '/api/problems/submit',
        method: 'POST',
        data: {
          problem_id: currentProblem.problem_id,
          answer_content: userAnswer.trim(),
          answer_time_seconds: this.data.timer,
          session_id: sessionId
        }
      });
      const result = res.data;
      this.setData({ showResult: true, lastResult: result, submitLoading: false });

    } catch {
      this.setData({ submitLoading: false });
    }
  },

  // ── 下一题 / 完成 ─────────────────────────────────────────

  onNext() {
    const { currentIndex, problems } = this.data;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= problems.length) {
      // 全部答完 → 统计汇总
      this._buildSummary();
      return;
    }

    this.setData({
      currentIndex: nextIndex,
      currentProblem: problems[nextIndex],
      userAnswer: '',
      showResult: false,
      lastResult: null,
      timer: 0
    });
    this._startTimer();
  },

  // ── 重新配置 ──────────────────────────────────────────────

  onRestart() {
    this._clearTimer();
    this.setData({
      phase: 'config',
      problems: [],
      currentIndex: 0,
      userAnswer: '',
      showResult: false,
      lastResult: null,
      summary: null,
      timer: 0
    });
  },

  // ── 内部工具 ──────────────────────────────────────────────

  _startTimer() {
    this._clearTimer();
    this._timerHandle = setInterval(() => {
      this.setData({ timer: this.data.timer + 1 });
    }, 1000);
  },

  _clearTimer() {
    if (this._timerHandle) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  },

  _buildSummary() {
    this._clearTimer();
    // 本次会话汇总（从 lastResult 只能拿最后一道，正式统计去 /api/stats/recent20）
    const problems = this.data.problems;
    this.setData({
      phase: 'summary',
      summary: { total: problems.length }
    });
  },

  /** 生成唯一 session ID，格式：session_{时间戳}_{随机串} */
  _makeSessionId() {
    const ts  = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return `session_${ts}_${rnd}`;
  },

  // 查看会话统计 → 跳转统计页
  goStats() {
    wx.switchTab({ url: '/pages/stats/stats' });
  }
});
