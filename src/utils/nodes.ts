export const searchParent = (
	node: Node,
	callback: (value: Node) => boolean,
	includeSelf = false,
) => {
	// Check self
	if (includeSelf && callback(node)) {
		return node;
	}

	// Check parents
	let lookingNode: Node | null = node;
	while ((lookingNode = lookingNode.parentNode)) {
		if (callback(lookingNode)) {
			break;
		}
	}
	return lookingNode;
};

export const configureTranslatableNodePredicate = (
	config: {
		ignoredTags?: string[];
		translatableAttributes?: string[];
	} = {},
) => {
	const ignoredTags = new Set(config.ignoredTags);
	const translatableAttributes = new Set(config.translatableAttributes);

	return (targetNode: Node) => {
		let targetToParentsCheck: Element | null = null;

		// Check node type and filters for its type
		if (targetNode instanceof Element) {
			if (ignoredTags.has(targetNode.localName)) {
				return false;
			}

			targetToParentsCheck = targetNode;
		} else if (targetNode instanceof Attr) {
			if (!translatableAttributes.has(targetNode.name)) {
				return false;
			}

			targetToParentsCheck = targetNode.ownerElement;
		} else if (targetNode instanceof Text) {
			targetToParentsCheck = targetNode.parentElement;
		} else {
			return false;
		}

		// Check parents to ignore
		if (targetToParentsCheck !== null) {
			const ignoredParent = searchParent(
				targetToParentsCheck,
				(node: Node) =>
					node instanceof Element && ignoredTags.has(node.localName),
				true,
			);

			if (ignoredParent !== null) {
				return false;
			}
		}

		// We can't proof that node is not translatable
		return true;
	};
};
