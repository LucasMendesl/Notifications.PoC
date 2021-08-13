const _ = require('lodash')
const through = require('through2')
const conventionalCommitsParser = require('conventional-commits-parser')
const conventionalChangelogWriter = require('conventional-changelog-writer')
const conventionalChangelogPresetLoader = require('conventional-changelog-preset-loader')


const conventionalChangelogStreamGenerator = (commitsStream, writerOpts, parserOpts, context, options) => {
    const readable = new stream.Readable({
        objectMode: writerOpts.includeDetails
    })
    
    readable._read = function () { }

    commitsStream
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
        .pipe(through({ objectMode: writerOpts.includeDetails }, function (chunk, enc, cb) {
            try {
                readable.push(chunk)
            } catch (err) {
                setImmediate(function () { throw err })
            }
            
            cb()
        }, function (cb) {
            readable.push(null)
            cb()
        }))

    return readable
}

