
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
  return new Transform({
    transform(file, encoding, callback) {
      let pathParse = path.parse(file.path);
      let outFilePath = path.join(
        pathParse.dir,
        pathParse.name + '.html'
      );
      try {
        let result = pug.renderFile(file.path, option);
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

