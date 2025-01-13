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

	constructor(
		private nodes: NodeStorageInterface,
		intersectionWatcher: IntersectionWatcher,
	) {
		this.intersectionWatcher = intersectionWatcher;
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
