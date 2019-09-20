const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const tag_name = core.getInput('tag_name', { required: true });
    // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
    const tag = tag_name.replace('refs/tags/', '');
    // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
    const release_name = core.getInput('release_name', { required: true }).replace('refs/tags/', '');
    const draft = core.getInput('draft', { required: false }) === 'true' ? true : false;
    const prerelease = core.getInput('prerelease', { required: false }) === 'true' ? true : false;

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    const createReleaseResponse = await github.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: release_name,
      draft,
      prerelease
    });

    // Get the ID, html_url, and upload URL for the created Release from the response
    const { data: { id: release_id, html_url, upload_url } } = createReleaseResponse;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('id', release_id);
    core.setOutput('html_url', html_url);
    core.setOutput('upload_url', upload_url);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
