import {MapLike} from '../types/base';

export function getEntries<T>(obj: MapLike<T>): Array<[string, T]> {
    return Object.entries(obj);
}
