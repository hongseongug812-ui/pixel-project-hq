import { describe, it, expect, beforeEach } from "vitest";
import { readStorage, isObjectArray, isPlainObject } from "./storage";

describe("readStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key does not exist", () => {
    expect(readStorage("missing", () => true, "default")).toBe("default");
  });

  it("returns fallback on invalid JSON", () => {
    localStorage.setItem("bad", "{ invalid json }");
    expect(readStorage("bad", () => true, "fallback")).toBe("fallback");
  });

  it("returns fallback when guard returns false", () => {
    localStorage.setItem("k", '"hello"');
    const isNumArray = (v: unknown): v is number[] => Array.isArray(v);
    expect(readStorage("k", isNumArray, [])).toEqual([]);
  });

  it("returns parsed value when guard passes", () => {
    localStorage.setItem("k", '[1,2,3]');
    expect(readStorage("k", Array.isArray, [])).toEqual([1, 2, 3]);
  });

  it("returns fallback when stored value is empty string", () => {
    localStorage.setItem("k", "");
    expect(readStorage("k", () => true, "fb")).toBe("fb");
  });

  it("handles object value with guard correctly", () => {
    localStorage.setItem("obj", JSON.stringify({ name: "test" }));
    expect(readStorage("obj", isPlainObject, {})).toEqual({ name: "test" });
  });
});

describe("isObjectArray", () => {
  it("returns true for array of plain objects", () => {
    expect(isObjectArray([{ a: 1 }, { b: 2 }])).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(isObjectArray([])).toBe(true);
  });

  it("returns false when array contains null", () => {
    expect(isObjectArray([null, { a: 1 }])).toBe(false);
  });

  it("returns false for non-array input", () => {
    expect(isObjectArray({ a: 1 })).toBe(false);
    expect(isObjectArray("string")).toBe(false);
    expect(isObjectArray(42)).toBe(false);
    expect(isObjectArray(null)).toBe(false);
  });

  it("returns false for array of primitives", () => {
    expect(isObjectArray([1, 2, 3])).toBe(false);
    expect(isObjectArray(["a", "b"])).toBe(false);
  });
});

describe("isPlainObject", () => {
  it("returns true for a plain object", () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject({})).toBe(true);
  });

  it("returns false for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});
