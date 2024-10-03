import { describe, expect, it } from "vitest";
import { parseIgnored } from "./index";

describe("parseIgnored", () => {
    it.each(["", null, undefined, "\r\n", "\n", "#", "#file"])("doesn't ignore when no patterns to ignore provided (%s)", (input) => {
        // when
        const isIgnored = parseIgnored(input);

        // then
        expect(isIgnored("file")).toBe(false);
        // always ignored
        expect(isIgnored(null)).toBe(true);
        expect(isIgnored("/dev/null")).toBe(true);
    });

    it("ignores ordinary patterns", () => {
        // when
        const isIgnored = parseIgnored("**/src/integration/**\n**/src/test/**\n**/src/testFixtures/**");

        // then
        expect(isIgnored("file")).toBe(false);
        expect(isIgnored("src/test/file")).toBe(true);
        expect(isIgnored("codebase/src/testFixtures/file")).toBe(true);
    });

    it("accepts negated patterns", () => {
        // when
        const isIgnored = parseIgnored(".*\n!.gitignore\nyarn.lock\ngenerated/**");

        // then
        expect(isIgnored(".git")).toBe(true);
        expect(isIgnored(".gitignore")).toBe(false);
        expect(isIgnored("yarn.lock")).toBe(true);
        expect(isIgnored("generated/source")).toBe(true);
    });
});
