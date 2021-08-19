const { getStreamCommits } = require('../git')

const through = require('through2')
const mergeConfig = require('./merge-config')
const streamToPromise = require('stream-to-promise')
const conventionalCommitsParser = require('conventional-commits-parser')
const conventionalChangelogWriter = require('./writer')
const conventionalChangelogPresetLoader = require('conventional-changelog-preset-loader')


const conventionalChangelogStreamGenerator = async (options, context, commits, parserOpts, writerOpts) => {
    const {
      options: newOptions,
      context: newContext,
      parserOpts: newParserOpts,
      writerOpts: newWriterOpts
    } = await mergeConfig(options, context, parserOpts, writerOpts, commits.filter(x => !!x.tag).map(x => x.tag))
    
    console.info('merge config deu bom, obtendo o stream dos commits ', { 
      newOptions,
      newContext,
      newParserOpts,
      newWriterOpts
    })

    const stream = getStreamCommits(commits)
      .pipe(through.obj(function (chunk, _, cb){
         console.log('stream_commit', chunk)
         cb()
      }))
      .pipe(conventionalCommitsParser(newParserOpts))
      .on('error', function (err) {
        err.message = 'Error in conventional-commits-parser: ' + err.message
        throw err
      })
      .pipe(through.obj(function (chunk, _, cb) {
        try {
          console.log('commit', chunk)
          newOptions.transform.call(this, chunk, cb)
        } catch (err) {
          cb(err)
        }
      }))
      .on('error', function (err) {
        err.message = 'Error in options.transform: ' + err.message
        throw err
      })
      .pipe(conventionalChangelogWriter(newContext, newWriterOpts))
      .on('error', function (err) {
        err.message = 'Error in conventional-changelog-writer: ' + err.message
        throw err      
      })

    return await streamToPromise(stream)

    // getStreamCommits(commits)
    //     .pipe(streamLogging(newParserOpts))
    //     .on('error', function (err) {
    //         err.message = 'Error in conventional-commits-parser: ' + err.message
    //         setImmediate(readable.emit.bind(readable), 'error', err)
    //     })
    //     .pipe(through.obj(function (chunk, _, cb) {
    //         try {
    //             newOptions.transform.call(this, chunk, cb)
    //         } catch (err) {
    //             cb(err)
    //         }
    //     }))
    //     .on('error', function (err) {
    //         err.message = 'Error in options.transform: ' + err.message
    //         setImmediate(readable.emit.bind(readable), 'error', err)
    //     })
    //     .pipe(conventionalChangelogWriter(newContext, newWriterOpts))
    //     .on('error', function (err) {
    //         err.message = 'Error in conventional-changelog-writer: ' + err.message
    //         setImmediate(readable.emit.bind(readable), 'error', err)
    //     })
    //     .pipe(through({ objectMode: newWriterOpts.includeDetails }, function (chunk, _, cb) {
    //         try { readable.push(chunk) } catch (err) { setImmediate(function () { throw err }) }            
    //         cb()
    //     }, function (cb) {
    //         readable.push(null)
    //         cb()
    //     }))
    // return readable
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