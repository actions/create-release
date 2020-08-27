jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs');

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');
const run = require('../src/create-release.js');

/* eslint-disable no-undef */
describe('Create Release', () => {
  let createRelease;

  beforeEach(() => {
    createRelease = jest.fn().mockReturnValueOnce({
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
    context.sha = 'sha';

    const github = {
      repos: {
        createRelease
      }
    };

    GitHub.mockImplementation(() => github);
  });

  test('Create release endpoint is called', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Create release endpoint is called on another repo', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('otherRepo')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'otherRepo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Create release endpoint is called on another repo owned by another owner', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('otherOwner/otherRepo')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'otherOwner',
      repo: 'otherRepo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Draft release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Pre-release release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: true,
      target_commitish: 'sha'
    });
  });

  test('Release with empty body is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Release body based on file', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('notes.md');

    fs.readFileSync = jest.fn().mockReturnValueOnce('# this is a release\nThe markdown is strong in this one.');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '# this is a release\nThe markdown is strong in this one.',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Outputs are set', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
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
      .mockReturnValueOnce('')
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
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
