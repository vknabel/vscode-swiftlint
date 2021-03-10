# Changelog

## 1.4.1

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
