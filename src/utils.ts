/**
 * Get the text height so that a string is of a desired width.
 * @param text The text to measure.
 * @param desiredWidth How wide the text should be.
 * @param maximumHeight Do not let the text be any taller than this.
 */
export function textHeightForWidth(text: string, desiredWidth: number, maximumHeight = 1) {
	const heightWidthRatio = 1.4; // assumed
	return Math.min(maximumHeight, heightWidthRatio * desiredWidth / text.length);
}
