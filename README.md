# GitHub Action - Releases API
This GitHub Action (written in JavaScript) wraps the [GitHub Release API](https://developer.github.com/v3/repos/releases/), specifically the [Create a Release](https://developer.github.com/v3/repos/releases/#create-a-release) endpoint, to allow you to leverage GitHub Actions to create releases.

<a href="https://github.com/actions/create-release"><img alt="GitHub Actions status" src="https://github.com/actions/create-release/workflows/Tests/badge.svg"></a>

## Usage
### Pre-requisites
Create a workflow `.yml` file in your `.github/workflows` directory. An [example workflow](#example-workflow---create-a-release) is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs
For more information on these inputs, see the [API Documentation](https://developer.github.com/v3/repos/releases/#input)

- `tag_name`: The name of the tag for this release
- `release_name`: The name of the release
- `body`: Text describing the contents of the release. Optional, and not needed if using `body_path`.
- `body_path`: A file with contents describing the release. Optional, and not needed if using `body`.
- `draft`: `true` to create a draft (unpublished) release, `false` to create a published one. Default: `false`
- `prerelease`: `true` to identify the release as a prerelease. `false` to identify the release as a full release. Default `false`

#### `body_path`
The `body_path` is valuable for dynamically creating a `.md` within code commits and even within the Github Action steps leading up to the `create-release`.

### Outputs
For more information on these outputs, see the [API Documentation](https://developer.github.com/v3/repos/releases/#response-4) for an example of what these outputs look like

- `id`: The release ID
- `html_url`: The URL users can navigate to in order to view the release. i.e. `https://github.com/octocat/Hello-World/releases/v1.0.0`
- `upload_url`: The URL for uploading assets to the release, which could be used by GitHub Actions for additional uses, for example the [`@actions/upload-release-asset`](https://www.github.com/actions/upload-release-asset) GitHub Action

### Example workflow - create a release
On every `push` to a tag matching the pattern `v*`, [create a release](https://developer.github.com/v3/repos/releases/#create-a-release):

```yaml
on:
  push:
    # Sequence of patterns matched against refs/tags
    tags:
      - 'v*' # Push events to matching v*, i.e. v1.0, v20.15.10

name: Create Release

jobs:
  build:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # This token is provided by Actions, you do not need to create your own token
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false
```

This will create a [Release](https://help.github.com/en/articles/creating-releases), as well as a [`release` event](https://developer.github.com/v3/activity/events/types/#releaseevent), which could be handled by a third party service, or by GitHub Actions for additional uses, for example the [`@actions/upload-release-asset`](https://www.github.com/actions/upload-release-asset) GitHub Action. This uses the `GITHUB_TOKEN` provided by the [virtual environment](https://help.github.com/en/github/automating-your-workflow-with-github-actions/virtual-environments-for-github-actions#github_token-secret), so no new token is needed.

### Storing the upload_url in an artifact

There are use cases where you might want to store the upload_url in an artifact so that you can leverage it in a different job. Here is an example

```yaml
on:
  push:
    tags:
      - 'v*'

name: Create Release

jobs:
  build:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@master
      - name: Create Release
        id: create_release
        uses: actions/create-release@latest
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false

      # store the value of upload_url in a text file, double quotes are important to avoid shell expansion
      - run: echo "${{ steps.create_release.outputs.upload_url }}" > ./upload_url.txt

      - name: 'Store upload url'
        uses: actions/upload-artifact@v1
        with:
          name: upload_url
          path: ./upload_url.txt

  upload:
      - uses: actions/checkout@v2

      - name: Use Node.js
        uses: actions/setup-node@v1
        with:
          node-version: 12.x

      - uses: actions/download-artifact@v1
          with:
            name: upload_url

        - id: upload_url
          run: |
            URL=$(cat upload_url/upload_url.txt)
            echo "::set-output name=url::${URL}"

        - name: Upload Linux Asset
          uses: actions/upload-release-asset@v1
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          with:
            upload_url: ${{ steps.upload_url.outputs.url }}
            asset_path: ./.out/some-binary
            asset_name: some-binary (linux)
            asset_content_type: application/octet-stream
```

## Contributing
We would love you to contribute to `@actions/create-release`, pull requests are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## License
The scripts and documentation in this project are released under the [MIT License](LICENSE)
