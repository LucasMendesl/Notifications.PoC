const Bluebird = require('bluebird')
const gitSemverTags = require('git-semver-tags')

const getTags = Bluebird.promisify(gitSemverTags)

getTags()
    .then(([last]) => console.log(last))