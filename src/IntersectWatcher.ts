type IsTranslatableNode = (node: Node) => boolean;

type HandleNode = (node: Node) => void;

export class IntersectWatcher {
	private isTranslatableNode: IsTranslatableNode;

	private handleNode: HandleNode;

	private readonly itersectStorage = new WeakSet<Node>();

	constructor(isTranslatableNode: IsTranslatableNode, nodeHandler: HandleNode) {
		this.isTranslatableNode = isTranslatableNode;
		this.handleNode = nodeHandler;
	}

	private readonly itersectObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;
				if (!this.itersectStorage.has(node) || !entry.isIntersecting) return;

				this.itersectStorage.delete(node);
				observer.unobserve(node);
				this.intersectNode(node);
			});
		},
		{ root: null, rootMargin: '0px', threshold: 0 },
	);

	private intersectNode = (node: Element) => {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.isTranslatableNode(node)) {
				return;
			}

			this.handleNode(node);
		});
	};

	public handleElementByIntersectViewport(node: Element) {
		if (this.itersectStorage.has(node)) return;
		this.itersectStorage.add(node);
		this.itersectObserver.observe(node);
	}

	public isIntersectableNode = (node: Element) => {
		if (node.nodeName === 'OPTION') return false;

		return document.body.contains(node);
	};

	public observe(node: Element) {
		this.itersectObserver.observe(node);
	}

	public unobserve(node: Element) {
		this.itersectObserver.unobserve(node);
		this.itersectStorage.delete(node);
	}
}
