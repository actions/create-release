const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');

const MAX_SUB_VERSION = 100;
async function getCurrentRelease(github, owner, repo, tag, version = 0) {
  if (version >= MAX_SUB_VERSION) return null;
  const currentRelease = (await github.repos.getReleaseByTag({ owner, repo, tag: `${tag}.${version}` })).data;
  if (currentRelease) return currentRelease;
  return getCurrentRelease(github, owner, repo, tag, version + 1);
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

    let createReleaseResponse;
    let v = 0;
    const params = {
      owner,
      repo,
      tag_name: `${tag}.${v}`,
      name: releaseName,
      body: bodyFileContent || body,
      draft,
      prerelease,
      target_commitish: commitish
    };
    try {
      console.log(`See if the tag ${tag}.${v} exists first...`);
      const tags = await github.git.listMatchingRefs({ owner, repo, ref: `tags/${tag}.${v}` });
      if (tags && tags.length) {
        throw new Error(`Tags with that prefix exist. Do the dance. ${JSON.stringify(tags)}`);
      } else {
        console.log(`All I got was: `, tags);
      }
      console.log('Trying to release with params:', params);
      // Create a release
      // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
      createReleaseResponse = await github.repos.createRelease(params);
    } catch (e) {
      console.log(`Release failed: ${e.message} - trying to update`);
      // Failed to create - maybe it already exists...
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-get-release-by-tag
      const currentRelease = await getCurrentRelease(github, owner, repo, tag);
      if (!currentRelease) throw e;
      console.log(`Current release:`, currentRelease);
      const m = /\.(\d+)$/.exec(currentRelease.tag_name);
      if (!m) {
        throw new Error(`tag_name ${currentRelease.tag_name} doesn't match regexp`);
      }
      v = parseInt(m[1], 10) + 1;

      // Delete the release
      await github.repos.deleteRelease({ owner, repo, release_id: currentRelease.id });
      params.tag_name = `${tag}.${v}`;
      // and recreate
      createReleaseResponse = await github.repos.createRelease(params);
    }

    console.log(`End result: `, createReleaseResponse);

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
