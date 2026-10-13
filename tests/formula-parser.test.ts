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
  it("accepts single-quoted formula fields", () => {
    const content = `
class Crap < Formula
  desc 'Change Risk Anti-Patterns (CRAP) scoring'
  homepage 'https://github.com/matt-riley/crap'
  version '0.1.5'
  license 'MIT'
  on_macos do
    on_arm do
      url 'https://github.com/matt-riley/crap/releases/download/v0.1.5/crap_darwin_arm64.tar.gz'
    end
  end
  def install
    bin.install 'crap'
  end
end
`;

    expect(parseFormula(content, "/tmp/crap.rb")).toMatchObject({
      description: "Change Risk Anti-Patterns (CRAP) scoring",
      homepage: "https://github.com/matt-riley/crap",
      version: "0.1.5",
      license: "MIT",
      binaryNames: ["crap"],
      platforms: ["macOS (Apple Silicon)"],
    });
  });

  it("detects platforms from target-triple style asset names", () => {
    const content = `
class Agit < Formula
  desc "AI-agent version control"
  homepage "https://github.com/matt-riley/agengit"
  version "1.26.2"
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/matt-riley/agengit/releases/download/v1.26.2/agit-aarch64-macos.tar.gz"
    else
      url "https://github.com/matt-riley/agengit/releases/download/v1.26.2/agit-x86_64-macos.tar.gz"
    end
  end
  on_linux do
    if Hardware::CPU.arm? && Hardware::CPU.is_64_bit?
      url "https://github.com/matt-riley/agengit/releases/download/v1.26.2/agit-aarch64-linux.tar.gz"
    else
      url "https://github.com/matt-riley/agengit/releases/download/v1.26.2/agit-x86_64-linux.tar.gz"
    end
  end
  def install
    bin.install "agit"
  end
end
`;

    expect(parseFormula(content, "/tmp/agit.rb").platforms).toEqual([
      "macOS (Intel, Apple Silicon)",
      "Linux (x86_64, arm64)",
    ]);
  });
});
