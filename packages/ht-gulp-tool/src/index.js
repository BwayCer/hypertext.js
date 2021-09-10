
export {default as gulpRun} from './run.js';
export {default as GulpTool} from './GulpTool.js';
export * from './utils.js';

import {gulpPug, gulpPugScript} from './plugin/pug.js';
import {gulpSass} from './plugin/sass.js';
export let plugin = {gulpPug, gulpPugScript, gulpSass};

