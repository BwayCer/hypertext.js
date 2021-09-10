
import path from 'path';
import {Transform} from 'stream';

import pug from 'pug';


/**
 * Pug 轉 html 管道。
 *
 * @func gulpPug
 * @param {Object} [option]
 * @return {stream.Transform}
 */
export function gulpPug(option) {
  return _createGulpPugPipe(true, option);
}

/**
 * Pug 轉 Script 管道。
 *
 * @func gulpPugScript
 * @param {Object} [option]
 * @return {stream.Transform}
 */
export function gulpPugScript(option) {
  option.name = 'pugTemplate';
  return _createGulpPugPipe(false, option);
}

function _createGulpPugPipe(isStatic, option) {
  let extName = isStatic ? '.html' : '.js';
  let memberName = isStatic ? 'renderFile' : 'compileFileClient';

  return new Transform({
    transform(file, encoding, callback) {
      let pathParse = path.parse(file.path);
      let outFilePath = path.join(
        pathParse.dir,
        pathParse.name + extName
      );
      try {
        let result = pug[memberName](file.path, option);
        if (!isStatic)  {
          result += '\nexport default pugTemplate;';
        }
        file.path = outFilePath;
        file.contents = Buffer.from(result, encoding);
        callback(null, file);
      } catch (err) {
        throw err;
      }
    },
    flush(callback) {
      callback(null);
    },
    objectMode: true,
  });
}

