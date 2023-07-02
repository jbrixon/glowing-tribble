import * as patternMatching from "../src/patternMatching";


describe("patternMatching", () => {
  test("simple string patterns are matched", () => {
    const testPattern = "this/is/a/test/pattern";
    const result = patternMatching.checkForMatch(testPattern, testPattern);

    expect(result.match).toBe(true);
  });


  test("non-matching string patterns are not matched", () => {
    const testPattern = "this/is/a/test/pattern";
    const testString = "this/is/a/test/string";
    const result = patternMatching.checkForMatch(testPattern, testString);

    expect(result.match).toBe(false);
  });


  test("patterns containing named variables are matched", () => {
    const testPattern = "this/is/a/test/{type}";
    const testString = "this/is/a/test/string";

    const result = patternMatching.checkForMatch(testPattern, testString);

    expect(result.match).toBe(true);
  });


  test("a single parameter in a pattern is returned with a name", () => {
    const testPattern = "this/is/a/test/{type}";
    const testString = "this/is/a/test/string";

    const result = patternMatching.checkForMatch(testPattern, testString);

    expect(result.params.type).toBe("string");
  });


  test("multiple parameters in a pattern are returned with a name", () => {
    const testPattern = "this/{verb}/a/test/{noun}";
    const testString = "this/is/a/test/string";

    const result = patternMatching.checkForMatch(testPattern, testString);

    expect(result.params.verb).toBe("is");
    expect(result.params.noun).toBe("string");
  });
});
