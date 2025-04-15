export function isIntersectingNode(node: Element) {
	// return true for all element not <options>
	if (node.nodeName === 'OPTION') return false;

	return document.body.contains(node);
}
