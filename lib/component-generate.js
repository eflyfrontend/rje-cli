const Metalsmith = require('metalsmith')
const Handlebars = require('handlebars')
const render = require('consolidate').handlebars.render // consolidate.js是一个模板引擎的结合体。使用metalsmith处理模板
const async = require('async')
const chalk = require('chalk')

Handlebars.registerHelper("notbuild", function(options) {
    return options.fn();
});

Handlebars.registerHelper("ifCond", function(str1, str2) {
    return str1 === str2
});

module.exports = async function generate(projectName, targetDir, tmpdir, options) {
    return new Promise((resolve, reject) => {
        // 获取静态网页生成器对象，并设置对应的copy目录
        const metalsmith = Metalsmith(tmpdir)
        // 将设置编译模板时所传入的参数
        const data = Object.assign(metalsmith.metadata(), {
            ...options,
            noEscape: true
        })
        // 应用模板编译
        metalsmith
            .use(filterFile(options))
            .use(renderTemplateFiles())

        // 执行
        metalsmith.clean(false)
            .source('.') // start from template root instead of `./src` which is Metalsmith's default for `source`
            .destination(targetDir)
            .build((err, files) => {
                if (err) {
                    console.log(chalk.green(`[ rje-cli ]：`), err)
                    reject(err);
                    return;
                }
                resolve();
            })
    })
    
}

/**
 * Template in place plugin.
 * 占位模版渲染
 * @param {Object} files
 * @param {Metalsmith} metalsmith
 * @param {Function} done
 */

function renderTemplateFiles (skipInterpolation) {
    skipInterpolation = typeof skipInterpolation === 'string'
      ? [skipInterpolation]
      : skipInterpolation
    return (files, metalsmith, done) => {
      const keys = Object.keys(files)
      const metalsmithMetadata = metalsmith.metadata()
      async.each(keys, (file, next) => {
        // skipping files with skipInterpolation option
        if (skipInterpolation && multimatch([file], skipInterpolation, { dot: true }).length) {
          return next()
        }
        const str = files[file].contents.toString()
        // do not attempt to render files that do not have mustaches
        if (!/{{([^{}]+)}}/g.test(str)) {
          return next()
        }
        render(str, metalsmithMetadata, (err, res) => {
          if (err) {
            err.message = `[${file}] ${err.message}`
            return next(err)
          }
          files[file].contents = new Buffer.from(res)
          next()
        })
      }, done)
    }
}

// 过滤模板文件，主要是将文件重命名
function filterFile(options) {
  if (options.commandType === 'component') {
    return (files, metalsmith, done) => {
      const keys = Object.keys(files)
      async.each(keys, (file, next) => {
        let suffixArr = file.split('.')
        let suffix = suffixArr[suffixArr.length - 1]
        let value = files[file]
        delete files[file]
        files[options.name + '.' + suffix] = value;
        next();
      }, done)
    }
  }
}