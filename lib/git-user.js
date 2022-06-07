const exec = require('child_process').execSync

module.exports = () => {
  let name
  let email

  try {
    // exec起一个shell执行cmd语法
    name = exec('git config --get user.name')
    email = exec('git config --get user.email')
    console.log('name', name)
    console.log('email', email)
  } catch (e) {}

  name = name && JSON.stringify(name.toString().trim()).slice(1, -1)
  email = email && (' <' + email.toString().trim() + '>')
  return (name || '') + (email || '')
}
