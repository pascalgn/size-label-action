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
  uses = "pascalgn/size-label-action@1466ebfa0fcd73a83743c95a5200d3266bc82c68"
  secrets = ["GITHUB_TOKEN"]
}
```

## License

MIT
