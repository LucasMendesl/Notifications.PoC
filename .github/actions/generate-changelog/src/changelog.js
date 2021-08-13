const path = require('path')
const Bluebird = require('bluebird')
const streamToPromise = require('stream-to-promise')
const spec = require('conventional-changelog-config-spec')
const conventionalChangelog = require('conventional-changelog')
const {
  statAsync, 
  readFileAsync, 
  writeFileAsync,
} = Bluebird.promisifyAll(require('fs'))

const configurePreset = args => {
  const defaultPreset = require.resolve('conventional-changelog-conventionalcommits')
  const presetConfig = args.preset || defaultPreset

  if (presetConfig !== defaultPreset) return presetConfig

  const preset = { name: defaultPreset }

  return Object.keys(spec.properties).reduce((acc, curr) => {
      if (args[curr]) acc[curr] = args[curr]
      return acc  
  }, preset)
}

const createFileIfNotExists = ({ changelogFile }) => {
  const changelogPath = path.resolve(process.cwd(), changelogFile)
  console.log('path', changelogPath)
  console.log('cai na função para validar se o arquivo existe', changelogFile)

  return statAsync(changelogFile)
    .catch(() => {
       console.log('nao achei o arquivo, to escrevendo...')
       return writeFileAsync(changelogPath, '', 'utf8')
    })
}

const extractOldContent = changelogFile => {
  const startContentPosition = changelogFile.search(/(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m)
  
  if (startContentPosition !== -1) return changelogFile.substring(startContentPosition)
  return changelogFile
}

const mergeChangelogContent = (args, newVersion) => oldContent => {
  const newChangelogVersion = { version: newVersion }
  const conventionalChangelogConfig = {
    debug: console.info.bind(console, 'conventional-changelog'),
    preset: configurePreset(args),
    tagPrefix: args.tagPrefix
  }

  return streamToPromise(conventionalChangelog(
    conventionalChangelogConfig, 
    newChangelogVersion, 
    { merges: null, path: args.path })
  )
  .then(newContent => [newContent.toString('utf8') + oldContent, newContent.toString('utf8')])
}

const createOrUpdateChangelog = (actionContext, args) => ({ newVersion, commits }) => {
  const setOutputs = ([_, newContent]) => {
    actionContext.info('setting version and release notes outputs 🥳🥳🥳')
    actionContext.setOutput('newVersion', newVersion)
    actionContext.setOutput('tagVersion', `${args.tagPrefix}${newVersion}`)
    actionContext.setOutput('releaseNotes', newContent)
    actionContext.setOutput('releaseName', `${args.tagPrefix}${newVersion} (${new Date().toISOString().split('T').shift()})`)
  }

  console.log('args: ', JSON.stringify(args, null, 4))
  return createFileIfNotExists(args)
    .then(() => readFileAsync(args.changelogFile, 'utf8'))
    .tap(content => console.log('content readed: ', content))
    .then(extractOldContent)
    .tap(content => console.log('old content: ', content))
    .then(mergeChangelogContent(args, newVersion))
    .tap(items => console.log('content merged: ', items))
    .tap(([mergedContent]) => writeFileAsync(args.changelogFile, args.header + '\n' + mergedContent.replace(/\n+$/, '\n')))
    .tap(() => console.log('file content merged'))
    .tap(setOutputs)
    .then(() => newVersion)
    .catch(error => {
       console.log('error on generate changelog', JSON.stringify(error, null, 4))
       return Bluebird.reject(error)
    })
}

module.exports = { createOrUpdateChangelog }