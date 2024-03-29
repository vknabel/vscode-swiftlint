# Changelog

## next 1.8.4

- fix: line must be non-negative #61
- fix: default swiftlint.path value is invalid on Windows #67
- fix: respect nested swift projects, see vknabel/vscode-swiftformat#26
- fix: no lintable files found #68

## 1.8.1

- fix: improved error message when SwiftLint is not installed #56 #57

## 1.8.0

- removed: `swiftlint.forceExcludePaths` as it didn't work. Use `excluded` in your `.swiftlint` config instead. #39
- Added: `swiftlint.path` can now be an array of strings and defaults to `[/usr/bin/env, swiftlint]` [vknabel/vscode-apple-swift-format#17](https://github.com/vknabel/vscode-apple-swift-format/issues/17)

## 1.7.3

- fix: Unrecognized arguments: --format #47 #55
- fix: No lintable files found at paths: '' #54
- fix: Unexpected end of JSON input #53

## 1.7.2

- updated dependencies

## 1.7.1

- fix: on Linux, must also be linked

## 1.7.0

- Added: `swiftlint.additionalParameters` to enable `--format` fixes #43
- Added: build SwiftLint if needed #42

## 1.6.0

- Added: `swiftlint.onlyEnableWithConfig` to only enable SwiftLint with a config [vknabel/vscode-swiftformat#20](https://github.com/vknabel/vscode-swiftformat/issues/20)
- Fixed: `swiftlint.onlyEnableOnSwiftPMProjects` didn't work correctly

## 1.5.0

- New commands to fix autocorrect workspace and file issues `swiftlint.fixWorkspace` and `swiftlint.fixDocument` #40

To automatically fix all issues within a document on save, add the following to your `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

## 1.4.6

- Support non-workspace linting, e.g. for specific files. #33 #35 #36

## 1.4.5

[CVE-2021-28790](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-28790): Fixes vulnerability which allowed malicous workspaces to execute code when opened by providing. Now the vulnerable configs cannot be overrided in workspaces anymore: `swiftlint.path`. Reported by [@Ry0taK](https://github.com/Ry0taK).

## 1.4.4

- Pass currently linted file path to Swiftlint #30 after save

## 1.4.3

- Nested configurations were not supported by default #30

## 1.4.2

- Reference EBADF-issue #28 #31 (wrong url)

## 1.4.1

- Reference EBADF-issue #28 #31

## 1.4.0

- Nested configurations support #23

## 1.3.0

- Added setting `swiftlint.autoLintWorkspace` to en-/disable workspace linting on extension startup #25
- Added command `swiftlint.lintWorkspace` to manually lint the whole project #25

## 1.2.7

- Pass correct working directory to SwiftLint #24
- Kill remaining SwiftLint processes on deactivate #24

## 1.2.6

- Re-release 1.2.4 #24

## 1.2.5

- Fix crash on empty .swiftlint.yml-files
- Better support for .swiftlint.yml without includes or excludes
- Increased buffer size for Linting results
- Reduced amount of paths transferred to SwiftLint

## 1.2.4

- Bugfix: `EPIPE` with Command Line Tools selected #11

## 1.2.3

- Bugfix: Linted `git:` files #16

## 1.2.2

- Bugfix: Previous release linting filters were broken #13

## 1.2.1

- Bugfix: Parse excludes and includes of `.swiftlint.yml`-configs to match CLI behavior #12

## 1.2.0

- Feature: Introduced `swiftlint.forceExcludePaths` to exclude paths from being passed to SwiftLint #12

## 1.1.0

- Feature: Display rule id alongside with description
- Fixed: `E2BIG` errors #9, #10
- Fixed: Config search paths was not repsected for single files #8

## 1.0.5

- Fixed: `swiftlint.configSearchPaths` did not support `~` #8

## 1.0.4

- Fixed: Unexpected end of JSON input #4 and #7
- Fixed: `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` stdout maxBuffer length exceeded #5
- Fixed: No lintable files found at paths #6

## 1.0.3

- Fixed: `swiftlint.configSearchPaths` was not respected
- Fixed: added some default exclude paths to prevent scanning dependencies #3

## 1.0.2

- Fixed: `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` by increasing the max buffer during lint #3

## 1.0.1

- Fixed: Illegal value for `line` #1

## 1.0.0

- Initial release
