
export {default as GulpTool} from './GulpTool.js';
export * from './utils.js';

import {gulpPug} from './plugin/pug.js';
import {gulpSass} from './plugin/sass.js';
export let plugin = {gulpPug, gulpSass};

