#!/usr/bin/env node
const program = require('commander')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const chalk = require('chalk')
const { log } = require('../lib/logger')
const path = require('path')
const os = require('os')
const home = require('user-home')
const ora = require('ora')
const download = require('download-git-repo')
const generate = require('../lib/component-generate')

module.exports = async function component(name, options = {}) {
    const targetDir = path.resolve(process.cwd(), name)
    const inCurrent = name === '.'

    // 检查当前目录是否存在该文件夹
    if (fs.existsSync(targetDir)) {
        // 如果是在当前目录
        if (inCurrent) {
            const { ok } = await inquirer.prompt([
                {
                  name: 'ok',
                  type: 'confirm',
                  message: `是否在当前目录中生成项目?`
                }
            ])
            if (!ok) {
                return;
            }
            name = getCurrName()
        } else {
            const { action } = await inquirer.prompt([
                {
                  name: 'action',
                  type: 'list',
                  message: `目标文件夹 ${chalk.cyan(targetDir)} 已经存在. 请选择一个指令:`,
                  choices: [
                    { name: '重写（Overwrite）', value: 'overwrite' },
                    { name: '合并（Merge）', value: 'merge' },
                    { name: '取消（Cancel）', value: false }
                  ]
                }
            ])
            if (!action) {
                return
            } else if (action === 'overwrite') {
                log(`\n 重写目录 ${chalk.cyan(targetDir)}...`)
                await fs.remove(targetDir)
            }
        }
    }

    options = {
        ...options,
        name: name.toLocaleLowerCase(),
        componentName: toComponentName(name),
    }
    // 开始执行
    run(name, targetDir, options)
}

function toComponentName(name) {
    var str = name.replace(/-/g, '')
    return str
}

function getCurrName() {
    let cwd = process.cwd();
    let name = cwd.split('\\').at(-1)
    return name
}

async function run(name, targetDir, options) {
    /**
     * #检查是否存在模板
     * #下载模板
     * #解析模板
     */

    // 模板地址
    const tmpdir = path.join(home, '.rje-templates', 'ecloud-child-template')
    // 组件地址
    const dir = '/template/src/views/demoMange/list'
    const componentDir = tmpdir + dir;
    if (fs.existsSync(tmpdir)) {
        // 有模板文件就可以直接用
    } else {
        // 下载模板
        await downloadAndGenerate('ecloud-child-template', tmpdir)
    }

    // 解析模板
    await generate(name, targetDir, componentDir, options)
    
}

async function downloadAndGenerate (template, tmp) {
    // loading动画
    const spinner = ora('downloading template')
    spinner.start()
    // 删除本地存在的模板
    if (exists(tmp)) rm(tmp)
    await new Promise((resolve, reject) => {
        download(template, tmp, {clone: true}, err => {
            if (err) return reject(err)
            resolve()
        })
    })
    spinner.stop()
    return tmp;
  }