jest.mock('@actions/core');
jest.mock('@actions/github');

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const run = require('../src/main.js');

/* eslint-disable no-undef */
describe('module', () => {
  let createRelease;

  beforeEach(() => {
    core.getInput = jest.fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease = jest.fn();

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const github = {
      repos: {
        createRelease
      }
    };

    GitHub.mockImplementation(() => github);
  });

  test('Create release endpoint is called', async () => {
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

  test('Outputs are set', async () => {});
});
