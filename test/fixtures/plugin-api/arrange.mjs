// The arrangements of the plugin API fixtures. A test sets an answer here before it runs a call that has no answer of its own: the
// fixture of `shellQuotePath` answers only the function that the test set, and refuses a call without one.

/** The answer functions of the fixtures, by fixture name. A test replaces an entry and restores it when the test ends. */
export const arrangement = {
  shellQuotePath: null,
};
