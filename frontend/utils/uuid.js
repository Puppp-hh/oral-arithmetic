/**
 * 文件说明：简易 UUID 生成（不依赖 npm 包）
 * 系统作用：为训练 session 生成唯一 ID
 */
function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = { v4 };
