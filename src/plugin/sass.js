
import path from 'path';
import {Transform} from 'stream';

// NOTE:
// Vinyl 是 gulp 用於創建 `file` 塊的物件
// https://gulpjs.com/docs/en/api/vinyl
import Vinyl from 'vinyl';
import sass from 'sass';


/**
 * Scss 轉 css 管道。
 *
 * @memberof module:gulpTool.
 * @func gulpSass
 * @param {Object} [option]
 * @return {stream.Transform}
 *
 * @example
 * gulp.src(...)
 *   .pipe(gulpSass({
 *     directory: info.distPathPart,
 *
 *     // Sass Option
 *     // file: inputFileAbsolutePath,
 *     // outputStyle: 'expanded',
 *     // outFile: outputFileAbsolutePath, // path.join(cwd, directory, filePath)
 *     // sourceMap: false,
 *     // sourceMapRoot: outputDirAbsolutePath, // path.join(cwd, directory)
 *     // includePaths: [
 *     //   projectAbsolutePath,
 *     //   path.join(projectAbsolutePath, 'node_modules'),
 *     // ],
 *   }))
 *   .pipe(gulp.dest(...))
 * ;
 */
export function gulpSass(option) {
  let {directory} = option;
  if (typeof directory !== 'string') {
    throw Error('Not found "directory" field of option.');
  }

  return new Transform({
    transform(file, encoding, callback) {
      let pathParse = path.parse(file.relative);
      let relativePath = path.join(
        pathParse.dir,
        pathParse.name + '.css'
      );
      let sourceMapRoot = path.join(file.cwd, directory);
      let outFile = path.join(sourceMapRoot, relativePath);

      sass.render({
        outputStyle: 'expanded',
        sourceMap: false,
        ...option,
        file: file.path,
        outFile,
        sourceMapRoot,
      }, (err, result) => {
        if (err) {
          throw err;
        }

        // result.stats
        // console.log('Sass stats: ', result.stats);
        // result.css
        // fs.writeFileSync(localCssPath, result.css, {encoding: 'utf8'});
        // result.map
        // fs.writeFileSync(localCssPath + '.map', result.map, {encoding: 'utf8'});
        file.path = outFile;
        file.contents = result.css;
        this.push(file);

        if (option.sourceMap) {
          this.push(new Vinyl({
            cwd: file.cwd,
            base: file.base,
            path: file.path + '.map',
            contents: result.map,
          }));
        }

        callback(null);
      });
    },
    flush(callback) {
      callback(null);
    },
    objectMode: true,
  });
}

