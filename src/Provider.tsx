/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
	useMemo,
	useState,
	useRef,
	useEffect,
	useCallback,
	ReactNode,
	ReactComponentElement
} from "react";
import isEqual from "./isEqual";
import { ISelector, IPath } from './type'
import Context from './Context'

function usePersistRef<T>(value: T) {
	const ref = useRef(null as any);
	ref.current = value;
	return ref;
}

const getPathList = (selector: string | number) => {
	if (typeof selector === 'string') {
		return selector.split(".");
	} else {
		return [selector];
	}
};

const noop = () => { };
const createSelector = (
	valueRef: React.MutableRefObject<any>,
	listenerListRef: React.MutableRefObject<IListener[]>
): ISelector => (
	selector: IPath | ((state: any) => any),
	equalFn = isEqual
) => {
		const [, setAccumulator] = useState(0);
		const forceUpdate = useCallback(() => {
			setAccumulator((n) => n + 1);
		}, []);
		const selectorRef = usePersistRef(
			typeof selector === "function"
				? selector
				: (typeof selector === 'string' || typeof selector === 'number') ? (state: any) => (getPathList(selector) as string[]).reduce((result, key) => result?.[key], state) : (state: any) => (selector.map((certainSelector) => getPathList(certainSelector)) as string[][]).map((certainPathList) => certainPathList.reduce((result, key) => result?.[key], state))
		);
		const stateRef = useRef(selectorRef.current(valueRef.current));
		const equalFnRef = usePersistRef(equalFn);
		useEffect(() => {
			const num = listenerListRef.current.length;
			listenerListRef.current[num] = (state) => {
				const newState = selectorRef.current(state);
				const newEqualFn = equalFnRef.current || isEqual;
				if (!newEqualFn(stateRef.current, newState)) {
					stateRef.current = newState;
					forceUpdate();
				}
			};
			return () => {
				listenerListRef.current[num] = noop;
			};
		}, [forceUpdate, equalFn, equalFnRef, selectorRef]);
		return stateRef.current;
	};

type IListener = (state: any) => any;

export default function Provider({
	children,
	value,
	equalFn = isEqual
}: {
	children: ReactComponentElement<any, any>;
	value: any;
	equalFn?: (obj1: any, obj2: any) => boolean;
}) {
	const valueRef = useRef(value);
	const listenerListRef = useRef([] as IListener[]);
	const equalFnRef = usePersistRef(equalFn);
	useEffect(() => {
		if (!equalFnRef.current(valueRef.current, value)) {
			valueRef.current = value;
			listenerListRef.current.forEach((listener) => {
				listener(valueRef.current);
			});
		}
	}, [value, equalFnRef]);
	const useSelector = useMemo(
		() => createSelector(valueRef, listenerListRef),
		[]
	);
	return useMemo(
		() => <Context.Provider value={useSelector}>{children}</Context.Provider>,
		[children, useSelector]
	);
}