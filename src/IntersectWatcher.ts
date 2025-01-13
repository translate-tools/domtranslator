type IntersectNode = (node: Element) => void;

export class IntersectionWatcher {
	private intersectNode: IntersectNode;

	private readonly itersectStorage = new WeakSet<Node>();

	private itersectObserver: IntersectionObserver;

	constructor(intersectNode: IntersectNode) {
		this.intersectNode = intersectNode;

		this.itersectObserver = new IntersectionObserver(
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
	}

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
