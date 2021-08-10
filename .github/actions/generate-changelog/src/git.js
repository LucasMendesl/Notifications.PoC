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
    const message = releaseCommitMessageFormat.replace(/{{currentTag}}/g, currentTag)

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

const getLastCommits = (client, sha, listCommitsPaylod) => ({ data }) => {
    if (data.length === 0) {
        return client.repos.listCommits(listCommitsPaylod)
            .then(({ data: commits }) => commits.map(({ sha, commit }) => ({ sha, message: commit.message })))
    }
    
    const [{ commit }] = data
    return client.repos.compareCommits({ base: commit.sha, head: sha, ...extractTagsPayload })
        .then(({ data: { commits } }) => commits.map(({ sha, commit }) => ({ sha, message: commit.message })))
}

const getReleaseCommits = client => ({ sha, payload: { repository: { name, owner } } }) => {    
    const extractTagsPayload = {
        owner: owner.name,
        repo: name
    }
    
    return Bluebird.resolve(extractTagsPayload)
        .then(client.repos.listTags)
        .then(getLastCommits(client, sha, extractTagsPayload))
}

module.exports = { 
    createTaggedCommit,
    getReleaseCommits 
}