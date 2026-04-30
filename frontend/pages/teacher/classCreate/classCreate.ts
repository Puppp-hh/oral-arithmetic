import * as auth from '../../../utils/auth';
import { createClass } from '../../../api/class';

const GRADES = [
  { id: 1, name: '一年级' },
  { id: 2, name: '二年级' },
  { id: 3, name: '三年级' },
  { id: 4, name: '四年级' },
  { id: 5, name: '五年级' },
  { id: 6, name: '六年级' },
];

const CLASS_NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}班`);

Page({
  data: {
    gradeNames:         GRADES.map(g => g.name),
    classNumbers:       CLASS_NUMBERS,
    selectedGradeIndex: 0,
    selectedClassIndex: 0,
    loading:            false,
  },

  onLoad() {
    if (!auth.requireTeacher()) return;
  },

  onGradeChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ selectedGradeIndex: Number(e.detail.value) });
  },

  onClassNoChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ selectedClassIndex: Number(e.detail.value) });
  },

  async onSubmit() {
    const { selectedGradeIndex, selectedClassIndex } = this.data;
    const gradeId = GRADES[selectedGradeIndex].id;
    const className = `${GRADES[selectedGradeIndex].name}${CLASS_NUMBERS[selectedClassIndex]}`;

    this.setData({ loading: true });
    try {
      const res = await createClass({ className, gradeId });
      wx.showToast({ title: '创建成功', icon: 'success', duration: 1200 });
      setTimeout(() => {
        // 跳转到邀请码页查看新班级邀请码
        wx.redirectTo({
          url: `/pages/teacher/inviteCode/inviteCode?classId=${res.data.class_id}`,
        });
      }, 1200);
    } catch {
      // 错误已在 request.ts 中展示
    } finally {
      this.setData({ loading: false });
    }
  },
});
