jest.mock('@actions/core');
jest.mock('@actions/github');

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const run = require('../src/create-release.js');

/* eslint-disable no-undef */
describe('Create Release', () => {
  let getRef;
  let deleteRef;
  let createRelease;
  let deleteRelease;
  let getReleaseByTag;

  beforeEach(() => {
    process.env = Object.assign(process.env, { GITHUB_SHA: 'sha1234' });

    getRef = jest.fn(obj => {
      let sha = null;

      if (obj.ref === 'tags/existing') sha = 'sha1234';
      if (obj.ref === 'tags/replaceExisting') sha = 'sha2345';

      if (sha) {
        return {
          data: {
            object: {
              sha
            }
          }
        };
      }

      const error = {
        status: 404
      };
      throw error;
    });

    deleteRef = jest.fn();

    createRelease = jest.fn().mockReturnValueOnce({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl'
      }
    });

    deleteRelease = jest.fn();

    getReleaseByTag = jest.fn().mockReturnValueOnce({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl'
      }
    });

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const github = {
      git: {
        getRef,
        deleteRef
      },
      repos: {
        createRelease,
        deleteRelease,
        getReleaseByTag
      }
    };

    GitHub.mockImplementation(() => github);
  });

  test('Create release endpoint is called', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      draft: false,
      prerelease: false
    });
  });

  test('Draft release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      draft: true,
      prerelease: false
    });
  });

  test('Pre-release release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      draft: false,
      prerelease: true
    });
  });

  test('Existing release is not retrieved when tag does not exist', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(getRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'tags/v1.0.0'
    });

    expect(getReleaseByTag).toHaveBeenCalledTimes(0);

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      draft: false,
      prerelease: false
    });
  });

  test('Current release is not deleted', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/existing')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    core.setOutput = jest.fn();

    await run();

    expect(getRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'tags/existing'
    });

    expect(deleteRelease).toHaveBeenCalledTimes(0);

    expect(createRelease).toHaveBeenCalledTimes(0);

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'id', 'releaseId');
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'html_url', 'htmlUrl');
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'upload_url', 'uploadUrl');
  });

  test('Older release is deleted', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/replaceExisting')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(deleteRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      release_id: 'releaseId'
    });

    expect(deleteRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'tags/replaceExisting'
    });

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'replaceExisting',
      name: 'myRelease',
      draft: false,
      prerelease: false
    });
  });

  test('Outputs are set', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    core.setOutput = jest.fn();

    await run();

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'id', 'releaseId');
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'html_url', 'htmlUrl');
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'upload_url', 'uploadUrl');
  });

  test('Action fails elegantly', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease.mockRestore();
    createRelease.mockImplementation(() => {
      throw new Error('Error creating release');
    });

    core.setOutput = jest.fn();

    core.setFailed = jest.fn();

    await run();

    expect(createRelease).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith('Error creating release');
    expect(core.setOutput).toHaveBeenCalledTimes(0);
  });
});
