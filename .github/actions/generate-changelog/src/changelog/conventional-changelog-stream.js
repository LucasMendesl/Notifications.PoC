const through = require('through2')
const { Readable } = require('stream')
const { getStreamCommits } = require('../git')
const conventionalCommitsParser = require('conventional-commits-parser')
const conventionalChangelogWriter = require('conventional-changelog-writer')
const conventionalChangelogPresetLoader = require('conventional-changelog-preset-loader')


const conventionalChangelogStreamGenerator = (options, context, commits, parserOpts, writerOpts) => {
    const readable = new Readable({
        objectMode: writerOpts.includeDetails
    })
    
    readable._read = function () { }

    getStreamCommits(commits)
        .pipe(conventionalCommitsParser(parserOpts))
        .on('error', function (err) {
            err.message = 'Error in conventional-commits-parser: ' + err.message
            setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(through.obj(function (chunk, _, cb) {
            try {
                options.transform.call(this, chunk, cb)
            } catch (err) {
                cb(err)
            }
        }))
        .on('error', function (err) {
            err.message = 'Error in options.transform: ' + err.message
            setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(conventionalChangelogWriter(context, writerOpts))
        .on('error', function (err) {
            err.message = 'Error in conventional-changelog-writer: ' + err.message
            setImmediate(readable.emit.bind(readable), 'error', err)
        })
        .pipe(through({ objectMode: writerOpts.includeDetails }, function (chunk, _, cb) {
            try { readable.push(chunk) } catch (err) { setImmediate(function () { throw err }) }            
            cb()
        }, function (cb) {
            readable.push(null)
            cb()
        }))

    return readable
}

const conventionalChangelog = (options, context, commits, parserOpts, writerOpts) => {
    options.warn = options.warn || function () {}
  
    if (options.preset) {
      try {
        options.config = conventionalChangelogPresetLoader(options.preset)
      } catch (err) {
        if (typeof options.preset === 'object') {
          options.warn(`Preset: "${options.preset.name}" ${err.message}`)
        } else if (typeof options.preset === 'string') {
          options.warn(`Preset: "${options.preset}" ${err.message}`)
        } else {
          options.warn(`Preset: ${err.message}`)
        }
      }
    }
  
    return conventionalChangelogStreamGenerator(options, context, commits, parserOpts, writerOpts)
}

module.exports = conventionalChangelog