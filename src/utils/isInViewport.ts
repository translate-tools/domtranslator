/**
 * Check visibility of element in viewport
 */
export function isInViewport(element: Element, threshold = 0) {
	const { top, left, bottom, right, height, width } = element.getBoundingClientRect();
	const overflows = {
		top,
		left,
		bottom: (window.innerHeight || document.documentElement.clientHeight) - bottom,
		right: (window.innerWidth || document.documentElement.clientWidth) - right,
	};

	if (overflows.top + height * threshold < 0) return false;
	if (overflows.bottom + height * threshold < 0) return false;

	if (overflows.left + width * threshold < 0) return false;
	if (overflows.right + width * threshold < 0) return false;

	return true;
}
