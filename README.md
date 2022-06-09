# SwiftLint for VS Code

VS Code extension to enforce Swift style and conventions via [SwiftLint](https://github.com/realm/SwiftLint). You can use SwiftLint installed globally or via the Swift Package Manager.

### Global Installation

You can [install](https://github.com/realm/SwiftLint#installation) SwiftLint globally using [Homebrew](http://brew.sh/) or [Mint](https://github.com/yonaskolb/Mint). For a local setup you can use the Swift Package Manager.

```bash
# Using Homebrew
$ brew install swiftlint
# Using Mint
$ mint install realm/SwiftLint
# Manually
$ git clone https://github.com/realm/SwiftLint.git
$ swift build -c release
```

### Local Installation

Add the package to your dependencies in `Package.swift`:

```diff
// swift-tools-version:4.2

import PackageDescription

let package = Package(
    name: "Komondor",
    products: [ ... ],
    dependencies: [
        // My dependencies
        .package(url: "https://github.com/orta/PackageConfig.git", from: "0.0.1"),
        // Dev deps
        .package(url: "https://github.com/orta/Komondor.git", from: "0.0.1"),
+        .package(url: "https://github.com/realm/SwiftLint.git", from: "0.37.0"),
    ],
    targets: [...]
)
```

## Configuration

| Config                                  | Type       | Default                                      | Description                                                                                                                             |
| --------------------------------------- | ---------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `swiftlint.enable`                      | `Bool`     | `true`                                       | Whether SwiftLint should actually do something.                                                                                         |
| `swiftlint.onlyEnableOnSwiftPMProjects` | `Bool`     | `false`                                      | Requires and uses a SwiftLint as SwiftPM dependency.                                                                                    |
| `swiftlint.onlyEnableWithConfig`        | `Bool`     | `false`                                      | Only lint if config present.                                                                                                            |
| `swiftlint.path`                        | `String`   | `/usr/local/bin/swiftlint`                   | The location of the globally installed SwiftLint.                                                                                       |
| `swiftlint.additionalParameters`        | `[String]` | `["--format"]`                               | Additional parameters to pass to SwiftLint.                                                                                             |
| `swiftlint.configSearchPaths`           | `[String]` | `[]`                                         | Possible paths for SwiftLint config. _This disables [nested configurations](https://github.com/realm/SwiftLint#nested-configurations)!_ |
| `swiftlint.forceExcludePaths`           | `[String]` | `["tmp","build",".build","Pods","Carthage"]` | Paths to be excluded from being passed to SwiftLint.                                                                                    |
| `swiftlint.autoLintWorkspace`           | `Bool`     | `true`                                       | Automatically lint the whole project right after start.                                                                                 |

## Commands

| Short Title               | Command                   |
| ------------------------- | ------------------------- |
| SwiftLint: Lint workspace | `swiftlint.lintWorkspace` |
| SwiftLint: Fix workspace  | `swiftlint.fixWorkspace`  |
| SwiftLint: Fix document   | `swiftlint.fixDocument`   |

To automatically fix all issues within a document on save, add the following to your `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

## Contributors

- Valentin Knabel, [@vknabel](https://github.com/vknabel), [@vknabel](https://twitter.com/vknabel) on Twitter

## License

vscode-swiftlint is available under the [MIT](./LICENSE) license.
