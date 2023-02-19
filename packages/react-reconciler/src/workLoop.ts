// 执行递归

import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {});
}

// TODO: 在 fiber 中调度 update
export function scheduleUpdateOnFiber(fiber: FiberNode) {
	/**
	 * 1、对于首屏渲染，fiber 为 hostRootFiber
	 * 2、对于 this.setState，fiber 为 classComponent 对应的 fiber
	 * 则需要从下往上，找到 fiberRootNode
	 */
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;

	while (parent !== null) {
		node = parent;
		parent = node.return;
	}

	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	return null;
}

function renderRoot(root: FiberRootNode) {
	// 初始化，让当前的 workInProgress 指向第一个要遍历的 fiberNode，即 hostRootFiber
	prepareFreshStack(root);

	do {
		try {
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop发生错误', e);
			workInProgress = null;
		}
	} while (true);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber); // 可能返回子fiberNode 或者 null
	fiber.memoizedProps = fiber.pendingProps; // 此次工作单元结束后，确定props

	// 没有子节点，说明递阶段结束，进行归阶段
	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		// 否则，继续往下（递阶段）
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);
		const sibling = node.sibling;

		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}

		node = node.return; // 往退回父节点
		workInProgress = node; // 继续处理父节点
	} while (node !== null);
}
