import { IntersectionWatcher } from './IntersectWatcher';
import { NodeStorageInterface } from './NodePrimitive';

type IsTranslatableNode = (node: Node) => boolean;

export interface IDecorateNodes {
	addNode: (node: Node) => void;

	deleteNode: (node: Node, onlyTarget?: boolean) => void;

	updateNode: (node: Node) => void;

	handleNode: (node: Node) => void;

	isNodeStorageHas: (attribute: Attr) => boolean;

	getNodeData: (node: Node) => {
		originalText: string | null;
	} | null;
}

export class DecorateNodes implements IDecorateNodes {
	private intersectionWatcher: IntersectionWatcher;
	private isTranslatableNode: IsTranslatableNode;

	constructor(
		private nodes: NodeStorageInterface,
		isTranslatableNode: IsTranslatableNode,
	) {
		this.intersectionWatcher = new IntersectionWatcher((node: Element) => {
			this.process(node);
		});

		this.isTranslatableNode = isTranslatableNode;
	}

	private process(node: Element) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.isTranslatableNode(node)) {
				return;
			}

			this.handleNode(node);
		});
	}

	public addNode(node: Node) {
		this.nodes.addNode(
			node,
			this.intersectionWatcher.isIntersectableNode,
			this.intersectionWatcher.handleElementByIntersectViewport.bind(
				this.intersectionWatcher,
			),
		);
	}

	public deleteNode(node: Node, onlyTarget?: boolean) {
		this.nodes.deleteNode(node, onlyTarget);
		if (node instanceof Element) {
			this.intersectionWatcher.unobserve(node);
		}
	}

	public updateNode(node: Node) {
		this.nodes.updateNode(node);
	}

	public isNodeStorageHas(attribute: Attr) {
		return this.nodes.isNodeStorageHas(attribute);
	}

	public handleNode(node: Node) {
		this.nodes.handleNode(node);
	}

	public getNodeData(node: Node) {
		return this.nodes.getNodeData(node);
	}
}
