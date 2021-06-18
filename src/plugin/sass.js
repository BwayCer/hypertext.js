
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
 * @func gulpSass
 * @param {Object} [option]
 * @return {stream.Transform}
 *
 * @example
 * gulp.src(...)
 *   .pipe(gulpSass({
 *     // Sass Option
 *     // file: inputFileAbsolutePath,
 *     // outputStyle: 'expanded',
 *     // outFile: outputCssFileAbsolutePath,
 *     // sourceMap: false,
 *     // sourceMapRoot: outputDirAbsolutePath,
 *     // includePaths: [
 *     //   projectAbsolutePath,
 *     //   path.join(projectAbsolutePath, 'node_modules'),
 *     // ],
 *   }))
 *   .pipe(gulp.dest(...))
 * ;
 */
export function gulpSass(option) {
  return new Transform({
    transform(file, encoding, callback) {
      let cwdPath = file.cwd;
      let basePath = file.base;
      let pathParse = path.parse(file.path);
      let outFile = path.join(
        pathParse.dir,
        pathParse.name + '.css'
      );

      sass.render({
        outputStyle: 'expanded',
        sourceMap: false,
        ...option,
        file: file.path,
        outFile,
        sourceMapRoot: basePath,
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
            cwd: cwdPath,
            base: basePath,
            path: outFile + '.map',
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

