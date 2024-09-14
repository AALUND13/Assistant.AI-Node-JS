/**
* Truncates a given string to a specified length, optionally appending an ellipsis.
* @param str - The input string to truncate.
* @param n - The maximum length of the truncated string.
* @param swap - If true, the ellipsis is prepended instead of appended.
* @returns The truncated string, with an ellipsis appended or prepended if the original string exceeds the specified length.
*/
export function truncateString(str: string, n: number, swap: boolean = false): string {
    if (!str) return '';
    if (!swap)return (str.length > n) ? str.slice(0, n) + '...' : str;
    else return (str.length > n) ? '...' + str.slice(-(n - 3)) : str;
}


/**
* Checks if a given string is composed entirely of whitespace characters.
* @param str - The string to check.
* @returns `true` if the string is composed entirely of whitespace characters, `false` otherwise.
*/
export function isWhitespace(str: string) {
    return /^\s*$/.test(str);
}