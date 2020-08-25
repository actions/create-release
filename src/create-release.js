const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');
const parseChangelog = require('changelog-parser');

function getChangelogVersionInfo(filename) {
  parseChangelog(filename)
    .then(result => {
      if (result && result.versions && result.versions.length > 0) {
        return result.versions[0];
      }
      return null;
    })
    .catch(err => {
      console.log(err);
      return null;
    });
}

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const tagName = core.getInput('tag_name', { required: true });

    // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
    const tag = tagName.replace('refs/tags/', '');
    const releaseName = core.getInput('release_name', { required: false }).replace('refs/tags/', '');
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';
    const commitish = core.getInput('commitish', { required: false }) || context.sha;

    const bodyPath = core.getInput('body_path', { required: false });
    let bodyFileContent = null;
    if (bodyPath !== '' && !!bodyPath) {
      try {
        bodyFileContent = fs.readFileSync(bodyPath, { encoding: 'utf8' });
      } catch (error) {
        core.setFailed(error.message);
      }
    }

    const changelogPath = core.getInput('changelog_path', { required: false });
    let changelogBody = null;
    let changelogTag = null;
    if (changelogPath !== '' && !!changelogPath) {
      const versionInfo = getChangelogVersionInfo(changelogPath);
      console.log(versionInfo);
      if (versionInfo) {
        changelogBody = versionInfo.body;
        changelogTag = `v${versionInfo.version}`;
      }
    }

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    const createReleaseResponse = await github.repos.createRelease({
      owner,
      repo,
      tag_name: changelogTag || tag,
      name: releaseName,
      body: bodyFileContent || changelogBody || body,
      draft,
      prerelease,
      target_commitish: commitish
    });

    // Get the ID, html_url, and upload URL for the created Release from the response
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = createReleaseResponse;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('id', releaseId);
    core.setOutput('html_url', htmlUrl);
    core.setOutput('upload_url', uploadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
