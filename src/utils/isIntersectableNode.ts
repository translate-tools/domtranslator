export function isIntersectableNode(node: Element) {
	// return true for all element not <opntions>
	if (node.nodeName === 'OPTION') return false;

	return document.body.contains(node);
}
