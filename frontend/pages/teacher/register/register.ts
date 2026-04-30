import { teacherRegister } from '../../../api/auth';
import { searchSchools, SchoolSearchItem } from '../../../api/map';

let schoolSearchTimer: ReturnType<typeof setTimeout> | null = null;

Page({
  data: {
    form: {
      account:          '',
      password:         '',
      confirmPassword:  '',
      name:             '',
      schoolName:       '',
      schoolAddress:    '',
      schoolLongitude:  null as number | null,
      schoolLatitude:   null as number | null,
      phone:            '',
      email:            '',
    },
    loading:         false,
    schoolSearching: false,
    schoolList:      [] as SchoolSearchItem[],
    schoolSelected:  false,
  },

  onInput(e: WechatMiniprogram.Input) {
    const field = (e.currentTarget.dataset as { field: string }).field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value,
      ...(field === 'schoolName'
        ? { schoolSelected: false, schoolList: [], 'form.schoolAddress': '', 'form.schoolLongitude': null, 'form.schoolLatitude': null }
        : {}),
    });

    if (field === 'schoolName') {
      this.queueSchoolSearch(value);
    }
  },

  queueSchoolSearch(keyword: string) {
    if (schoolSearchTimer) clearTimeout(schoolSearchTimer);
    const normalized = keyword.trim();
    if (normalized.length < 2) {
      this.setData({ schoolSearching: false, schoolList: [] });
      return;
    }

    this.setData({ schoolSearching: true, schoolList: [] });
    schoolSearchTimer = setTimeout(() => {
      this.fetchSchools(normalized, true);
    }, 450);
  },

  async onSearchSchool() {
    const keyword = this.data.form.schoolName.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入学校关键词', icon: 'none' });
      return;
    }

    await this.fetchSchools(keyword, false);
  },

  async fetchSchools(keyword: string, silent = false) {
    this.setData({ schoolSearching: true, schoolList: [] });
    try {
      const res = await searchSchools({ keyword }, silent);
      if (keyword !== this.data.form.schoolName.trim()) return;
      const list = res.data.list || [];
      this.setData({ schoolList: list });
      if (!silent && list.length === 0) {
        wx.showToast({ title: '未搜索到学校', icon: 'none' });
      }
    } catch {
      // request.ts 已展示错误
    } finally {
      this.setData({ schoolSearching: false });
    }
  },

  onSelectSchool(e: WechatMiniprogram.Touch) {
    if (schoolSearchTimer) clearTimeout(schoolSearchTimer);
    const index = Number((e.currentTarget.dataset as { index: number }).index);
    const item = this.data.schoolList[index];
    if (!item) return;

    const [longitudeText, latitudeText] = String(item.location || '').split(',');
    const longitude = Number(longitudeText);
    const latitude = Number(latitudeText);

    this.setData({
      'form.schoolName':      item.name,
      'form.schoolAddress':   item.address || `${item.city || ''}${item.district || ''}`,
      'form.schoolLongitude': Number.isFinite(longitude) ? longitude : null,
      'form.schoolLatitude':  Number.isFinite(latitude) ? latitude : null,
      schoolSelected:         true,
      schoolList:             [],
      schoolSearching:        false,
    });
  },

  async onSubmit() {
    const {
      account,
      password,
      confirmPassword,
      name,
      schoolName,
      schoolAddress,
      schoolLongitude,
      schoolLatitude,
      phone,
      email,
    } = this.data.form;

    if (!account.trim()) { wx.showToast({ title: '请输入账号', icon: 'none' }); return; }
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(account)) {
      wx.showToast({ title: '账号只能含字母/数字/下划线，3-50位', icon: 'none' }); return;
    }
    if (password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
    if (password !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
    if (!name.trim()) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return; }
    if (!schoolName.trim()) { wx.showToast({ title: '请输入学校名称', icon: 'none' }); return; }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      wx.showToast({ title: '邮箱格式不正确', icon: 'none' }); return;
    }

    this.setData({ loading: true });
    try {
      await teacherRegister({
        account:    account.trim(),
        password,
        name:       name.trim(),
        schoolName: schoolName.trim(),
        schoolAddress: schoolAddress.trim() || undefined,
        schoolLongitude: schoolLongitude ?? undefined,
        schoolLatitude:  schoolLatitude ?? undefined,
        phone:      phone.trim() || undefined,
        email:      email.trim() || undefined,
      });
      wx.showToast({ title: '注册成功', icon: 'success', duration: 1500 });
      setTimeout(() => wx.redirectTo({ url: '/pages/teacher/login/login' }), 1500);
    } catch {
      // 错误已在 request.ts 中展示
    } finally {
      this.setData({ loading: false });
    }
  },

  goLogin() {
    wx.navigateBack({ delta: 1 });
  },

  onUnload() {
    if (schoolSearchTimer) clearTimeout(schoolSearchTimer);
  },
});
