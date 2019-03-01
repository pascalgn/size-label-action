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

## Configuration

The following environment variables are supported:

- `IGNORED`: A list of [glob expressions](http://man7.org/linux/man-pages/man7/glob.7.html)
  separated by newlines. Files matching these expressions will not count when
  calculating the change size of the pull request. Lines starting with `#` are
  ignored and files matching lines starting with `!` are always included.

You can configure the environment variables in the workflow file like this:

```
action "assign size labels" {
  uses = ...
  secrets = ["GITHUB_TOKEN"]
  env = {
    IGNORED = ".*\n!.gitignore\nyarn.lock\ngenerated/**"
  }
}
```

## License

MIT
