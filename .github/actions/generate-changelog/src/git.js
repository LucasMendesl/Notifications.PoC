const Bluebird = require('bluebird')
const formatCommit = require('./formatter')


const { exec } = require('child_process')
const { 
    GITHUB_REPOSITORY, 
    GITHUB_REF 
} = process.env

const execAsync = Bluebird.promisify(exec)

const execCommand = (command, options = {}) => {
    const handleExecResult = ({ stdout, stderr }) => {
        if (stderr) return Bluebird.reject(stderr)
        console.log('stdout', stdout)
        return Bluebird.resolve((stdout || '').split('\n'))
    }

    return execAsync(`git ${command}`, options)
        .then(handleExecResult)
}

const createTaggedCommit = ({ releaseCommitMessageFormat, tagPrefix }, actionContext) => newVersion => {
    const currentTag = `${tagPrefix}${newVersion}`
    const message = formatCommit(releaseCommitMessageFormat, currentTag)

    return Bluebird.all([        
        execCommand(`config user.name "${actionContext.getInput('git-name')}"`),
        execCommand(`config user.email "${actionContext.getInput('git-email')}"`),
        execCommand(`remote set-url origin https://x-access-token:${actionContext.getInput('token')}@github.com/${GITHUB_REPOSITORY}.git`)
    ])
    .tap(() => actionContext.info('setup git config infos 👌👌'))
    .then(() => execCommand('add .'))
    .then(() => execCommand(`commit -m "${message}"`))
    .tap(() => actionContext.info('files commited 👀'))
    .then(() => execCommand(`tag -a ${currentTag} -m "${message}"`))
    .tap(() => actionContext.info(`tag ${currentTag} created with success ✌️✌️`))
    .then(() => execCommand(`push origin ${GITHUB_REF.replace('refs/heads/', '')} --follow-tags`))
    .tap(() => actionContext.info(`changelog and tags pushed with success 🙏🙏`))
}

const getReleaseCommits = client => ({ sha, issue }) => {    
    const extractTagsPayload = {
        owner: issue.owner,
        repo: issue.repo
    }
    
    const getAllCommits = ({ data }) => {
        console.log('DATA', JSON.stringify(data, null, 4))
        const buildCommitObject = ({ data: { commits } }) => commits.map(({ sha, commit }) => ({ sha, message: commit.message }))        

        if (!data || data.length === 0) {
            return client.repos.listCommits(extractTagsPayload)
                .then(buildCommitObject)
        }
        
        return client.repos.compareCommits({ base: commit.sha, head: sha, ...extractTagsPayload })
            .then(buildCommitObject)
    }

    return Bluebird.resolve(extractTagsPayload)
        .then(client.repos.listTags)
        .then(getAllCommits)
}

module.exports = { 
    createTaggedCommit,
    getReleaseCommits 
}