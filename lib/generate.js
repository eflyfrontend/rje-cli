const chalk = require('chalk')
const Metalsmith = require('metalsmith') // Metalsmith是一个静态网站（博客，项目）的生成库，使用metalsmith处理handlebars模板，可以将用户输入的值替换到文件模版{{}}对应的占位值里面去
const Handlebars = require('handlebars')// handlerbars 是一个模板编译器，通过template和json，输出一个html。本脚手架模板引擎我选择handlebars。当然，还可以有其他选择，例如ejs、jade、swig。有点类似artemplate这种模版引擎。用handlebars的语法对模板做一些调整，例如修改模板中的package.json
const async = require('async')
const render = require('consolidate').handlebars.render // consolidate.js是一个模板引擎的结合体。使用metalsmith处理模板
const path = require('path')
const multimatch = require('multimatch')// multimatch 是一个字符串数组匹配的库
const getOptions = require('./options')
const ask = require('./ask')
const filter = require('./filter')
const logger = require('./logger')
const execa = require("execa")
const ora = require('ora')

// register handlebars helper
Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this)
})

Handlebars.registerHelper('unless_eq', function (a, b, opts) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this)
})

Handlebars.registerHelper('raw-helper', function (options) {
  return options.fn()
})

/**
 * Generate a template given a `src` and `dest`.
 *
 * @param {String} name
 * @param {String} src
 * @param {String} dest
 * @param {Function} done
 */

module.exports = function generate(name, src, dest, done) {
  // 读取了src目录下的 配置文件信息， 同时将 name（当前文件夹） auther(当前git用户名邮箱) 赋值到了 opts 当中
  const opts = getOptions(name, src)
  // 拼接了目录 src/{template} 要在这个目录下生产静态文件
  const metalsmith = Metalsmith(path.join(src, 'template'))
  // 将metalsmitch中的meta 与 三个属性合并起来 形成 data
  const data = Object.assign(metalsmith.metadata(), {
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true
  })
  // 如果有"debug helper"调试数据，注册一下方便调试数据
  opts.helpers && Object.keys(opts.helpers).map(key => {
    Handlebars.registerHelper(key, opts.helpers[key])
  })

  const helpers = { chalk, logger }

  if (opts.metalsmith && typeof opts.metalsmith.before === 'function') {
    opts.metalsmith.before(metalsmith, opts, helpers)
  }
  // askQuestions是会在终端里询问一些问题
  // 名称 描述 作者 是要什么构建 在meta.js 的opts.prompts当中
  // filterFiles 是用来过滤文件
  // renderTemplateFiles 是一个渲染插件
  metalsmith.use(askQuestions(opts.prompts))
    .use(filterFiles(opts.filters))
    .use(renderTemplateFiles(opts.skipInterpolation))

  if (typeof opts.metalsmith === 'function') {
    opts.metalsmith(metalsmith, opts, helpers)
  } else if (opts.metalsmith && typeof opts.metalsmith.after === 'function') {
    opts.metalsmith.after(metalsmith, opts, helpers)
  }
  // clean方法是设置在写入之前是否删除原先目标目录 默认为true
  // source方法是设置原路径
  // destination方法就是设置输出的目录
  // build方法执行构建
  metalsmith.clean(false)
    .source('.') // start from template root instead of `./src` which is Metalsmith's default for `source`
    .destination(dest)
    .build(async (err, files) => {
      if (typeof opts.complete === 'function') {
        const helpers = { chalk, logger, files }
        // 当生成完毕之后执行 meta.js当中的 opts.complete方法
        opts.complete(data, helpers)
      } else {
        logMessage(opts.completeMessage, data)
      }
      // 安装依赖
      const spinner = ora('正在安装依赖...')
      spinner.start();
      await execaInstall(dest)
      spinner.stop();
      // 完成
      done(err)
    })

  return data
}

/**
 * Create a middleware for asking questions.
 * prompts交互询问封装方法
 * @param {Object} prompts
 * @return {Function}
 */

function askQuestions(prompts) {
  return (files, metalsmith, done) => {
    ask(prompts, metalsmith.metadata(), done)
  }
}

/**
 * Create a middleware for filtering files.
 * 过滤文件封装方法
 * @param {Object} filters
 * @return {Function}
 */

function filterFiles(filters) {
  return (files, metalsmith, done) => {
    filter(files, filters, metalsmith.metadata(), done)
  }
}

/**
 * Template in place plugin.
 * 占位模版渲染
 * @param {Object} files
 * @param {Metalsmith} metalsmith
 * @param {Function} done
 */

function renderTemplateFiles(skipInterpolation) {
  skipInterpolation = typeof skipInterpolation === 'string'
    ? [skipInterpolation]
    : skipInterpolation
  return (files, metalsmith, done) => {
    const keys = Object.keys(files)
    const metalsmithMetadata = metalsmith.metadata()
    async.each(keys, (file, next) => {
      // skipping files with skipInterpolation option 根据skipInterpolation选项跳过文件不做渲染处理
      if (skipInterpolation && multimatch([file], skipInterpolation, { dot: true }).length) {
        return next()
      }
      const str = files[file].contents.toString()
      // 不渲染没有{{}}占位符的文件
      if (!/{{([^{}]+)}}/g.test(str)) {
        return next()
      }
      render(str, metalsmithMetadata, (err, res) => {
        if (err) {
          err.message = `[${file}] ${err.message}`
          return next(err)
        }
        files[file].contents = Buffer.from(res)
        next()
      })
    }, done)
  }
}

/**
 * Display template complete message.
 * 线上模版完成信息
 * @param {String} message
 * @param {Object} data
 */

function logMessage(message, data) {
  if (!message) return
  render(message, data, (err, res) => {
    if (err) {
      console.error('\n   Error when rendering template complete message: ' + err.message.trim())
    } else {
      console.log('\n' + res.split(/\r?\n/g).map(line => '   ' + line).join('\n'))
    }
  })
}

async function execaInstall(targetDir) {
  return execa('npm', ['install'], {cwd: targetDir})
}