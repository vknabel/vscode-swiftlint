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

| Config                                 | Type       | Default                       | Description                                                |
| -------------------------------------- | ---------- | ----------------------------- | ---------------------------------------------------------- |
| `apple-swift-format.enable`            | `Bool`     | `true`                        | Whether apple/swift-format should actually do something.   |
| `apple-swift-format.path`              | `String`   | `/usr/local/bin/swift-format` | The location of the globally installed apple/swift-format. |
| `apple-swift-format.configSearchPaths` | `[String]` | `[".swift-format"]`           | Possible paths for apple/swift-format config.              |

## Contributors

- Valentin Knabel, [@vknabel](https://github.com/vknabel), [@vknabel](https://twitter.com/vknabel) on Twitter

## License

vscode-apple-swift-format is available under the [MIT](./LICENSE) license.
