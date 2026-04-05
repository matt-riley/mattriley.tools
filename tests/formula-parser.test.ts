import { describe, expect, it } from "vitest";

import { parseFormula } from "../scripts/formula-parser.mjs";

describe("parseFormula", () => {
  it("extracts the fields used by the generated site data", () => {
    const content = `
class Example < Formula
  desc "Example tool"
  homepage "https://github.com/matt-riley/example"
  version "1.2.3"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/matt-riley/example/releases/download/v1.2.3/example_Darwin_x86_64.tar.gz"
      sha256 "abc"

      def install
        bin.install "example"
      end
    end
    if Hardware::CPU.arm?
      url "https://github.com/matt-riley/example/releases/download/v1.2.3/example_Darwin_arm64.tar.gz"
      sha256 "def"

      def install
        bin.install "example"
      end
    end
  end

  on_linux do
    if Hardware::CPU.intel? && Hardware::CPU.is_64_bit?
      url "https://github.com/matt-riley/example/releases/download/v1.2.3/example_Linux_x86_64.tar.gz"
      sha256 "ghi"

      def install
        bin.install "example"
      end
    end
  end
end
`;

    expect(parseFormula(content, "/tmp/example.rb")).toEqual({
      slug: "example",
      name: "example",
      description: "Example tool",
      homepage: "https://github.com/matt-riley/example",
      version: "1.2.3",
      license: null,
      installCommand: "brew install matt-riley/tools/example",
      binaryNames: ["example"],
      platforms: ["macOS (Intel, Apple Silicon)", "Linux (x86_64)"],
      formulaFile: "Formula/example.rb",
    });
  });
});
