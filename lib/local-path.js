const path = require('path')

module.exports = {
  // 是否是本地路径：“./”或者“字母:”开头，返回true
  isLocalPath (templatePath) {
    return /^[./]|(^[a-zA-Z]:)/.test(templatePath)
  },
  // 拼接获取当前路径
  getTemplatePath (templatePath) {
    return path.isAbsolute(templatePath)
      ? templatePath
      : path.normalize(path.join(process.cwd(), templatePath))
  }
}
