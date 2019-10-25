const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

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
    const replaceOldTag = core.getInput('replace_old_tag', { required: false }) === 'true';
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';

    if (replaceOldTag) {
      // Check to see if we need to replace an older release

      try {
        // Get a single reference
        // API Documentation: https://developer.github.com/v3/git/refs/#get-a-single-reference
        // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-git-get-ref
        const getRefResponse = await github.git.getRef({
          owner,
          repo,
          ref: `tags/${tag}`
        });

        console.log(getRefResponse);
        const refSha = getRefResponse.data.object.sha;
        if (refSha !== process.env.GITHUB_SHA) {
          // Delete the tag and release associated with this release

          // Get a release by tag name
          // API Documentation: https://developer.github.com/v3/repos/releases/#get-a-release-by-tag-name
          // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-get-release-by-tag
          const getReleaseResponse = await github.repos.getReleaseByTag({
            owner,
            repo,
            tag
          });

          const releaseId = getReleaseResponse.data.id;

          // Delete a release
          // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
          // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
          await github.repos.deleteRelease({
            owner,
            repo,
            release_id: releaseId
          });

          // Delete a reference
          // API Documentation: https://developer.github.com/v3/git/refs/#delete-a-reference
          // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-git-delete-ref
          await github.git.deleteRef({
            owner,
            repo,
            ref: `tags/${tag}`
          });
        }
      } catch (error) {
        // If this is a 404 then we should be okay to continue on
        // It just means that the release has not been created

        if (error.status !== 404) {
          throw error;
        }
      }
    }

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    const createReleaseResponse = await github.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: releaseName,
      draft,
      prerelease
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
