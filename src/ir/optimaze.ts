import {flow} from 'lodash';
import {ProgramIR} from './ProgramIR';
import {removeRedundantLabels} from './optimaztions/removeRedundantLabels';

export function optimaze(ir: ProgramIR): ProgramIR {
    const optimazing = flow(
        removeRedundantLabels
    );
    return optimazing(ir);
}
