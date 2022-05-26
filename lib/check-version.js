const request = require('request')
const semver = require('semver')
const chalk = require('chalk')
const packageConfig = require('../package.json')

module.exports = done => {
  // Ensure minimum supported node version is used
  if (!semver.satisfies(process.version, packageConfig.engines.node)) {
    return console.log(chalk.red(
      '  你需要将 node 版本更新到 >=' + packageConfig.engines.node + '.x 才能使用 rje-cli'
    ))
  }

  request({
    url: 'https://registry.npmjs.org/rje-cli',
    timeout: 1000
  }, (err, res, body) => {
    if (!err && res.statusCode === 200) {
      const latestVersion = JSON.parse(body)['dist-tags'].latest
      const localVersion = packageConfig.version
      if (semver.lt(localVersion, latestVersion)) {
        console.log(chalk.yellow('  rje-cli有最新的版本可用'))
        console.log()
        console.log('  最新版本:    ' + chalk.green(latestVersion))
        console.log('  当前安装版本: ' + chalk.red(localVersion))
        console.log()
      }
    }
    done()
  })
}
