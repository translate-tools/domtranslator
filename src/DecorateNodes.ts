import { IntersectWatcher } from './IntersectWatcher';
import { NodeStorageInterface } from './NodePrimitive';

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
	private intersectWatcher: IntersectWatcher;
	private nodes: NodeStorageInterface;

	constructor(intersectWatcher: IntersectWatcher, nodes: NodeStorageInterface) {
		this.intersectWatcher = intersectWatcher;
		this.nodes = nodes;
	}

	public addNode(node: Node) {
		this.nodes.addNode(
			node,
			this.intersectWatcher.isIntersectableNode.bind(this.intersectWatcher),
			this.intersectWatcher.handleElementByIntersectViewport.bind(
				this.intersectWatcher,
			),
		);
	}

	public deleteNode(node: Node, onlyTarget?: boolean) {
		this.nodes.deleteNode(node, onlyTarget);
		if (node instanceof Element) {
			this.intersectWatcher.unobserve(node);
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
