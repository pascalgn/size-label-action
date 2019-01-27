# size-label-action

GitHub action to assign labels based on pull request change sizes.

Labels are taken from https://github.com/kubernetes/kubernetes/labels?q=size

## Usage

Add this to your `.github/main.workflow` file:

```
workflow "on pull request changes, assign size labels" {
  on = "pull_request"
  resolves = ["assign size labels"]
}

action "assign size labels" {
  uses = "pascalgn/size-label-action@82c8333"
  secrets = ["GITHUB_TOKEN"]
}
```

## License

MIT
