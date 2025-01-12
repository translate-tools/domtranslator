/**
 * @param handler if return `false`, loop will stop
 */
export const nodeExplore = (
	inputNode: Node,
	nodeFilter: number,
	includeSelf: boolean,
	handler: (value: Node) => void | boolean,
) => {
	const walk = document.createTreeWalker(inputNode, nodeFilter, null);
	let node = includeSelf ? walk.currentNode : walk.nextNode();
	while (node) {
		if (handler(node) === false) {
			return;
		}
		node = walk.nextNode();
	}
};
