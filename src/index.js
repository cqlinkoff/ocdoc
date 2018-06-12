#!/usr/bin/env node

const program = require('commander')
const commandExists = require('command-exists')
const chalk = require('chalk')
const path = require('path')
const { spawnSync } = require('child_process')
const readdir = require('recursive-readdir')
const { JSDOM } = require('jsdom')
const fs = require('fs')
const { promisify } = require('util')

const pkg = require('../package.json')

program
  .version(pkg.version, '-v, --version')
  .option('-p, --project <project>', 'specific project name')
  .option('-c, --company <company>', 'specific company name')
  .option('-d, --dir [dir]', 'specific dir')
  .option('-o, --output [path]', 'specific output path')
  .option('--no-gen', 'skip generate')
  .parse(process.argv)

const start = async () => {
  const dir = program.dir || process.cwd()
  let output = program.output || path.resolve(dir, 'docs')
  const project = program.project
  const company = program.company
  console.log()
  if (program.gen) {
    const exitsAppleDoc = commandExists.sync('appledoc')
    if (!exitsAppleDoc) {
      console.log(chalk.red(`Command ${chalk.yellow('appledoc')} not found, please install it first, see ${chalk.blue('http://t.cn/SMDMcf')}\n`))
      process.exit(1)
    }

    if (!project) {
      console.log(chalk.red(`${chalk.yellow('project')} is required\n`))
      process.exit(1)
    }

    if (!company) {
      console.log(chalk.red(`${chalk.yellow('company')} is required\n`))
      process.exit(1)
    }

    spawnSync('appledoc', [
      '--no-create-set',
      '--output',
      output,
      '--project-name',
      project,
      '--project-company',
      company,
      dir
    ], {
      stdio: 'inherit'
    })
  } else {
    output = dir
  }

  console.log(chalk.blue(`Input dir: ${chalk.yellow(dir)}\n`))
  console.log(chalk.blue(`Output dir: ${chalk.yellow(output)}\n`))

  const files = await readdir(output, [(file, stats) => {
    return !stats.isDirectory() && !/html$/.test(file)
  }])

  await Promise.all(files.map(async file => {
    const content = await promisify(fs.readFile)(file, 'utf8')
    const dom = new JSDOM(content)
    const { window } = dom
    const { document } = window
    const sections = document.querySelectorAll('.section-method')
    if (sections) {
      sections.forEach(node => {
        const titleNode = node.querySelector('.method-title').querySelector('a')
        const brief = node.querySelector('.brief-description').querySelector('p').innerHTML
        node.querySelector('.brief-description').style.display = 'none'
        const innerHTML = titleNode.innerHTML
        const text = `-&nbsp;${brief}`
        if (!innerHTML.startsWith(text)) {
          const arr = innerHTML.split('&nbsp;')
          arr[0] = text
          titleNode.innerHTML = arr.join('&nbsp;')
        }
      })
    }

    const newContent = document.documentElement.innerHTML
    await promisify(fs.writeFile)(file, newContent, 'utf8')
  }))
}

start()
