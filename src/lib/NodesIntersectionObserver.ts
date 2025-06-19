import { isIntersectableNode } from '../utils/isIntersectableNode';

type Callback = (node: Node) => void;

/**
 * Returns the node owner element:
 * - For Element returns itself
 * - For Attr returns owner ownerElement
 * - For Text and other node returns parentElement
 */
export function getElementOfNode(node: Node) {
	// Use type guards because a simple check `node.nodeType === Node.ELEMENT_NODE`
	// does not narrow the type in TypeScript — `node` remains of type `Node`

	const isElement = (node: Node): node is Element => {
		return node.nodeType === Node.ELEMENT_NODE;
	};
	const isAttr = (node: Node): node is Attr => {
		return node.nodeType === Node.ATTRIBUTE_NODE;
	};

	if (isElement(node)) {
		return node;
	}
	if (isAttr(node)) {
		return node.ownerElement;
	}

	return node.parentElement;
}

/**
 * Observes DOM nodes for intersection with the viewport and triggers callbacks when they become visible.
 * Class supports observing both elements and nodes (Text, Attr, etc.)
 */
export class NodesIntersectionObserver {
	private readonly intersectionObserver: IntersectionObserver;

	// Stores nodes and their owner element that are being observed for intersection
	private readonly elementNodesMap = new WeakMap<Element, Set<Node>>();
	private readonly nodeCallbacksMap = new WeakMap<Node, Callback>();

	constructor(intersectionConfig?: IntersectionObserverInit) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				// Skip nodes that are not under observation or still is not intersected
				if (!this.elementNodesMap.has(node) || !entry.isIntersecting) return;

				this.triggerNestedNodes(node);

				// Process the element once and stop observing it
				this.elementNodesMap.delete(node);
				observer.unobserve(node);
			});
		}, intersectionConfig);
	}

	/**
	 * Starts observing the node for intersection.
	 * When the owner element of the node intersects the viewport, the callback is invoked.
	 * Then the owner element and all its tracked nodes are automatically removed from observation.
	 *
	 * (Owner element means: element itself for Element, parent element for Text, owner element for Attr)
	 */
	public observe(node: Node, callback: Callback) {
		const targetElement = getElementOfNode(node);

		// Immediately invoke the callback if the node has no owner or is not intersectable
		if (!targetElement || !isIntersectableNode(targetElement)) {
			callback(node);
			return;
		}

		this.nodeCallbacksMap.set(node, callback);

		const observedNodes = this.elementNodesMap.get(targetElement);
		if (observedNodes) {
			observedNodes.add(node);
		} else {
			this.elementNodesMap.set(targetElement, new Set<Node>([node]));
			this.intersectionObserver.observe(targetElement);
		}
	}

	/**
	 *  Stops observing the node and removes it from observation
	 */
	public unobserve(node: Node) {
		const targetElement = getElementOfNode(node);
		if (!targetElement) return;
		const observedNodes = this.elementNodesMap.get(targetElement);
		if (!observedNodes || !observedNodes.has(node)) return;

		// remove only the specified node
		observedNodes.delete(node);
		this.nodeCallbacksMap.delete(node);

		// if no more nodes are tracked under this ownerElement, stop observing it
		if (observedNodes.size === 0) {
			this.elementNodesMap.delete(targetElement);
			this.intersectionObserver.unobserve(targetElement);
		}
	}

	/**
	 * Calls callbacks for all nodes associated with the specified element and removes their callbacks from storage
	 */
	private triggerNestedNodes(node: Element) {
		const ownedNodes = this.elementNodesMap.get(node);
		if (!ownedNodes) return;

		ownedNodes.forEach((node) => {
			const callback = this.nodeCallbacksMap.get(node);
			this.nodeCallbacksMap.delete(node);

			if (callback) callback(node);
		});
	}
}
