import { KEYS, get } from './utils/storage';
import { AppGlobalData, StudentPublic, TeacherPublic } from './types/index';

App<AppGlobalData>({
  globalData: {
    token:    '',
    userInfo: null,
    role:     '',
  },

  onLaunch() {
    const token    = get<string>(KEYS.TOKEN)    || '';
    const userInfo = get<StudentPublic | TeacherPublic>(KEYS.USER_INFO) || null;
    const role     = get<'student' | 'teacher'>(KEYS.ROLE) || '';

    if (token) {
      this.globalData.token    = token;
      this.globalData.userInfo = userInfo;
      this.globalData.role     = role;
    }
  },
});
