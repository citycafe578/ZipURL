import { compress, decompress } from "../src/index.js";
import { describe, expect, it } from "vitest";

describe("ZipURL library", () => {
    it("round-trips plain text", () => {
        const input = "hello hello hello";
        expect(decompress(compress(input))).toBe(input);
    });

    it("round-trips JSON with a prefix", () => {
        const input = JSON.stringify({ users: [{ name: "Alice" }, { name: "Bob" }] });
        const packed = compress(input, "zip://");

        expect(decompress(packed)).toBe(input);
    });
});