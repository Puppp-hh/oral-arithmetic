/**
 * 文件说明：首页逻辑
 * 系统作用：展示当前用户信息（姓名/等级/正确率/今日题数），
 *          提供快捷入口进入训练/错题/统计
 * 调用链：onShow → request GET /api/stats/summary → 渲染用户数据
 */
const { request } = require('../../utils/request');
const { getUserInfo, getRole, clearLogin } = require('../../utils/storage');

// 等级对应的称号
const LEVEL_TITLES = {
  1: '口算萌新', 2: '数字学徒', 3: '加减能手',
  4: '运算达人', 5: '乘除小侠', 6: '混合高手',
  7: '速算健将', 8: '数学精英', 9: '口算大师', 10: '传说天才'
};

Page({
  data: {
    userInfo: null,
    role: '',
    summary: null,
    levelTitle: '',
    loading: true
  },

  onShow() {
    const userInfo = getUserInfo();
    const role     = getRole();
    if (!userInfo) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ userInfo, role });
    if (role === 'student') {
      this.loadSummary();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadSummary() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/api/stats/summary' });
      const s = res.data;
      this.setData({
        summary: s,
        levelTitle: LEVEL_TITLES[s.current_level] || '口算萌新',
        loading: false
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  goTrain()    { wx.switchTab({ url: '/pages/train/train' }); },
  goMistakes() { wx.switchTab({ url: '/pages/mistakes/mistakes' }); },
  goStats()    { wx.switchTab({ url: '/pages/stats/stats' }); },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确认退出登录？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request({ url: '/api/auth/logout', method: 'POST' });
        } catch { /* 忽略，本地也清除 */ }
        clearLogin();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
