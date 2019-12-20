const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

async function findRelease(github, owner, repo, tagName) {
  const resp = await github.repos.listReleases({
    owner,
    repo
  });
  const releases = resp.data;
  return releases.find(release => {
    if (release.tag_name === tagName) {
      if (release.draft || release.prerelease) {
        return true;
      }
    }
    return false;
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
    const releaseName = core.getInput('release_name', { required: true }).replace('refs/tags/', '');
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';

    let release = await findRelease(github, owner, repo, tag);
    if (!release) {
      // Create a release
      // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
      release = await github.repos.createRelease({
        owner,
        repo,
        tag_name: tag,
        name: releaseName,
        body,
        draft,
        prerelease
      });
    } else {
      const releaseId = release.id;
      await github.repos.updateRelease({
        owner,
        repo,
        release_id: releaseId,
        tag_name: tag,
        name: releaseName,
        body,
        draft,
        prerelease
      });
    }

    // Get the ID, html_url, and upload URL for the created Release from the response
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = release;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('id', releaseId);
    core.setOutput('html_url', htmlUrl);
    core.setOutput('upload_url', uploadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
