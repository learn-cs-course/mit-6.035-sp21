import {flow} from 'lodash';
import {ProgramIR} from './ProgramIR';
import {removeRedundantLabels} from './optimaztions/removeRedundantLabels';
import {dataFlowOptimaze} from './optimaztions/dataflow';

export function optimaze(ir: ProgramIR): ProgramIR {
    const optimazing = flow(
        removeRedundantLabels,
        dataFlowOptimaze
    );
    return optimazing(ir);
}
