
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import {Readable, Writable, Transform} from 'stream';


async function fsMkdir(path) {
  await fsPromises.mkdir(path, {recursive: true});
}

async function fsRm(path, option) {
  if (fs.existsSync(path)) {
    await fsPromises.rm(path, Object.assign({
      recursive: false,
      force: true,
    }, option));
  }
}

async function fsSymlink(target, path, type) {
  await fsRm(path, {recursive: true});
  await fsPromises.symlink(target, path, type);
}


/**
 * 處裡群組包轉換器：
 * 可以在 `gulp.pipe()` 中丟入一組處裡包，因此提高模組化的便利性。
 *
 * @func groupTransform
 * @param {Function} handlePipeGroup
 * @return {stream.Transform}
 */
function groupTransform(handlePipeGroup) {
  let readable = new Readable({
    read(size) {},
    objectMode: true,
  });
  let currChunk = null;
  let currCallback = null;
  handlePipeGroup(readable)
    .pipe(new Writable({
      write(chunk, encoding, callback) {
        let theCurrCallback = currCallback;
        currChunk = null;
        currCallback = null;
        theCurrCallback(null, chunk);
        callback(null);
      },
      objectMode: true,
    }))
  ;

  return new Transform({
    transform(chunk, encoding, callback) {
      currChunk = chunk;
      currCallback = callback;
      readable.push(chunk, encoding);
    },
    flush(callback) {
      readable.push(null);
      callback(null);
    },
    objectMode: true,
  });
}


/**
 * 產生鏈結文件管道。
 *
 * @func gulpSymlink
 * @param {String} directory
 * @return {stream.Writable}
 */
// NOTE:
// 1. gulp.symlink 會遇到 Error: premature close 問題
// 2. 此方法不會為資料夾建立鏈結文件。
function gulpSymlink(directory) {
  return new Writable({
    async write(chunk, encoding, callback) {
      let srcFileStat = null;
      try {
        srcFileStat = await fsPromises.stat(chunk.path);
      } catch (err) {}

      if (srcFileStat !== null && !srcFileStat.isDirectory()) {
        let distPath = path.join(chunk.cwd, directory);
        let linkPath = path.join(distPath, chunk.relative);
        let linkDirPath = path.join(linkPath, '..');
        let linkTarget = path.relative(linkDirPath, chunk.path);
        await fsMkdir(linkDirPath);
        await fsSymlink(linkTarget, linkPath);
      }
      callback(null);
    },
    objectMode: true,
  });
}


export {
  fsMkdir, fsRm, fsSymlink,
  groupTransform, gulpSymlink,
};

