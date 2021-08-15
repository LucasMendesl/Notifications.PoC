const readPkg = require('read-pkg')
const Bluebird = require('bluebird')
const dateFormat = require('dateformat')
const readPkgUp = require('read-pkg-up')
const getPkgRepo = require('get-pkg-repo')
const normalizePackageData = require('normalize-package-data')

const { URL } = require('url')
const _ = require('lodash')

const rhosts = /github|bitbucket|gitlab/i

const createGitRemoteOriginUrlFn = () => {
  let gitRemoteOriginUrl = function () {
    return Bluebird.reject(err)
  }
  
  try { return require('git-remote-origin-url') } 
  catch (err) { return gitRemoteOriginUrl }  
}

const guessNextTag = (previousTag, version) => {  
  if (previousTag) {
    if (previousTag[0] === 'v' && version[0] !== 'v') {
      return 'v' + version
    }

    if (previousTag[0] !== 'v' && version[0] === 'v') {
      return version.replace(/^v/, '')
    }

    return version
  }

  if (version[0] !== 'v') {
    return 'v' + version
  }

  return version
}

const mergeConfig = (options, context, parserOpts, writerOpts, gitSemverTags) => {
  let configPromise
  let pkgPromise

  context = context || {}
  const rtag = options && options.tagPrefix ? new RegExp(`tag:\\s*[=]?${options.tagPrefix}(.+?)[,)]`, 'gi') : /tag:\s*[v=]?(.+?)[,)]/gi

  options = _.merge({
    pkg: {
      transform: function (pkg) {
        return pkg
      }
    },
    append: false,
    releaseCount: 1,
    skipUnstable: false,
    debug: function () {},
    transform: function (commit, cb) {
      if (_.isString(commit.gitTags)) {
        const match = rtag.exec(commit.gitTags)
        rtag.lastIndex = 0

        if (match) {
          commit.version = match[1]
        }
      }

      if (commit.committerDate) {
        commit.committerDate = dateFormat(commit.committerDate, 'yyyy-mm-dd', true)
      }

      cb(null, commit)
    },
    lernaPackage: null
  }, options)

  options.warn = options.warn || options.debug

  if (options.config) {
    if (_.isFunction(options.config)) {
      configPromise = Bluebird.promisify(options.config)
    } else {
      configPromise = Bluebird.resolve(options.config)
    }
  }

  if (options.pkg) {
    if (options.pkg.path) {
      pkgPromise = Bluebird.resolve(readPkg(options.pkg.path))
    } else {
      pkgPromise = Bluebird.resolve(readPkgUp())
    }
  }

  const gitRemoteOriginFn = createGitRemoteOriginUrlFn()
  const gitRemoteOriginUrlPromise = Bluebird.resolve(gitRemoteOriginFn())

  return Bluebird.allSettled([configPromise, pkgPromise, gitRemoteOriginUrlPromise])
    .spread(function (configObj, pkgObj, gitRemoteOriginUrlObj) {
      let config
      let pkg
      let repo

      let hostOpts

      if (configPromise) {
        if (configObj.state === 'fulfilled') {
          config = configObj.value
        } else {
          options.warn('Error in config' + configObj.reason.toString())
          config = {}
        }
      } else {
        config = {}
      }

      context = _.assign(context, config.context)

      if (options.pkg) {
        if (pkgObj.state === 'fulfilled') {
          if (options.pkg.path) {
            pkg = pkgObj.value
          } else {
            pkg = pkgObj.value.pkg || {}
          }

          pkg = options.pkg.transform(pkg)
        } else if (options.pkg.path) {
          options.warn(pkgObj.reason.toString())
        }
      }

      if ((!pkg || !pkg.repository || !pkg.repository.url) && gitRemoteOriginUrlObj.state === 'fulfilled') {
        pkg = pkg || {}
        pkg.repository = pkg.repository || {}
        pkg.repository.url = gitRemoteOriginUrlObj.value
        normalizePackageData(pkg)
      }

      if (pkg) {
        context.version = context.version || pkg.version

        try {
          repo = getPkgRepo(pkg)
        } catch (err) {
          repo = {}
        }

        if (repo.browse) {
          const browse = repo.browse()
          if (!context.host) {
            if (repo.domain) {
              const parsedBrowse = new URL(browse)
              if (parsedBrowse.origin.indexOf('//') !== -1) {
                context.host = parsedBrowse.protocol + '//' + repo.domain
              } else {
                context.host = parsedBrowse.protocol + repo.domain
              }
            } else {
              context.host = null
            }
          }
          context.owner = context.owner || repo.user || ''
          context.repository = context.repository || repo.project
          context.repoUrl = /undefined/i.exec(browse) ? context.host : browse
        }

        context.packageData = pkg
      }

      context.version = context.version || ''

      if (tagsObj.state === 'fulfilled') {
        gitSemverTags = context.gitSemverTags = tagsObj.value
        fromTag = gitSemverTags[options.releaseCount - 1]
        const lastTag = gitSemverTags[0]

        if (lastTag === context.version || lastTag === 'v' + context.version) {
          if (options.outputUnreleased) {
            context.version = 'Unreleased'
          } else {
            options.outputUnreleased = false
          }
        }
      }

      if (!_.isBoolean(options.outputUnreleased)) {
        options.outputUnreleased = true
      }

      if (context.host && (!context.issue || !context.commit || !parserOpts || !parserOpts.referenceActions)) {
        let type

        if (context.host) {
          const match = context.host.match(rhosts)
          if (match) {
            type = match[0]
          }
        } else if (repo && repo.type) {
          type = repo.type
        }

        if (type) {
          hostOpts = require('./hosts/' + type)

          context = _.assign({
            issue: hostOpts.issue,
            commit: hostOpts.commit
          }, context)
        } else {
          options.warn('Host: "' + context.host + '" does not exist')
          hostOpts = {}
        }
      } else {
        hostOpts = {}
      }

      parserOpts = _.assign(
        {}, config.parserOpts, {
          warn: options.warn
        },
        parserOpts)

      if (hostOpts.referenceActions && parserOpts) {
        parserOpts.referenceActions = hostOpts.referenceActions
      }

      if (_.isEmpty(parserOpts.issuePrefixes) && hostOpts.issuePrefixes) {
        parserOpts.issuePrefixes = hostOpts.issuePrefixes
      }

      writerOpts = _.assign({
        finalizeContext: function (context, _, _, keyCommit, originalCommits) {
          const firstCommit = originalCommits[0]
          const lastCommit = originalCommits[originalCommits.length - 1]
          const firstCommitHash = firstCommit ? firstCommit.hash : null
          const lastCommitHash = lastCommit ? lastCommit.hash : null

          if ((!context.currentTag || !context.previousTag) && keyCommit) {
            const match = /tag:\s*(.+?)[,)]/gi.exec(keyCommit.gitTags)
            const currentTag = context.currentTag
            context.currentTag = currentTag || match ? match[1] : null
            const index = gitSemverTags.indexOf(context.currentTag)

            if (index === -1) {
              context.currentTag = currentTag || null
            } else {
              const previousTag = context.previousTag = gitSemverTags[index + 1]

              if (!previousTag) {
                if (options.append) {
                  context.previousTag = context.previousTag || firstCommitHash
                } else {
                  context.previousTag = context.previousTag || lastCommitHash
                }
              }
            }
          } else {
            context.previousTag = context.previousTag || gitSemverTags[0]

            if (context.version === 'Unreleased') {
              if (options.append) {
                context.currentTag = context.currentTag || lastCommitHash
              } else {
                context.currentTag = context.currentTag || firstCommitHash
              }
            } else if (!context.currentTag) {
              if (options.lernaPackage) {
                context.currentTag = options.lernaPackage + '@' + context.version
              } else if (options.tagPrefix) {
                context.currentTag = options.tagPrefix + context.version
              } else {
                context.currentTag = guessNextTag(gitSemverTags[0], context.version)
              }
            }
          }

          if (!_.isBoolean(context.linkCompare) && context.previousTag && context.currentTag) {
            context.linkCompare = true
          }

          return context
        },
        debug: options.debug
      },
      config.writerOpts, {
        reverse: options.append,
        doFlush: options.outputUnreleased
      },
      writerOpts
      )

      return {
        options: options,
        context: context,
        parserOpts: parserOpts,
        writerOpts: writerOpts,
      }
    })
}

module.exports = mergeConfig