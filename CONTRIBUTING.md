# Contributing

Thanks for being interested in contributions!

We have some quirks about `@wfcd/items`... especially pull requests.

Make sure you've run
```bash
npm run lint
npm run build
npm test
```
before submitting a pull request.

## Pull Requests

We have a few rules about pull requests:
1. Don't use merge commits.
2. Always rebase your branch on top of the latest `master` branch.   
    `alias rebase='git fetch -ap && git rebase $(git symbolic-ref refs/remotes/origin/HEAD --short)'`   
     is one of my oft-used git aliases that helps with this.

## Issues

If you find a bug, please file an issue. If you have a feature request, please file an issue.

In either case, you're welcome to open a pull request with or without an issue, it would just be helpful to have the issue in case your PR gets abandoned or isn't the way we want to implement said fix/feature.

## Code Style
We use [Prettier](https://prettier.io/) plugged into eslint for code formatting. Please make sure to run `npm run lint` before submitting a pull request.

## License

The `warframe-items` repository is licensed under the [MIT License](LICENSE). By contributing to this repository, you agree that your contributions will be licensed under the same license.
