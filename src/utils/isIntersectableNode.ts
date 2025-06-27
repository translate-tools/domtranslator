export function isIntersectableNode(node: Element) {
	if (node.nodeName === 'OPTION') return false;

	return document.body.contains(node);
}
