export function countNewLines(string: string) {
  let count = 1;
  for (let i = 0, l = string.length; i < l; i++) {
    if (string[i] === "\n") {
      count++;
    }
  }

  return count;
}
