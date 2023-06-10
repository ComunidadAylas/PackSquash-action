import { getOctokit } from '@actions/github';
import { getInputValue } from './action_input';

export default getOctokit(getInputValue('token'));
